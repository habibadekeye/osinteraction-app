# HSE OPS AI — Deployment Architecture

## Target Infrastructure (Production)

| Component | Service | Region | Tier |
|-----------|---------|--------|------|
| Frontend | Azure Static Web Apps | Africa (South Africa North) | Standard |
| Backend API | Supabase Edge Functions (Deno Deploy) | Nearest region | Pro |
| Database | Supabase PostgreSQL | Supabase-managed (AWS US-East-1 → migrate to Pro regional) | Pro |
| LLM | Azure OpenAI | East US 2 (nearest with GPT-4o) | Pay-as-you-go |
| File Storage | Supabase Storage | Co-located with DB | Pro |
| CDN | Azure Front Door | Global | Standard |

## Data Residency Requirement

NEPL requires that operational data (user profiles, incident records, safety observations) be stored in Africa or within NEPL-approved regions. For Supabase Pro, the database region should be moved to `ap-southeast-1` (Singapore, closest compliant region) or a self-hosted instance in Azure Africa (South Africa North) is used.

Long-term: Self-hosted Supabase on Azure VM in South Africa North region.

## Current Development Environment

- Frontend: Bolt WebContainer (development)
- Database: Supabase-hosted PostgreSQL (shared infrastructure)
- Edge Functions: Deployed to Supabase Edge runtime
- AI: Mock AI (no external LLM calls)

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://{project}.supabase.co
VITE_SUPABASE_ANON_KEY={anon_key}
```

### Edge Functions (Supabase Secrets)
```
SUPABASE_URL={auto-injected by runtime}
SUPABASE_ANON_KEY={auto-injected by runtime}
SUPABASE_SERVICE_ROLE_KEY={service_role_key}
AZURE_OPENAI_KEY={azure_openai_api_key}
AZURE_OPENAI_ENDPOINT=https://{resource}.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large
OPENAI_API_KEY={openai_key_for_whisper_fallback}
```

## Deployment Pipeline (Phase 6)

```
Developer pushes to main branch
    ↓
GitHub Actions CI:
    - npm run typecheck
    - npm run lint
    - npm run build (verifies no build errors)
    ↓
Azure Static Web Apps:
    - Auto-deploys frontend on push to main
    - Preview deployments on PRs
    ↓
Supabase:
    - Migrations applied via supabase db push (CI step)
    - Edge Functions deployed via supabase functions deploy (CI step)
```

## Scaling Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent users | 500 | Peak shift change |
| API requests/sec | 50 | Mix of DB queries + AI calls |
| AI queries/min | 100 | Rate-limited per user |
| DB connections | 100 | Supabase connection pooling |
| P95 response time (non-AI) | < 300ms | |
| P95 response time (AI) | < 8 seconds | GPT-4o streaming first token |

## Load Balancing

Supabase handles DB connection pooling via PgBouncer. Edge Functions auto-scale with Deno Deploy. Azure Static Web Apps scales automatically.

## Backup & Recovery

| Data | Backup Frequency | Retention | RTO | RPO |
|------|-----------------|-----------|-----|-----|
| PostgreSQL | Daily (Supabase automated) + WAL | 7 days | 4 hours | 24 hours |
| Storage (documents) | Daily | 30 days | 2 hours | 24 hours |
| Audit logs | Continuous (WAL) | 1 year | 2 hours | 1 hour |

## Monitoring

See docs/28-monitoring-observability.md for full monitoring setup.

## Disaster Recovery

1. Database: Restore from daily snapshot to new Supabase project
2. Frontend: Redeploy from GitHub (< 5 min)
3. Edge Functions: Redeploy from source (< 10 min)
4. Total RTO: < 4 hours for full service restoration
5. Runbook: DR procedures documented and tested quarterly
