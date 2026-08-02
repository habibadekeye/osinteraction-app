# HSE OPS AI — RAG Retrieval Strategy

## Overview

The knowledge base uses pgvector for semantic similarity search. Document chunks are embedded using Azure OpenAI `text-embedding-3-large` (3072 dimensions). At query time, the user's query is embedded and compared against stored chunk embeddings using cosine similarity.

## Chunking Strategy

### Chunk Size
- **Target chunk size**: 400–600 tokens (roughly 300–450 words)
- **Overlap**: 50 tokens between adjacent chunks (preserves context at boundaries)
- **Hard limit**: 800 tokens (split at sentence boundary if exceeded)

### Chunking Rules
1. Never split mid-sentence
2. Preserve section headings — include the nearest parent heading in chunk metadata
3. Tables: keep entire table in one chunk if ≤ 800 tokens; otherwise split row groups
4. Numbered lists: keep together if ≤ 600 tokens
5. For procedures: each numbered step becomes its own chunk minimum (even if short)

### Chunk Metadata (stored in `document_chunks.metadata` JSONB)
```json
{
  "section_heading": "3.2 Atmospheric Testing Requirements",
  "parent_section": "3. Pre-Entry Requirements",
  "document_type": "procedure",
  "risk_level": "critical",
  "asset_types": ["rig", "platform", "terminal"],
  "has_table": false,
  "step_numbers": [3, 4, 5]
}
```

## Embedding Model

- **Model**: `text-embedding-3-large`
- **Dimensions**: 3072
- **Similarity metric**: Cosine similarity
- **Index type**: HNSW (Hierarchical Navigable Small World)
- **HNSW parameters**: m=16, ef_construction=64 (balances accuracy vs memory)

## Retrieval Parameters

```typescript
const RETRIEVAL_CONFIG = {
  top_k: 5,                    // retrieve top 5 chunks
  min_similarity: 0.70,        // discard chunks below 70% cosine similarity
  max_context_tokens: 2000,    // max tokens of retrieved content for prompt
  rerank_weight_relevance: 0.7,
  rerank_weight_recency: 0.3,  // prefer recently approved documents
};
```

## Query Filters Applied Before Vector Search

These filters are applied as WHERE clauses on the `knowledge_documents` table JOIN:

```sql
WHERE kd.status = 'approved'
  AND (
    kd.asset_types @> ARRAY[{user.asset_type}]
    OR kd.asset_types = '{}'
  )
  AND (
    CASE 
      WHEN {user.role} = 'contractor' THEN kd.is_contractor_visible = true
      ELSE true
    END
  )
```

## pgvector SQL Query (Retrieval)

```sql
SELECT
  dc.id AS chunk_id,
  dc.content,
  dc.section_heading,
  dc.page_number,
  kd.title AS document_title,
  kd.document_code,
  kd.risk_level,
  1 - (e.embedding <=> $1::vector) AS similarity
FROM embeddings e
JOIN document_chunks dc ON dc.id = e.chunk_id
JOIN knowledge_documents kd ON kd.id = dc.document_id
WHERE kd.status = 'approved'
  AND kd.asset_types @> ARRAY[$2]
  AND (1 - (e.embedding <=> $1::vector)) >= 0.70
ORDER BY similarity DESC
LIMIT 5;
```

## Reranking

After vector retrieval, apply a composite score:

```typescript
function rerank(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const now = Date.now();
  return chunks
    .map(chunk => ({
      ...chunk,
      finalScore:
        chunk.similarity * 0.7 +
        recencyScore(chunk.document.approvedAt, now) * 0.3,
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}

function recencyScore(approvedAt: Date, now: number): number {
  const ageMonths = (now - approvedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, 1 - ageMonths / 24); // linear decay over 2 years
}
```

## Multi-Query Expansion (Phase 2 Enhancement)

For ambiguous queries, generate 3 query variants and retrieve for each, then deduplicate by chunk_id:

```typescript
const queryVariants = [
  originalQuery,
  await expandQueryWithSynonyms(originalQuery),
  await generateHypotheticalDocument(originalQuery), // HyDE technique
];
```

## Context Window Assembly

Retrieved chunks are assembled into the prompt in order of final score:

```
--- RETRIEVED DOCUMENT 1 (NEPL-CSE-001, p.4, similarity: 0.97) ---
[chunk content]

--- RETRIEVED DOCUMENT 2 (NEPL-PTW-001, p.12, similarity: 0.88) ---
[chunk content]
...
```

Total retrieved content is truncated at 2000 tokens if necessary (remove lowest-scoring chunks first).

## Offline Retrieval (Phase 5)

Critical documents cached in IndexedDB with pre-computed chunk embeddings. Offline retrieval uses a JavaScript cosine similarity function against the cached vectors. Limited to the top 20 most-accessed procedures.
