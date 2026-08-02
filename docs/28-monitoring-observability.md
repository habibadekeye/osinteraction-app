# HSE OPS AI — Monitoring & Observability

## Monitoring Philosophy

In a safety-critical application, monitoring has two priorities:
1. **Availability**: The app must be accessible when workers need it (especially emergencies)
2. **AI Quality**: The AI must be responding accurately and within appropriate confidence thresholds

## Monitoring Stack

| Tool | Purpose | Phase |
|------|---------|-------|
| Supabase Dashboard | DB query performance, active connections, storage | Now |
| Supabase Logs | Edge Function logs, auth events, error tracking | Now |
| Azure Monitor | Frontend performance, uptime, error rates | Phase 6 |
| Azure Application Insights | Full distributed tracing, AI call latency | Phase 6 |
| Custom Supabase queries | AI quality metrics, governance KPIs | Phase 4+ |

## Key Metrics to Monitor

### Availability
| Metric | Alert Threshold | Response |
|--------|----------------|---------|
| App uptime | < 99.5% in 24h | Page on-call |
| DB connection failures | > 3 in 5 min | Page on-call |
| Edge Function errors | > 5% error rate in 10 min | Investigate + alert |
| Auth failures | > 20 failed logins/min from single IP | Block IP, alert security |

### Performance
| Metric | Alert Threshold | Response |
|--------|----------------|---------|
| DB query P95 latency | > 2000ms | Investigate slow queries |
| Edge Function P95 latency | > 10,000ms | Check LLM availability |
| AI streaming first-token | > 5000ms | Check Azure OpenAI health |
| Storage upload P95 | > 30,000ms | Check Supabase Storage health |

### AI Quality
| Metric | Alert Threshold | Response |
|--------|----------------|---------|
| Escalation rate | > 5% of queries | Investigate trigger keywords |
| Avg confidence score | < 0.70 | Review knowledge base coverage |
| Flag rate | > 5% of responses | Governance team notified |
| Citation-less responses | > 10% of responses | RAG pipeline issue |

## Logging Standards

### Edge Function Log Format
```typescript
console.log(JSON.stringify({
  level: "info" | "warn" | "error",
  function: "chat",
  userId: user.id,
  sessionId: sessionId,
  event: "query_processed",
  durationMs: Date.now() - startTime,
  escalated: response.escalation_triggered,
  confidenceScore: response.confidence_score,
  timestamp: new Date().toISOString(),
}));
```

Structured JSON logs enable filtering in Supabase Logs dashboard.

### Error Logging

All Edge Function catch blocks log:
```typescript
console.error(JSON.stringify({
  level: "error",
  function: "chat",
  error: err instanceof Error ? err.message : String(err),
  stack: err instanceof Error ? err.stack : undefined,
  timestamp: new Date().toISOString(),
}));
```

## Health Check Endpoint

Each Edge Function responds to GET requests with a health check:
```typescript
if (req.method === "GET" && url.pathname === "/health") {
  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

Azure Front Door / uptime monitors ping `/functions/v1/chat` every 60 seconds.

## Database Monitoring Queries

```sql
-- Slow queries (> 500ms)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 500
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Table sizes (identify bloat)
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Recent errors in governance reviews (unusual escalation patterns)
SELECT created_at, flagged_reason, priority
FROM governance_reviews
WHERE created_at > NOW() - INTERVAL '24 hours'
AND priority IN ('high', 'critical')
ORDER BY created_at DESC;
```

## On-Call Runbook (Phase 6)

### High Error Rate Alert
1. Check Supabase Edge Function logs for error patterns
2. Check Azure OpenAI status page
3. If Azure OpenAI down: switch config to Anthropic fallback
4. If DB down: check Supabase status page, activate static emergency cards page
5. Notify NEPL IT within 30 minutes of confirmed outage

### AI Quality Degradation Alert
1. Check recent governance_reviews for flag patterns
2. Identify if a specific knowledge document is causing issues
3. Temporarily mark document as 'under_review' to exclude from RAG
4. Notify HSE Advisor for content review
5. Post-incident: update document and re-approve
