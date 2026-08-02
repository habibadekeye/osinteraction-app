# HSE OPS AI — Risk Assessment Logic

## Overview

Risk assessment in HSE OPS AI supports two methodologies:
1. **JSA (Job Safety Analysis)** — task-step-based hazard identification for operational activities
2. **TRA (Task Risk Assessment)** — broader task-level assessment for non-routine work
3. **Hazard Identification (HAZID)** — standalone hazard register for a location or system

## Risk Matrix (NEPL 5×5)

| | S1 Negligible | S2 Minor | S3 Moderate | S4 Major | S5 Catastrophic |
|--|--|--|--|--|--|
| **L5 Almost Certain** | 5 Med | 10 High | 15 High | 20 Crit | 25 Crit |
| **L4 Likely** | 4 Low | 8 Med | 12 High | 16 High | 20 Crit |
| **L3 Possible** | 3 Low | 6 Med | 9 Med | 12 High | 15 High |
| **L2 Unlikely** | 2 Low | 4 Low | 6 Med | 8 Med | 10 High |
| **L1 Rare** | 1 Low | 2 Low | 3 Low | 4 Low | 5 Med |

Rating = Likelihood × Severity

| Score | Rating | Color | Action |
|-------|--------|-------|--------|
| 1–4 | Low | Green | Proceed with standard controls |
| 5–9 | Medium | Yellow | Proceed with additional controls documented |
| 10–16 | High | Orange | Requires Supervisor sign-off before proceeding |
| 17–25 | Critical | Red | STOP — requires OIM / HSE Manager approval |

## Risk Rating TypeScript Logic

```typescript
// src/pages/RiskAssessmentPage.tsx
const RISK_MATRIX: Record<string, string> = {
  '1-1': 'low',  '1-2': 'low',    '1-3': 'low',    '1-4': 'low',    '1-5': 'medium',
  '2-1': 'low',  '2-2': 'low',    '2-3': 'medium', '2-4': 'medium', '2-5': 'high',
  '3-1': 'low',  '3-2': 'medium', '3-3': 'medium', '3-4': 'high',   '3-5': 'high',
  '4-1': 'low',  '4-2': 'medium', '4-3': 'high',   '4-4': 'high',   '4-5': 'critical',
  '5-1': 'medium','5-2': 'high',  '5-3': 'high',   '5-4': 'critical','5-5': 'critical',
};

function getRiskRating(likelihood: number, severity: number): string {
  return RISK_MATRIX[`${likelihood}-${severity}`] || 'medium';
}
```

## JSA Step Structure

Each JSA step is stored in `risk_assessment_steps`:

```typescript
interface RiskAssessmentStep {
  step_number: number;
  activity_step: string;       // What is being done
  hazards: string[];           // 2–4 specific hazards
  risk_before_likelihood: number;  // 1–5
  risk_before_severity: number;    // 1–5
  risk_before_rating: string;      // low/medium/high/critical
  control_measures: string[];      // 2–4 specific controls (Hierarchy of Controls)
  risk_after_likelihood: number;   // 1–5 (after controls)
  risk_after_severity: number;     // 1–5
  risk_after_rating: string;       // target: low or medium
  responsible_person: string;      // Role (not individual name)
}
```

## Hierarchy of Controls

When generating control measures, the AI MUST apply them in order of preference:

| Level | Type | Example |
|-------|------|---------|
| 1 | Eliminate | Remove the hazardous substance entirely |
| 2 | Substitute | Use a less hazardous material or method |
| 3 | Engineering | Guarding, ventilation, interlocks |
| 4 | Administrative | Procedures, training, permits, signage |
| 5 | PPE | Personal protective equipment (last resort) |

A JSA step should NOT only have PPE as a control — it must include at least one higher-level control.

## AI Generation Logic

When a user requests AI-generated JSA:

1. Retrieve top 5 most relevant procedure chunks from knowledge base
2. Build prompt (see docs/05-prompt-engineering.md — Risk Assessment Prompt)
3. Parse AI response: array of step objects
4. Calculate risk ratings server-side (do not trust AI to calculate `likelihood × severity`)
5. Flag if any residual risk is 'critical' → add governance review + notify user
6. Save to `risk_assessments` + `risk_assessment_steps`

## Mock AI Generation (Current)

`RiskAssessmentPage.tsx` generates a mock JSA with hardcoded steps for demo purposes. The mock includes realistic step structures, hazard descriptions, and control measures based on the activity type.

Activation: User clicks "Generate with AI" in the create form. This calls a local mock that returns a 5-step JSA for common activities (confined space, lifting, hot work, etc.).

## PDF Export (Phase 3)

JSA PDF export uses `jspdf` + `jspdf-autotable`:

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function exportJSAoPDF(assessment: RiskAssessment, steps: RiskAssessmentStep[]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  // Header: NEPL logo, assessment title, date, location
  // Risk matrix legend
  // Steps table: step_number, activity, hazards, pre-risk, controls, post-risk, responsible
  doc.save(`JSA-${assessment.id}.pdf`);
}
```

## Approval Workflow

```
Status: draft → completed → approved → archived
```

- `draft`: AI has generated steps, user reviews
- `completed`: User finalised steps, submitted for approval
- `approved`: HSE Manager or Admin has approved (signature equivalent)
- `archived`: Historical record

Residual risk ratings of 'critical' in any step → prevent status change to 'completed' without OIM approval flag.
