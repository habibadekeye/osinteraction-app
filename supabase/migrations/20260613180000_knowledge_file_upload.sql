-- ============================================================
-- MIGRATION: Add file attachment support to knowledge_documents
-- ============================================================

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS file_storage_key  text,
  ADD COLUMN IF NOT EXISTS file_original_name text,
  ADD COLUMN IF NOT EXISTS file_size_bytes   bigint;
