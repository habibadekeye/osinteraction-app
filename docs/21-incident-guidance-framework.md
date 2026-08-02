# HSE OPS AI — Incident Guidance Framework

## Purpose

The Incident Guidance module (`/incident`) provides AI-assisted support for:
1. Incident classification and severity assessment
2. 5-Why root cause analysis
3. Corrective action generation
4. Investigation checklist and interview guide
5. Regulatory notification requirements

It does NOT replace a trained incident investigator. It is a support tool for the investigation team.

## Incident Classification

### By Type
| Type | Definition |
|------|-----------|
| `unsafe_act` | A person deviating from a safe practice |
| `unsafe_condition` | A physical condition that could cause harm |
| `near_miss` | Event that could have caused harm but didn't |
| `first_aid` | Injury requiring first aid only |
| `medical_treatment` | Injury requiring medical treatment |
| `restricted_work_case` | Worker cannot perform normal duties |
| `lost_time_injury` | Worker absent from work the following day |
| `fatality` | Death resulting from work incident |
| `process_safety_event` | Loss of primary containment event |
| `environmental` | Spill, release, or environmental damage |
| `asset_damage` | Damage to equipment or facility |

### By Severity (5-Level)
| Level | Name | Criteria | Investigation Level |
|-------|------|---------|-------------------|
| 1 | Near Miss | No harm occurred | Level 1 (Supervisor) |
| 2 | Minor | First aid / minor damage | Level 1 (Supervisor) |
| 3 | Moderate | LTI / restricted work / damage < $100K | Level 2 (HSE Advisor) |
| 4 | Serious | Permanent disability / damage $100K–$1M | Level 2/3 (HSE Manager) |
| 5 | Catastrophic | Fatality / multiple LTI / damage > $1M | Level 3 (HSE Manager + External) |

## 5-Why Root Cause Analysis

### Methodology

Start from the immediate cause (the last event before the incident) and ask "Why did this happen?" five times. Target the systemic/organisational root cause, not individual blame.

### Example
**Incident**: Worker slipped on wet deck and fractured wrist.

| Why | Answer |
|-----|--------|
| Why 1 | The deck was wet and slippery |
| Why 2 | Oil leaked from a pump seal |
| Why 3 | The seal was worn — not replaced at last PM |
| Why 4 | The PM was 3 weeks overdue |
| Why 5 | Maintenance backlog was not reviewed or prioritised |

**Root Cause**: Maintenance prioritisation and backlog management process failure.
**Corrective Action**: Implement weekly maintenance backlog review with HSE Manager sign-off.

### Common Root Cause Categories (NEPL Standard)

| Code | Category | Description |
|------|---------|-------------|
| RC-01 | Procedure Absent | No procedure exists for the task |
| RC-02 | Procedure Not Followed | Procedure exists but not used |
| RC-03 | Procedure Inadequate | Procedure is unclear, outdated, or wrong |
| RC-04 | Training Deficiency | Worker not trained for the task |
| RC-05 | Supervision Failure | Supervisor did not verify safe conditions |
| RC-06 | Design/Engineering | Equipment designed without safety consideration |
| RC-07 | Maintenance Failure | Equipment not maintained, failed during use |
| RC-08 | Communication Failure | Safety information not communicated |
| RC-09 | Management System | System/process did not prevent the condition |
| RC-10 | Environmental | Adverse weather or environmental conditions |

## Investigation Steps by Level

### Level 1 (Near Miss / First Aid) — Supervisor Led
1. Secure the scene and ensure no further risk
2. Provide first aid / call medic if needed
3. Notify line manager and HSE contact immediately
4. Complete Incident Report form within 4 hours
5. Conduct 5-Why with the involved worker(s)
6. Identify corrective actions (implement within 5 days)
7. Close out and brief the team on lessons learned

### Level 2 (LTI / Recordable) — HSE Advisor Led
All Level 1 steps PLUS:
1. Preserve scene with photos and measurements
2. Take written statements from witnesses within 24 hours
3. Review relevant procedures and training records
4. Notify NUPRC if LTI (within 48 hours)
5. Conduct formal root cause analysis (5-Why or TapRoot)
6. Issue corrective actions with named owners and deadlines
7. Present findings to HSE Manager within 5 working days

### Level 3 (Serious / Fatality) — HSE Manager + External
All Level 2 steps PLUS:
1. Contact NUPRC immediately — preserve scene, no cleanup without approval
2. Establish formal investigation team (minimum 3 people including external)
3. Retain all evidence under chain of custody
4. Legal/insurance notification (as required)
5. Independent review of all corrective actions
6. Board-level presentation within 30 days
7. Share lessons learned with industry (IOGP, PATON, OPTS)

## Corrective Action Framework (SMART)

Each corrective action must be:
- **Specific**: Clear action, not "improve safety"
- **Measurable**: How do we know it's done?
- **Assignable**: Named role (not department)
- **Realistic**: Achievable with available resources
- **Time-bound**: Deadline date specified

| Priority | Timeframe |
|----------|----------|
| Immediate | Same shift / same day |
| Short-term | Within 5 working days |
| Medium-term | Within 30 days |
| Long-term | Within 90 days |

## Current Implementation

`IncidentPage.tsx` provides:
- Incident list view (from Supabase `incidents` table via migration)
- Create new incident form with type, severity, description, location
- AI guidance button (calls mock AI with incident description)
- 5-Why analysis display from AI response
- Corrective actions list

Pending (Phase 3):
- Real AI analysis via Edge Function `analyze-incident`
- Investigation template generation
- NUPRC notification checklist
- Corrective action tracking (assign + close workflow)
