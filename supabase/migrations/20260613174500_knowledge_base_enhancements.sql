-- ============================================================
-- MIGRATION: Knowledge base — full CRUD + embedding pipeline support
--
-- Adds:
--   1. updated_at column to knowledge_documents
--   2. embedding_status column to knowledge_documents
--   3. knowledge_documents DELETE policy (admin/hse_manager)
--   4. knowledge_documents UPDATE policy tightened to admin/hse_manager
--   5. Supabase Storage bucket for document file uploads
-- ============================================================

-- 1. Add updated_at column to knowledge_documents
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Keep updated_at current on every update
CREATE OR REPLACE FUNCTION public.set_knowledge_doc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_knowledge_doc_updated_at ON knowledge_documents;
CREATE TRIGGER set_knowledge_doc_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_knowledge_doc_updated_at();

-- 2. Add embedding_status to track AI indexing progress
--    Values: null (not started) | processing | indexed | embedded | failed | skipped
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS embedding_status varchar(20)
    CHECK (embedding_status IN ('processing', 'indexed', 'embedded', 'failed', 'skipped'));

-- 3. Add DELETE policy — admin and hse_manager only
DROP POLICY IF EXISTS "knowledge_documents_delete" ON knowledge_documents;
CREATE POLICY "knowledge_documents_delete" ON knowledge_documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager')
    )
  );

-- 4. Tighten UPDATE policy — only admin and hse_manager can edit documents
--    (previously allowed any authenticated user)
DROP POLICY IF EXISTS "knowledge_documents_update" ON knowledge_documents;
CREATE POLICY "knowledge_documents_update" ON knowledge_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager', 'hse_advisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager', 'hse_advisor')
    )
  );

-- 5. Create Supabase Storage bucket for uploaded document files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  false,
  52428800,  -- 50 MB max per file
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can read; admin/hse_manager/hse_advisor can upload
DROP POLICY IF EXISTS "knowledge_docs_storage_read" ON storage.objects;
CREATE POLICY "knowledge_docs_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge-documents');

DROP POLICY IF EXISTS "knowledge_docs_storage_upload" ON storage.objects;
CREATE POLICY "knowledge_docs_storage_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager', 'hse_advisor')
    )
  );

DROP POLICY IF EXISTS "knowledge_docs_storage_delete" ON storage.objects;
CREATE POLICY "knowledge_docs_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-documents'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hse_manager')
    )
  );
