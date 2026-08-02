# HSE OPS AI — Document Ingestion Pipeline

## Overview

For the AI to provide citation-grounded responses, NEPL procedure documents must be:
1. Uploaded to Supabase Storage
2. Parsed and chunked into manageable pieces
3. Embedded using Azure OpenAI text-embedding-3-large
4. Stored in `document_chunks` + `embeddings` tables
5. Approved before being served by the RAG pipeline

## Pipeline Steps

```
User uploads PDF/DOCX (HSE Advisor or Admin)
    ↓
Frontend → Supabase Storage: knowledge-documents/{document_code}.pdf
    ↓
Frontend → POST /functions/v1/embed-document { documentId, storageKey }
    ↓
Edge Function: embed-document
    ├── 1. Download file from Supabase Storage
    ├── 2. Extract text (pdfjs-dist for PDF)
    ├── 3. Clean text (remove headers, footers, page numbers)
    ├── 4. Chunk text (400–600 tokens, 50 token overlap)
    ├── 5. For each chunk:
    │   ├── Generate embedding (Azure OpenAI text-embedding-3-large)
    │   ├── Save to document_chunks table
    │   └── Save to embeddings table
    ├── 6. Update knowledge_documents.status = 'under_review'
    └── 7. Create governance_review entry for content approval
```

## Chunking Algorithm

```typescript
function chunkDocument(text: string, maxTokens = 500, overlap = 50): string[] {
  // Rough token estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  const overlapChars = overlap * 4;
  const chunks: string[] = [];

  // Split on section boundaries first (headings)
  const sections = text.split(/\n#{1,3}\s/);

  for (const section of sections) {
    if (section.length <= maxChars) {
      chunks.push(section.trim());
      continue;
    }
    // Split long sections on sentence boundaries
    const sentences = section.match(/[^.!?]+[.!?]+/g) || [section];
    let current = '';
    for (const sentence of sentences) {
      if ((current + sentence).length > maxChars) {
        if (current) chunks.push(current.trim());
        // Start new chunk with overlap from previous
        current = current.slice(-overlapChars) + sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.filter(c => c.length > 50); // discard tiny fragments
}
```

## Embedding Generation (Edge Function)

```typescript
// supabase/functions/embed-document/index.ts
async function generateEmbedding(text: string, azureKey: string, endpoint: string): Promise<number[]> {
  const response = await fetch(
    `${endpoint}/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': azureKey },
      body: JSON.stringify({ input: text, dimensions: 3072 }),
    }
  );
  const data = await response.json();
  return data.data[0].embedding;
}
```

## Supported File Types

| Type | Parser | Notes |
|------|--------|-------|
| PDF | `pdfjs-dist` (npm) | Most NEPL procedures are PDF |
| DOCX | `mammoth` (npm) | Word documents |
| TXT | Native | Plain text |
| MD | Native | Markdown procedures |

## Document Metadata Extraction

During ingestion, extract and save to `document_chunks.metadata`:
- Section headings (from markdown-style headers or bold lines)
- Page numbers (from PDF)
- Table detection (flag for special chunking)
- Step numbers (for procedure steps)

## Re-ingestion (Version Update)

When a document is updated (new version):
1. New document version created (old marked `status = 'superseded'`)
2. Old chunks and embeddings CASCADE deleted (via FK)
3. New chunks and embeddings generated for new version
4. New version goes through approval workflow

## Batch Ingestion (Initial Load)

For initial population of the knowledge base with 15 priority documents:

```typescript
// scripts/batch-ingest.ts (run once, not part of normal app)
const documents = [
  { code: 'NEPL-HSE-MS-001', path: 'docs/NEPL-HSE-MS-001.pdf', categoryCode: 'HSE-MS' },
  { code: 'NEPL-PTW-001', path: 'docs/NEPL-PTW-001.pdf', categoryCode: 'PTW' },
  // ... 13 more
];

for (const doc of documents) {
  await uploadAndEmbed(doc);
  await sleep(2000); // Rate limit: Azure OpenAI embedding API
}
```

## Quality Checks After Ingestion

1. **Chunk count**: Expected 50–200 chunks per typical 20-page procedure
2. **Embedding dimension**: Must be 3072 — verify no truncation
3. **Retrieval test**: Query 5 known phrases from the document — all must return with similarity > 0.80
4. **Citation test**: AI query about the document's topic must cite the correct document code

## pgvector Prerequisites

Before the ingestion pipeline can run, the Supabase project must have:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run via Supabase MCP `apply_migration` tool or from the Supabase dashboard → Extensions.

Currently: pgvector extension status must be confirmed before proceeding with embedding tables and ingestion.
