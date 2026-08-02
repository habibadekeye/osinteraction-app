# HSE OPS AI — Content Approval Workflow

## Purpose

No document may be used in AI responses until it has been reviewed and approved by an authorised reviewer (HSE Manager or Admin). This prevents outdated or incorrect procedures from being cited in AI guidance.

## Document Status Flow

```
Upload (HSE Advisor/Admin)
    ↓
status = 'draft'
    ↓
Chunking + Embedding complete
    ↓
status = 'under_review'  ← govenance_review created (type: document_content)
    ↓
HSE Manager / Admin reviews content
    ↓
    ├── Approve → status = 'approved'  ← available in RAG
    └── Reject → status = 'draft'     ← returned to uploader with notes
```

Only `status = 'approved'` documents are returned by the RAG retrieval query.

## Reviewer Roles

| Role | Can Approve | Can Reject | Can Edit |
|------|-----------|-----------|---------|
| Admin | Yes | Yes | Yes |
| HSE Manager | Yes | Yes | No |
| HSE Advisor | No | No | Yes (can update + resubmit) |
| All Others | No | No | No |

## Governance Review Entry (Document)

When a document reaches `under_review`, a `governance_reviews` entry is created:

```typescript
await supabase.from('governance_reviews').insert({
  document_id: documentId,
  review_type: 'document_content',
  status: 'pending',
  flagged_by: uploaderId,
  flagged_reason: `New document uploaded: ${document.title} (${document.document_code})`,
  priority: document.risk_level === 'critical' ? 'high' : 'medium',
});
```

This appears in the Governance page for HSE Manager / Admin review.

## Review Checklist (HSE Manager)

When reviewing a new document, the HSE Manager checks:

- [ ] Document code matches NEPL naming convention (`NEPL-{CAT}-{###}`)
- [ ] Version number is correct (incremented from previous version if applicable)
- [ ] Content is accurate and up to date (check vs physical procedure binder)
- [ ] Risk level classification is appropriate
- [ ] Asset type tags are correct (rig/platform/terminal/construction)
- [ ] `is_contractor_visible` flag set correctly
- [ ] `is_emergency_critical` flag set correctly
- [ ] `review_date` set (annual for procedures, biennial for manuals)

## Approval Action

```typescript
// PUT /api/governance/reviews/:id
await supabase
  .from('governance_reviews')
  .update({
    status: 'approved',
    reviewed_by: reviewerUserId,
    review_notes: 'Verified against physical procedure binder NEPL-CSE-001 v3.2',
    reviewed_at: new Date().toISOString(),
  })
  .eq('id', reviewId);

// Also update the document status
await supabase
  .from('knowledge_documents')
  .update({
    status: 'approved',
    approved_by: reviewerUserId,
    approved_at: new Date().toISOString(),
  })
  .eq('id', documentId);
```

## Document Versioning

When a new version of an existing document is uploaded:

1. Upload new document with `document_code = 'NEPL-CSE-001'` and `version = '3.3'`
2. Old version (`v3.2`) is NOT deleted — it is marked `status = 'superseded'`
3. New version goes through `under_review → approved` workflow
4. Once new version approved: old version superseded automatically
5. Audit log records: who uploaded, who approved, what changed

The superseded document remains in the database for audit trail purposes but is excluded from RAG retrieval.

## Review SLA

| Document Priority | Review SLA |
|-----------------|-----------|
| critical risk | 24 hours |
| high risk | 48 hours |
| medium/low risk | 5 working days |

Documents not reviewed within SLA → escalation email to HSE VP.

## AI Response Review (Separate Workflow)

When a user flags an AI chat response (see docs/08-ai-governance-framework.md), a separate `governance_reviews` entry is created with `review_type = 'ai_response'`. This is distinct from document approval.

## Expiry Management

Documents with `expiry_date` set receive:
- 60-day warning: notification to HSE Advisor who owns the document
- 30-day warning: notification to HSE Manager
- On expiry: status automatically changes to `under_review` (removed from RAG until reapproved)

```sql
-- Cron job: run nightly to flag expiring documents
UPDATE knowledge_documents
SET status = 'under_review'
WHERE expiry_date <= CURRENT_DATE
AND status = 'approved';
```
