# HSE OPS AI — Business Case

## Problem Statement

NEPL's HSE operational knowledge is locked in hundreds of PDFs, procedures, and manuals. Field workers and supervisors cannot quickly access the right procedure at the right moment. This leads to:

- **Procedure violations**: Workers improvise because they can't locate the correct procedure fast enough
- **Outdated guidance**: Printed copies become stale; digital PDFs are hard to search on a phone with gloves
- **Incident recurrence**: Root causes repeat because lessons learned are not accessible to the team that needs them
- **HSE advisor bottleneck**: Every non-routine query reaches the HSE desk instead of being self-served
- **Compliance gaps**: Toolbox talks, risk assessments, and observations are inconsistent in quality

## Target Outcomes

| Metric | Baseline | 12-Month Target |
|--------|----------|-----------------|
| Time to find procedure (field) | 15–30 min | < 30 seconds |
| Toolbox talk quality score | 2.4/5 | 4.2/5 |
| Near-miss reporting rate | Low (culture barrier) | +40% |
| HSE advisor query load | High | -30% (self-served) |
| Incident recurrence (repeat root cause) | Tracked | -25% |
| Regulatory audit findings | 8/year avg | < 3/year |

## Value Drivers

### 1. Productivity
AI-generated JSAs, toolbox talks, and PTW checklists reduce supervisor prep time from ~45 min to ~5 min.

### 2. Risk Reduction
Instant, accurate, citation-grounded safety guidance reduces the gap between "what the procedure says" and "what the worker does."

### 3. Compliance
Full audit trail of AI interactions, content approvals, and governance decisions supports NUPRC, NOSDRA, and ISO 45001 audits.

### 4. Knowledge Capture
Institutional knowledge encoded in the knowledge base survives staff turnover.

### 5. Workforce Competency
Micro-learning modules and competency tracking surface gaps before incidents occur.

## Stakeholder Map

| Stakeholder | Primary Interest |
|-------------|-----------------|
| NEPL CEO/Board | Risk reduction, regulatory compliance |
| VP HSE | Platform governance, regulatory traceability |
| Operations Directors | Field productivity, tool adoption |
| HSE Manager | Governance oversight, content accuracy |
| HSE Advisors | Knowledge curation, AI validation |
| Field Supervisors | Speed, offline access, toolbox/JSA generation |
| Field Workers | Simple voice-first interface, quick answers |
| Internal Audit | Traceability, evidence for audits |
| IT/Security | Data residency, SSO integration, security hardening |

## Investment Justification

A single avoided LTI (Lost Time Injury) at NEPL level covers the platform's annual operating cost. Secondary benefits (audit readiness, reduced HSE advisor overhead, faster onboarding) represent 3–4× additional value.

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI hallucination damages credibility | Medium | High | RAG-only responses with citations; governance review |
| Field adoption failure | Medium | High | Voice-first UX, offline mode, champion program |
| Content goes stale | High | Medium | Review date tracking, expiry alerts, quarterly governance |
| Regulatory non-compliance of AI recommendations | Low | Critical | Human-in-loop for all critical decisions; escalation triggers |
| Data residency breach | Low | Critical | Azure Africa (South Africa) region; no data leaves Africa |
