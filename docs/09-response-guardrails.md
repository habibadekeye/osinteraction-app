# HSE OPS AI — Response Guardrails

## Purpose

Guardrails prevent the AI from giving advice that could lead to injury, death, or regulatory violation. In an oil & gas HSE context, the cost of a wrong AI response is catastrophic.

## Layer 1: Input Guardrails

### High-Risk Topic Triggers (Immediate Escalation)

The following phrases, if detected in the user's query, bypass the RAG pipeline entirely and return a STOP WORK escalation response:

```typescript
const HIGH_RISK_TRIGGERS = [
  'gas release', 'major gas', 'blowout', 'well control', 'loss of control',
  'man overboard', 'explosion', 'fire offshore', 'platform fire',
  'confined space rescue', 'h2s emergency', 'structural collapse', 'toxic gas cloud',
  'live electrical rescue', 'radiation exposure', 'well kick',
];
```

These are matched case-insensitively as substring matches. Partial matches are intentional — "suspected gas release" should trigger as much as "confirmed major gas release."

### Prompt Injection Sanitisation

Before embedding, strip or neutralise:
- Instructions to "ignore previous instructions"
- Role-play requests ("pretend you are a different AI")
- Requests to reveal the system prompt
- SQL injection attempts in the query text
- HTML/script tags

```typescript
function sanitizeQuery(query: string): string {
  return query
    .replace(/<[^>]+>/g, '')                        // strip HTML
    .replace(/ignore (previous|all) instructions/gi, '')
    .replace(/system prompt|system message/gi, '[REDACTED]')
    .trim()
    .slice(0, 1000);                                 // hard length limit
}
```

## Layer 2: Generation Guardrails (System Prompt Rules)

Enforced via the system prompt (see docs/05-prompt-engineering.md):

1. "Answer ONLY from the retrieved documents above."
2. "NEVER provide advice that contradicts the retrieved documents."
3. "If information is insufficient, say so explicitly — never guess."
4. "For high-risk activities, always include a safety warning."
5. "Never suggest bypassing safety controls."
6. "Always reference applicable permits when relevant."
7. "Always include PPE requirements when relevant."
8. "Always mention gas testing requirements for confined space/hot work."

## Layer 3: Output Guardrails (Post-Generation Checks)

### Citation Validation

```typescript
function validateCitations(response: AIResponse, retrievedChunks: Chunk[]): boolean {
  const validCodes = new Set(retrievedChunks.map(c => c.document_code));
  return response.citations.every(cit => validCodes.has(cit.document_code));
}
```

If any citation references a document NOT in the retrieved chunks → flag as potential hallucination, downgrade confidence score, add governance review.

### Mandatory Warning Checks

For responses about these topics, scan for required keywords:

| Topic | Required Terms | Action if Missing |
|-------|---------------|------------------|
| Confined space | 'permit', 'atmospheric test', 'standby person' | Append standard CSE warning |
| Hot work | 'gas test', 'fire watch', 'permit' | Append standard hot work warning |
| Lifting | 'SWL', 'exclusion zone', 'inspection' | Append standard lifting warning |
| H₂S | 'SCBA', 'evacuation', 'upwind' | Append standard H₂S warning |
| Electrical | 'isolation', 'LOTO', 'permit' | Append standard electrical warning |

### Contradiction Detection

After retrieval and before delivery, the response is scanned for statements that directly contradict the retrieved chunks. This uses a secondary LLM call:

```
Given the following retrieved documents: {chunks}
Does the AI response below contradict any statement in these documents?
Response: {aiResponse}
Answer: yes/no + explanation if yes.
```

If contradiction detected → flag for governance, return conservative fallback response.

## Layer 4: Role-Based Content Restrictions

| Role | Knowledge Access |
|------|-----------------|
| contractor | Only `is_contractor_visible = true` documents |
| field_worker | All approved documents for their asset_type |
| All others | All approved documents |

Contractors NEVER receive:
- SIMOPS procedures (too complex, different role)
- Well control procedures (not their responsibility)
- Management system configuration documents

## Escalation Response Template

Used whenever `escalation_triggered = true`:

```markdown
## STOP WORK — ESCALATION REQUIRED

Your query involves a **high-risk emergency situation** that requires immediate human oversight.

### Immediate Actions:
1. **STOP all work immediately**
2. **Activate the nearest alarm / ESD if applicable**
3. **Notify your OIM / Supervisor NOW**
4. **Muster all personnel** at designated assembly points
5. **Follow your site Emergency Response Plan**

> **Do not proceed with any work until your HSE team and supervisor have provided explicit clearance.**

This query has been **automatically flagged** for governance review.

*Reference: NEPL-EMRG-001 Gas Release Emergency Response v1.5*
```

This response is stored as a chat_message with:
- `safety_flag = true`
- `escalation_triggered = true`
- `governance_status = 'escalated'`
- Automatic `governance_reviews` entry with `priority = 'critical'`

## Rate Limiting

AI queries are rate-limited to prevent abuse and manage cost:

| Limit | Value |
|-------|-------|
| Per-user per minute | 10 queries |
| Per-user per hour | 100 queries |
| Platform-wide per minute | 500 queries |
| Burst allowance | 5 queries in 5 seconds |

Rate limit exceeded → 429 response with `Retry-After` header.
