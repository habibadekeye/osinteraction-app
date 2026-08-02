# HSE OPS AI — AI Governance Framework

## Purpose

Every AI interaction in a safety-critical environment must be auditable, correctable, and human-overridable. This framework defines how HSE OPS AI ensures accountability for AI-generated content.

## Governance Layers

### Layer 1: Pre-Generation (Guardrails)
- High-risk topic detection before the LLM is called
- Role-based knowledge base filtering (contractors see only contractor-scoped docs)
- Query sanitisation to prevent prompt injection

### Layer 2: Generation Controls
- Temperature 0.3 (low creativity / high determinism)
- RAG-only: LLM instructed never to use general training knowledge
- JSON structured output with explicit citation fields
- Citation validation: cited document_code must exist in retrieved chunks

### Layer 3: Post-Generation Review
- Automated safety scan on AI response before delivery
- Confidence score appended to every response
- Responses below 0.60 confidence flagged automatically

### Layer 4: Human Review (Governance Queue)
- Users can flag any AI response for inaccuracy, outdated content, or unsafe advice
- Flagged responses appear in `governance_reviews` table
- HSE Manager / HSE Advisor / Admin can review, approve, reject, or escalate
- Reviewed decisions are logged with reviewer identity and timestamp

### Layer 5: Audit Trail
- Every AI query and response stored in `chat_messages` with governance_status
- Every governance decision stored in `governance_reviews`
- Every content change stored in `audit_logs`
- Immutable logs — no DELETE on audit_logs

## governance_reviews Table States

```
pending → under_review → approved
                       → rejected
                       → escalated → (manual process)
```

## Flagging Flow (User-Initiated)

```
User sees bad response
    → Clicks "Flag" icon on message
    → Modal: Select reason (inaccurate | unsafe | outdated | hallucination | other)
    → Optional: Add comment
    → POST /api/chat/sessions/:id/messages/:messageId/flag
    → Creates governance_reviews entry (status: pending)
    → Notifies HSE Manager / HSE Advisor via in-app notification
```

## Review Flow (HSE Manager / Advisor)

```
Governance page → Filter by status: pending
    → Review flagged message + reason
    → View original citations
    → Decision:
        approve: "Response was accurate, flag dismissed"
        reject: "Response was inaccurate — document the correction"
        escalate: "Requires OIM / VP HSE review"
    → PUT /api/governance/reviews/:id { status, reviewNotes }
    → Updates chat_messages.governance_status
    → Logs audit_logs entry
```

## Automated Governance Triggers

| Trigger | Action |
|---------|--------|
| safety_flag = true (high-risk escalation) | Auto-creates governance_review with priority='critical' |
| confidence_score < 0.60 | Auto-creates governance_review with priority='low' |
| Message cited document with status='archived' | Auto-creates governance_review |
| User flagged manually | Creates governance_review with user-selected priority |

## Content Governance (Documents)

New documents uploaded to the knowledge base cannot be used in RAG retrieval until:
1. Document status = 'approved' (set by HSE Manager or Admin)
2. Document chunks have been generated
3. Embeddings have been computed and stored

The approval workflow is described in docs/33-content-approval-workflow.md.

## Response Override

If a governance reviewer determines an AI response was wrong:
1. They record the correction in `review_notes`
2. The original message's `governance_status` is set to 'rejected'
3. If the error traces to a knowledge document: the document is flagged for update
4. A `governance_review` of type='document_content' is created for the relevant document
5. HSE Advisor updates the document; document returns to 'under_review' status

## Regulatory Traceability

For NUPRC or ISO 45001 audit purposes, the following reports are exportable:
- All AI responses on a given date range (with governance status)
- All flagged responses and their review outcomes
- Document approval history (who approved what, when)
- Escalation history (which queries triggered STOP WORK)

## Governance KPIs (tracked in analytics_events)

| KPI | Target |
|----|--------|
| % of flagged responses reviewed within 48h | > 95% |
| % of AI responses with governance_status='approved' | > 90% |
| Avg days from flag to resolution | < 2 days |
| Escalation rate (STOP WORK triggers / total queries) | < 1% |
