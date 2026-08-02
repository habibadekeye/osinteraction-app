-- ============================================================
-- MIGRATION: Full-text search on knowledge_documents
--
-- Adds a weighted tsvector column covering title (A), document_code (A),
-- description (B), metadata_tags (B), and content (C).
-- Postgres FTS lets the chat function search real document content
-- with zero external API calls — free interim "AI brain".
-- ============================================================

-- 1. Add the search vector column
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Function that builds the weighted search vector
CREATE OR REPLACE FUNCTION public.build_knowledge_search_vector(
  p_title        text,
  p_document_code text,
  p_description   text,
  p_tags          text[],
  p_content       text
)
RETURNS tsvector
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p_title, '')),         'A') ||
    setweight(to_tsvector('english', coalesce(p_document_code, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_description, '')),   'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(p_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p_content, '')),       'C');
$$;

-- 3. Trigger function — keeps search_vector current on every INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_knowledge_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := public.build_knowledge_search_vector(
    NEW.title,
    NEW.document_code,
    NEW.description,
    NEW.metadata_tags,
    NEW.content
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_knowledge_doc_fts ON knowledge_documents;
CREATE TRIGGER sync_knowledge_doc_fts
  BEFORE INSERT OR UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.sync_knowledge_search_vector();

-- 4. GIN index for fast FTS queries
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_search_vector
  ON knowledge_documents USING gin(search_vector);

-- 5. Back-fill existing rows
UPDATE knowledge_documents
SET search_vector = public.build_knowledge_search_vector(
  title, document_code, description, metadata_tags, content
);

-- 6. RPC: full-text search returning ranked results with highlighted excerpts
--    Called by the chat edge function when no AI keys are configured.
CREATE OR REPLACE FUNCTION public.search_knowledge_documents(
  query_text         text,
  match_count        int     DEFAULT 5,
  filter_contractor  boolean DEFAULT false
)
RETURNS TABLE (
  id            uuid,
  title         varchar,
  document_code varchar,
  description   text,
  content       text,
  risk_level    varchar,
  document_type varchar,
  version       varchar,
  rank          float4,
  headline      text
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    kd.id,
    kd.title,
    kd.document_code,
    kd.description,
    kd.content,
    kd.risk_level,
    kd.document_type,
    kd.version,
    ts_rank_cd(kd.search_vector, plainto_tsquery('english', query_text))::float4 AS rank,
    ts_headline(
      'english',
      coalesce(kd.content, kd.description, kd.title, ''),
      plainto_tsquery('english', query_text),
      'MaxFragments=4, MaxWords=60, MinWords=15, StartSel=**,StopSel=**,FragmentDelimiter= … '
    ) AS headline
  FROM knowledge_documents kd
  WHERE
    kd.status = 'approved'
    AND kd.search_vector @@ plainto_tsquery('english', query_text)
    AND (NOT filter_contractor OR kd.is_contractor_visible = true)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

-- Grant execute to authenticated users (the chat function runs as authenticated)
GRANT EXECUTE ON FUNCTION public.search_knowledge_documents TO authenticated;
