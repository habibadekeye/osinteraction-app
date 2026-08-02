# HSE OPS AI — AI System Architecture

## Overview

HSE OPS AI uses a Retrieval-Augmented Generation (RAG) architecture. The AI never generates answers from its training data alone — every response is grounded in NEPL-approved procedure documents retrieved from the vector knowledge base.

## Current State vs Target State

| Component | Current (Mock) | Target (Production) |
|-----------|---------------|---------------------|
| LLM | `mockAI.ts` keyword matching | Azure OpenAI GPT-4o |
| Retrieval | Static keyword lookup (10 topic entries) | pgvector cosine similarity |
| Embeddings | None | text-embedding-3-large (3072 dims) |
| Streaming | Word-by-word, 15–33ms delay per word | Azure OpenAI streaming SSE |
| Safety | 13-keyword trigger list | Semantic safety classifier |

## RAG Pipeline (8 Steps)

```
[User Query]
    │
    ▼
[1] Query Preprocessing
    - Strip unsafe characters / prompt injection attempts
    - Detect language (English-only gate in MVP)
    - Extract operational context: asset, activity, location
    - Classify intent: informational | procedural | emergency
    │
    ▼
[2] Safety Guardrail Check
    - Match against HIGH_RISK_TOPICS list (12 triggers)
    - Semantic similarity check against escalation embeddings
    - IF triggered: return STOP WORK response, log governance flag
    - ELSE: continue pipeline
    │
    ▼
[3] Semantic Retrieval
    - Generate query embedding via text-embedding-3-large
    - pgvector HNSW index search: top_k=5, min_similarity=0.70
    - Filter by: user role, asset_type, document status='approved'
    - Rerank: relevance_score * 0.7 + recency_weight * 0.3
    │
    ▼
[4] Context Assembly
    - Build system prompt (see docs/05-prompt-engineering.md)
    - Inject retrieved chunks as RETRIEVED DOCUMENTS block
    - Include last 5 conversation turns for multi-turn context
    - Inject user context: role, department, location, asset
    │
    ▼
[5] LLM Generation
    - Azure OpenAI GPT-4o
    - Temperature: 0.3 (determinism over creativity)
    - Max tokens: 2000
    - Response format: { content: string, citations: Citation[] }
    - Stream tokens to client via SSE
    │
    ▼
[6] Post-Processing
    - Extract citation references from response
    - Validate citations against retrieved chunks (no hallucinated refs)
    - Format with markdown headings, tables, bold emphasis
    │
    ▼
[7] Safety Validation
    - Scan for contradictions vs retrieved documents
    - Check for missing mandatory warnings (PPE, gas testing, permits)
    - IF unsafe: flag for governance, return conservative fallback
    │
    ▼
[8] Response Delivery
    - Save assistant message to chat_messages
    - Save citations to citations table
    - Log analytics_event: type='chat_query'
    - Stream final response to client
    - Update session last_message_at and message_count
```

## Model Configuration

```typescript
const LLM_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.3,
  max_tokens: 2000,
  presence_penalty: 0.1,
  frequency_penalty: 0.1,
  response_format: { type: 'json_object' },
};

const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-large',
  dimensions: 3072,
};
```

## Safety Guardrails

High-risk triggers that bypass the RAG pipeline and return immediate escalation:

```typescript
// src/services/mockAI.ts — frontend (13 triggers)
const HIGH_RISK_TRIGGERS = [
  'gas release', 'major gas', 'blowout', 'well control', 'loss of control',
  'man overboard', 'explosion', 'fire offshore', 'platform fire',
  'confined space rescue', 'h2s emergency', 'structural collapse', 'toxic gas cloud',
];

// supabase/functions/chat/index.ts — Edge Function (16 triggers, superset)
// Adds: 'live electrical rescue', 'radiation exposure', 'well kick'
```

Both use substring matching (`query.includes(trigger)`). The Edge Function list is a superset. Before switching to the Edge Function, align both lists.

Escalation response template: `src/services/mockAI.ts:ESCALATION_RESPONSE` (identical text in both files).

## Fallback Strategy

- If Azure OpenAI unavailable → Anthropic Claude 3.5 Sonnet
- If both LLMs unavailable → static "Service temporarily unavailable" message with emergency contacts
- If pgvector returns 0 results → inform user, suggest manual search, provide HSE contact
- Minimum confidence threshold: 0.60 — below this, prepend "Low confidence — please verify with your HSE Advisor"

## Edge Function (Supabase)

The AI chat endpoint will be a Supabase Edge Function (`supabase/functions/chat/index.ts`) to:
- Keep Azure OpenAI API key server-side only
- Perform role-based document filtering before retrieval
- Apply rate limiting (10 queries/min per user)
- Log all AI interactions server-side for governance

## Token Economics

| Operation | Estimated Tokens | Cost (GPT-4o) |
|-----------|-----------------|---------------|
| System prompt | ~500 | $0.0025 |
| Retrieved chunks (5 × 200) | ~1000 | $0.005 |
| User query | ~50 | $0.00025 |
| AI response | ~800 | $0.004 |
| **Total per query** | **~2350** | **~$0.012** |

At 500 queries/day → ~$6/day → ~$180/month at full load.
