# HSE OPS AI — Vector Database Design

## Technology Choice

**pgvector** — PostgreSQL extension for vector similarity search.

Rationale: NEPL's knowledge base is expected to grow to ~50,000 chunks (approximately 500 documents × 100 chunks each). pgvector HNSW performs well at this scale with millisecond query times, and keeps the entire data stack on a single database (Supabase/PostgreSQL) without requiring Pinecone or a separate vector service.

Switch to Pinecone only if document count exceeds 1 million chunks.

## Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Status: Must be enabled on the Supabase project before embedding tables can be created.

## Schema

### embeddings table

```sql
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    embedding VECTOR(3072) NOT NULL,
    model VARCHAR(50) DEFAULT 'text-embedding-3-large',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_embeddings_vector ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Index Parameters Explained

| Parameter | Value | Effect |
|-----------|-------|--------|
| m | 16 | Max connections per node. Higher = better recall, more memory |
| ef_construction | 64 | Search width at index build time. Higher = better index quality, slower build |
| vector_cosine_ops | — | Uses cosine distance (1 - cosine similarity) |

### Query-Time Parameters

```sql
SET hnsw.ef_search = 100;  -- Higher = better recall at query time, slightly slower
```

## Dimensions: 3072

`text-embedding-3-large` outputs 3072-dimensional vectors. Storage per embedding:
- 3072 floats × 4 bytes = 12,288 bytes ≈ 12 KB per chunk
- At 50,000 chunks → ~600 MB for embeddings alone
- Supabase free tier: 500 MB database — will need Pro tier ($25/month)

Fallback: Use `text-embedding-3-small` (1536 dims) if storage budget requires it. Lower recall but adequate for most queries.

## Similarity Thresholds (Calibrated for NEPL Procedures)

| Score | Interpretation | Action |
|-------|---------------|--------|
| > 0.90 | Highly relevant | Include, cite directly |
| 0.75–0.90 | Relevant | Include |
| 0.70–0.75 | Marginal | Include if < 5 better results |
| < 0.70 | Likely irrelevant | Exclude |

## Embedding Generation Pipeline

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072,
  });
  return response.data[0].embedding;
}
```

Embeddings are generated:
1. **At document ingestion**: for each chunk during upload processing
2. **At query time**: for the user's query before retrieval
3. **Never cached at query time**: query embeddings are generated fresh each request

## RLS on embeddings table

```sql
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Embeddings are read-only for authenticated users (via JOIN through document permissions)
-- Direct access to the embeddings table is admin-only
CREATE POLICY "embeddings_admin_only" ON embeddings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

Note: Embeddings are not queried directly by the frontend. They are queried server-side by the Edge Function, which has service_role access.

## document_chunks table

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    content_start INT,
    content_end INT,
    page_number INT,
    section_heading VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunks_readable_by_authenticated" ON document_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_documents kd
      WHERE kd.id = document_id
      AND kd.status = 'approved'
    )
  );
```

## Incremental Re-embedding

When a document is updated (new version), the old chunks are deleted (CASCADE) and new chunks + embeddings are generated. This avoids stale embeddings serving outdated content.

Document versioning: old version is marked `status = 'superseded'`, not deleted, to preserve audit trail.
