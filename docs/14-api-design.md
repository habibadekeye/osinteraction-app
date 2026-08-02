# HSE OPS AI — API Design

## API Layer

HSE OPS AI does not have a traditional REST API server. The "API" is composed of:
1. **Supabase client** — direct database queries with RLS enforcement
2. **Supabase Edge Functions** — for AI calls, document processing, and operations requiring service role

## Supabase Direct Queries (Frontend → DB)

These use `supabase.from('table').select/insert/update/delete` directly from the React frontend. RLS enforces access control.

### Profiles
```typescript
// Get current user profile
supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

// Update preferences
supabase.from('profiles').update({ preferences }).eq('id', userId)
```

### Chat Sessions
```typescript
// List sessions for current user
supabase.from('chat_sessions')
  .select('*')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false })
  .limit(20)

// Create new session
supabase.from('chat_sessions').insert({ user_id, title, session_type })
```

### Knowledge Documents
```typescript
// Search knowledge base
supabase.from('knowledge_documents')
  .select('*, knowledge_categories(name, code, risk_level)')
  .eq('status', 'approved')
  .ilike('title', `%${searchTerm}%`)
  .order('updated_at', { ascending: false })
```

## Edge Function Endpoints

### POST /functions/v1/chat
AI chat — returns JSON response (NOT streaming SSE in current Phase 1 implementation).

**Current implementation** (`supabase/functions/chat/index.ts`): keyword-based mock AI matching same topics as `src/services/mockAI.ts`. Frontend (`ChatPage.tsx`) currently bypasses this Edge Function and calls `mockAI.ts` directly client-side. This Edge Function is the Phase 2 replacement point for Azure OpenAI.

Request:
```json
{
  "sessionId": "uuid",
  "content": "What are the confined space entry requirements?"
}
```

Response (JSON, 200):
```json
{
  "success": true,
  "data": {
    "userMessage": { ...chatMessage },
    "assistantMessage": { ...chatMessage, "citations": [...] },
    "safetyFlag": false,
    "escalationTriggered": false
  }
}
```

**Phase 2 target**: Replace mock with Azure OpenAI GPT-4o, add SSE streaming:
```
data: {"chunk": "Before entering"}
data: {"chunk": " any confined space"}
...
data: {"done": true, "message": { ...fullMessage }, "citations": [...] }
```

### POST /functions/v1/embed-document
Chunk and embed a newly uploaded knowledge document.

Request:
```json
{ "documentId": "uuid", "storageKey": "knowledge-documents/NEPL-CSE-001.pdf" }
```

### POST /functions/v1/generate-risk-assessment
AI-generated JSA/TRA.

Request:
```json
{
  "assessmentType": "JSA",
  "title": "Tank cleaning on Bonga FPSO",
  "activityDescription": "Entering and cleaning a crude oil storage tank",
  "location": "Bonga FPSO",
  "assetType": "platform",
  "department": "Operations"
}
```

### POST /functions/v1/generate-toolbox-talk
Request:
```json
{
  "activity": "Crane lift of 5-tonne pump",
  "location": "Okono Platform main deck",
  "crewSize": 6,
  "durationMinutes": 15,
  "environmentalConditions": "Wind 12 m/s, visibility good"
}
```

### POST /functions/v1/analyze-incident
Request:
```json
{
  "incidentDescription": "Worker slipped on wet deck during routine patrol",
  "incidentType": "slip_trip_fall",
  "severity": "minor_injury",
  "location": "EA Field, Wellhead Platform B",
  "immediateActions": "First aid applied, area secured"
}
```

### POST /functions/v1/transcribe-voice
Request: `multipart/form-data` with `audio` field (WAV/MP3/WebM).

Response:
```json
{ "transcript": "What are the hot work permit requirements?", "confidence": 0.94 }
```

## Standard Response Format

All Edge Functions return:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, string[]> };
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Authenticated but insufficient role |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid input |
| AI_UNAVAILABLE | 503 | Azure OpenAI unreachable |
| SAFETY_ESCALATION | 200 | High-risk query — returns escalation response |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected error |

## Pagination Convention

List endpoints use cursor-based pagination via Supabase's range:
```typescript
supabase.from('observations')
  .select('*', { count: 'exact' })
  .range(page * limit, (page + 1) * limit - 1)
  .order('created_at', { ascending: false })
```

Response includes: `{ data: T[], count: number }` where `count` is the total row count.
