# HSE OPS AI — Version Control Policy

## Repository Structure

```
safeops-ai/
├── src/                    # Frontend React application
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # Database schema migrations (SQL)
├── docs/                   # This context documentation
├── public/                 # Static assets
├── .env                    # Local development variables (never committed)
├── .env.example            # Template for .env (committed, no secrets)
└── .gitignore
```

## Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|-----------|
| `main` | Production code | Requires PR + review + CI passing |
| `staging` | Staging environment | Requires PR + CI passing |
| `feature/*` | Feature development | No protection |
| `fix/*` | Bug fixes | No protection |
| `hotfix/*` | Production emergency fixes | Bypasses staging, direct to main with approval |

## Commit Convention (Conventional Commits)

```
feat: add voice input to chat page
fix: correct H2S exposure level in mockAI response
feat(governance): add review notes field to governance page
fix(auth): handle session expiry during long form submission
chore: update dependencies
docs: add API design context file
test: add unit tests for risk rating calculation
```

## Migration Versioning

Database migrations follow Supabase's timestamp convention:

```
supabase/migrations/
├── 20260612173143_safeops_baseline_schema.sql      # Initial schema
├── 20260612180512_create_ptw_and_incidents.sql     # Phase 2 tables
└── 20260XXX_add_pgvector_and_embeddings.sql        # Phase 2: vector tables
```

**Rules**:
- Migrations are append-only — never modify an existing migration file
- Each migration must be self-contained and idempotent where possible
- Never `DROP TABLE` or `DROP COLUMN` — only add or archive
- Test migrations in staging before applying to production

## Version Numbering (App Releases)

Semantic versioning: `MAJOR.MINOR.PATCH`

| Type | When | Example |
|------|------|---------|
| MAJOR | Breaking change to API or DB schema | 2.0.0 |
| MINOR | New feature or module added | 1.3.0 |
| PATCH | Bug fix, content update, style change | 1.2.4 |

Current version: `0.9.0` (pre-production, Phase 1–3 complete)

## What Must Never Be Committed

```gitignore
.env
.env.local
.env.*.local
node_modules/
dist/
*.key
*.pem
supabase/.env
```

API keys, service role keys, Azure OpenAI keys must ONLY be stored:
- Locally: in `.env` (gitignored)
- Deployed: in Supabase Edge Function secrets (via MCP `list_edge_function_secrets`)

## PR Requirements

Before merging a PR to `main`:
1. `npm run typecheck` passes (no TypeScript errors)
2. `npm run lint` passes
3. `npm run build` succeeds
4. No `any` types introduced
5. No secrets in code
6. If schema changed: migration file included and tested
7. If Edge Function changed: function deployed to staging first

## Knowledge Document Version Control

Knowledge documents (NEPL procedures) are versioned in the database:
- Each version is a separate row in `knowledge_documents`
- Previous version marked `status = 'superseded'` (not deleted)
- New version goes through approval workflow before activation
- Version history queryable via `document_code` filter with all statuses

This provides a complete audit trail of when each procedure version was active in the AI knowledge base.

## Edge Function Deployment

Edge Functions are deployed via Supabase MCP tool:
```
mcp__supabase__deploy_edge_function({ slug: 'chat', verify_jwt: true })
```

This is tracked in deployment logs. Production deployments require:
1. Function tested in staging environment
2. PR review approval
3. CI passing

Never deploy Edge Functions with sensitive hardcoded values — use `Deno.env.get()` and Supabase secrets.
