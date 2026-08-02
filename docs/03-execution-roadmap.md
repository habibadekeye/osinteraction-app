# HSE OPS AI — Execution Roadmap

## Phase Overview

| Phase | Name | Weeks | Status |
|-------|------|-------|--------|
| 1 | Foundation | 1–4 | Complete (scaffolding, auth, schema, basic chat) |
| 2 | AI Core | 5–8 | Complete (RAG pipeline, pgvector, Edge Function wired) |
| 3 | Operational Modules | 9–14 | Complete (all AI generation wired: risk assessment, incident analysis, observations, PTW) |
| 4 | Learning & Analytics | 15–18 | UI scaffolded; data pending |
| 5 | PWA & Voice | 19–22 | Not started |
| 6 | Enterprise Readiness | 23–28 | Not started |

---

## Phase 1: Foundation (Weeks 1–4) ✅

- [x] Project scaffolding: React 18, Vite 5, TypeScript, Tailwind CSS
- [x] Supabase project provisioned; environment variables configured
- [x] Database schema: profiles, roles, chat_sessions, chat_messages
- [x] Supabase Auth with email/password; profile fetch on login
- [x] Zustand auth store with role-based permission checks
- [x] App router with role-gated navigation
- [x] Sidebar, layout, and header components
- [x] Login page with demo account credentials
- [x] pgvector extension enabled (migration: phase2_vector_analytics_schema)
- [x] knowledge_documents, document_chunks, embeddings, analytics_events tables

## Phase 2: AI Core (Weeks 5–8) ✅

- [x] Mock AI service (keyword-matching + streaming simulation)
- [x] Safety escalation triggers (16 high-risk topics)
- [x] Chat page with streaming message display
- [x] Citation rendering in chat
- [x] Governance flagging from chat (flag button on every AI message)
- [x] Voice input via Web Speech API (en-NG locale)
- [x] Multi-turn conversation context (last 10 messages sent to Edge Function)
- [x] pgvector + document_chunks + embeddings schema (1536-dim, HNSW index)
- [x] analytics_events table with RLS + match_document_chunks RPC function
- [x] chat Edge Function: full RAG pipeline — embed query → pgvector search → context assembly → GPT-4o; falls back to mock when AZURE_OPENAI_KEY not set
- [x] generate-toolbox-talk Edge Function: real Azure OpenAI GPT-4o path; mock fallback
- [x] ChatPage wired to chat Edge Function (mock fallback on error)
- [x] ToolboxTalkPage: AI Generate tab calls Edge Function; Manual Record tab retained
- [ ] Azure OpenAI API key configured (AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT secrets) — activates real RAG

## Phase 3: Operational Modules (Weeks 9–14) ✅

- [x] Risk Assessment page (JSA/TRA form + list)
- [x] Toolbox Talk page (generate + history)
- [x] PTW Guidance page
- [x] Observations page (submit + manage)
- [x] Incident Guidance page
- [x] Emergency Response cards
- [x] Knowledge Base page (document list + search)
- [x] Risk assessment AI generation — generate-risk-assessment Edge Function; 6 work-type mock templates + Azure OpenAI path; saves to risk_assessment_steps; PDF export via window.print()
- [x] Toolbox talk AI generation (real LLM call via generate-toolbox-talk Edge Function)
- [x] PTW requirements check — static requirements per work type (PTW_REQUIREMENTS); live checklist updates as work type changes
- [x] Incident investigation AI analysis — analyze-incident Edge Function; 5-Why root cause analysis; 5 incident type templates + Azure OpenAI path; RC-01–RC-10 codes
- [x] PDF export for risk assessments (window.open + formatted HTML + window.print — no new dependencies)
- [x] Observation AI recommendation generation — 24 pre-written recommendations (6 types × 4 severities); synchronous client-side lookup

## Phase 4: Learning & Analytics (Weeks 15–18) 🔄

- [x] Learning page (module list + competency overview)
- [x] Analytics page (dashboard charts)
- [x] Governance page (review queue)
- [ ] Quiz system (question rendering, scoring, completion)
- [ ] Competency record tracking (per user, per module)
- [ ] Real analytics data from analytics_events table
- [ ] Recharts for usage trends, risk heatmap, competency gaps

## Phase 5: PWA & Voice (Weeks 19–22) ⬜

- [ ] vite-plugin-pwa setup with service worker
- [ ] Offline caching: emergency cards (7d), critical docs (7d), app shell (permanent)
- [ ] Background sync: observations queue, chat message queue
- [ ] IndexedDB stores via idb library
- [ ] Voice input: Web Speech API (SpeechRecognition)
- [ ] Whisper API fallback for noisy environments
- [ ] Voice output: Web Speech API (SpeechSynthesis)
- [ ] Push notifications for governance alerts and observation assignments
- [ ] Mobile-optimised UI (large tap targets, bottom nav)

## Phase 6: Enterprise Readiness (Weeks 23–28) ⬜

- [ ] NEPL SSO integration (SAML 2.0 / OIDC)
- [ ] Load testing (target: 500 concurrent users)
- [ ] Penetration testing (OWASP Top 10)
- [ ] Disaster recovery runbook
- [ ] Production deployment: Azure App Service + Azure PostgreSQL Flexible Server
- [ ] Data residency confirmation: Azure Africa (South Africa North)
- [ ] Security hardening: WAF, DDoS protection, private endpoints
- [ ] Monitoring: Azure Monitor, Application Insights, custom HSE dashboards

---

## Current Blocking Items

1. **Azure OpenAI API key** — set `AZURE_OPENAI_KEY` and `AZURE_OPENAI_ENDPOINT` secrets to activate real RAG pipeline (chat and toolbox talk Edge Functions already check for these and fall back to mock when absent)
2. **Document ingestion** — upload real NEPL PDF procedures via Knowledge Base page to populate document_chunks + embeddings
3. **Demo users** — call `seed-demo-users` Edge Function once to create the 6 demo accounts in Supabase Auth
