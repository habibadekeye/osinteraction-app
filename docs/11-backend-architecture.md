# HSE OPS AI — Backend Architecture

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Database | Supabase (PostgreSQL 15) | Managed, RLS, realtime, pgvector |
| Auth | Supabase Auth | JWT, email/password, session management |
| API | Supabase Edge Functions (Deno) | Serverless, co-located with DB, handles LLM calls |
| LLM | Azure OpenAI GPT-4o | Enterprise SLA, data residency |
| Embeddings | Azure OpenAI text-embedding-3-large | Best retrieval quality |
| File Storage | Supabase Storage | Document PDFs, audio files |
| Realtime | Supabase Realtime | Governance notifications, chat streaming |

## Backend = Edge Functions + Supabase

There is no separate Node.js/Express backend. All server-side logic runs as Supabase Edge Functions (Deno runtime). This keeps the infrastructure minimal while providing the security boundary needed to protect API keys.

## Edge Functions Inventory

| Function | Path | Status | Purpose |
|----------|------|--------|---------|
| `chat` | `supabase/functions/chat/` | Deployed | Mock AI chat, keyword matching, returns JSON |
| `embed-document` | `supabase/functions/embed-document/` | Deployed | Chunk + embed new knowledge docs (Phase 2) |
| `generate-toolbox-talk` | `supabase/functions/generate-toolbox-talk/` | Deployed | Toolbox talk AI generation |
| `transcribe-voice` | `supabase/functions/transcribe-voice/` | Deployed | Whisper API transcription |
| `seed-demo-users` | `supabase/functions/seed-demo-users/` | Deployed | Dev/staging demo data seeding |
| `generate-risk-assessment` | `supabase/functions/generate-risk-assessment/` | Planned (Phase 2) | JSA/TRA AI generation |
| `analyze-incident` | `supabase/functions/analyze-incident/` | Planned (Phase 2) | 5-Why, root cause, corrective actions |

**Important**: The `chat` Edge Function is deployed but NOT currently called by the frontend. `ChatPage.tsx` calls `src/services/mockAI.ts` directly (client-side). The Edge Function will replace `mockAI.ts` in Phase 2 when Azure OpenAI is connected.

## Auth Flow (Current Implementation)

1. User submits email + password on `/login`
2. `supabase.auth.signInWithPassword({ email, password })`
3. On success: fetch profile from `profiles` table by `auth.uid()` using `maybeSingle()`
4. Store profile in Zustand `useAuthStore`
5. Route to `/dashboard`

Note: Employee ID login is NOT implemented. Login accepts email only. The demo accounts panel on the login page shows employee IDs for reference but auto-fills email + password when clicked.

## RLS (Row-Level Security) Pattern

Every table has RLS enabled. The pattern for user-owned data:

```sql
-- Users can only read/write their own records
CREATE POLICY "select_own" ON observations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own" ON observations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own" ON observations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own" ON observations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

For admin-visible data (e.g., all observations for governance):

```sql
CREATE POLICY "admins_see_all_observations" ON observations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'hse_manager', 'hse_advisor', 'auditor')
    )
  );
```

## Supabase Storage Buckets

| Bucket | Access | Content |
|--------|--------|---------|
| `knowledge-documents` | Private (auth required) | PDF procedure documents |
| `voice-recordings` | Private | User voice query audio files |
| `certificates` | Private | Competency completion certificates |
| `toolbox-pdfs` | Private | Generated toolbox talk PDFs |

## Realtime Subscriptions

Used for:
1. **Governance notifications**: HSE Manager receives real-time alert when a response is flagged
2. **Chat streaming**: Used as fallback if SSE streaming fails
3. **Observation assignments**: Notify assignee when observation is assigned to them

## Service Role Usage

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is ONLY used in Edge Functions — never in frontend code. It bypasses RLS for admin operations like:
- Embedding generation (needs to write to all chunks/embeddings)
- Governance queue aggregation (reads across all users)
- Analytics aggregation (reads across all users)

## File Upload Flow

```
Frontend → Supabase Storage (presigned URL)
         → POST edge function: embed-document
         → Parse PDF (pdfjs-dist)
         → Chunk content
         → Generate embeddings (Azure OpenAI)
         → Save document_chunks + embeddings to DB
         → Set document.status = 'under_review'
```

## Error Handling Convention

All Edge Functions return:
```typescript
{ success: true, data: T }        // 200
{ success: false, error: { code, message } }  // 4xx/5xx
```

Frontend always checks `success` before using `data`.
