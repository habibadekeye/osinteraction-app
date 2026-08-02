import type { Citation } from '../types';

const HIGH_RISK_TRIGGERS = [
  'gas release', 'major gas', 'blowout', 'well control', 'loss of control',
  'man overboard', 'explosion', 'fire offshore', 'platform fire',
  'confined space rescue', 'h2s emergency', 'structural collapse', 'toxic gas cloud'
];

const ESCALATION_RESPONSE = `## STOP WORK — ESCALATION REQUIRED

Your query involves a **high-risk emergency situation** that requires immediate human oversight.

### Immediate Actions:
1. **STOP all work immediately**
2. **Activate the nearest alarm / ESD if applicable**
3. **Notify your OIM / Supervisor NOW**
4. **Muster all personnel** at designated assembly points
5. **Follow your site Emergency Response Plan**

> **Do not proceed with any work until your HSE team and supervisor have provided explicit clearance.**

This query has been **automatically flagged** for governance review.

*Reference: NEPL-EMRG-001 Gas Release Emergency Response v1.5*`;

export interface MockAIResponse {
  content: string;
  citations: Citation[];
  safety_flag: boolean;
  escalation_triggered: boolean;
  escalation_reason?: string;
  confidence_score: number;
}

const KNOWLEDGE_RESPONSES: Array<{ keywords: string[]; response: string; citations: Citation[] }> = [
  {
    keywords: ['confined space', 'tank entry', 'vessel entry', 'cse'],
    response: `## Confined Space Entry Requirements

Before entering any confined space, the following **NEPL mandatory requirements** must be met:

### 1. Classification & Assessment
- Classify the space using the **CSE risk matrix** (NEPL-CSE-001, Section 3)
- Conduct atmospheric testing: O₂ (19.5–23.5%), flammable gas (<10% LEL), H₂S (<1ppm)
- A valid **Confined Space Entry Permit** must be issued before entry

### 2. Isolation Requirements
- Complete **full process isolation** — double block & bleed or spade isolation
- Lock Out / Tag Out (LOTO) all energy sources
- Verify zero energy with a competent person

### 3. Entry Team Roles
- **Entry Supervisor** — permit issuer, accountable for safety
- **Entrant** — must have valid CSE competency
- **Standby Person** — remains outside, trained in rescue, equipped with SCBA

### 4. Monitoring During Entry
- Continuous atmospheric monitoring required throughout entry
- Emergency rescue plan activated before entry begins

> **Safety Rule**: If atmospheric readings exceed limits at ANY point — evacuate immediately and do not re-enter until re-tested and cleared.

*Reference: NEPL-CSE-001 v3.2 | NUPRC Well Services Regulation*`,
    citations: [
      { document_title: 'Confined Space Entry Procedure', document_code: 'NEPL-CSE-001', excerpt: 'Atmospheric testing requirements: O₂ 19.5–23.5%, flammable gas <10% LEL. Full isolation and LOTO mandatory before entry.', relevance_score: 0.97, page: 4 },
      { document_title: 'Permit to Work Procedure', document_code: 'NEPL-PTW-001', excerpt: 'Confined space entry requires a Category A permit issued by the Area Authority with gas test attached.', relevance_score: 0.88, page: 12 },
    ],
  },
  {
    keywords: ['hot work', 'welding', 'grinding', 'cutting', 'hot work permit', 'flame', 'spark'],
    response: `## Hot Work Permit Requirements

All hot work on NEPL facilities requires a **Category A Hot Work Permit** (NEPL-PTW-001).

### Before Starting Hot Work
- **Gas test** required within 30 minutes of work start: <10% LEL in work area and 10m radius
- **Fire watch** must be in position before ignition — trained and equipped with extinguisher
- All combustible material removed or shielded within **10m radius**
- Communication confirmed with the **Control Room**

### Permit Requirements
| Item | Requirement |
|------|-------------|
| Gas Test | <10% LEL, O₂ 19.5–23.5%, H₂S <1ppm |
| Validity | Maximum 12 hours; retest if suspended >1 hour |
| Fire Watch | Mandatory during and 30 min after completion |
| PPE | Face shield, leather gloves, FR coveralls, safety boots |

### Prohibited Areas
Hot work is **prohibited** without OIM authorisation in:
- Hazardous area Zone 0 or Zone 1 (ATEX classified)
- Within 25m of a live open drain during active hydrocarbon release

> **Remember**: Fire watch must remain for the full **30-minute cool-down** period after hot work stops.

*Reference: NEPL-PTW-001 v2.1 | NUPRC Safety Regulation Section 8*`,
    citations: [
      { document_title: 'Hot Work Permit Procedure', document_code: 'NEPL-PTW-001', excerpt: 'Gas testing required within 30 minutes of hot work commencement. Fire watch mandatory during all hot work activities and 30 minutes after completion.', relevance_score: 0.96, page: 7 },
    ],
  },
  {
    keywords: ['lifting', 'crane', 'rigging', 'sling', 'hoisting', 'overhead lift'],
    response: `## Lifting Operations Requirements

NEPL lifting operations are governed by **NEPL-LIFT-001** with three categories:

### Lift Categories
| Category | Description | Requirement |
|----------|-------------|-------------|
| **Routine** | Standard, repetitive lifts <3T | CP Rigger + standard PTW |
| **Complex** | Non-routine, >3T, multi-crane | Lift Study + CP Rigger + Supervisor |
| **Critical** | >20T, personnel lifts, over live process | Engineered lift plan + OIM approval |

### Pre-Lift Checks (ALL Lifts)
1. **Crane pre-use inspection** completed and signed (daily)
2. All lifting accessories inspected and within test date
3. **Safe Working Load (SWL)** confirmed for all equipment
4. **Exclusion zone** established: minimum = load diameter + 5m
5. **Weather check**: wind speed <15 m/s for offshore lifts
6. Hand signals or radio communication confirmed with banksman

> **Life-Saving Rule**: Never stand under a suspended load. This is a zero-tolerance violation.

*Reference: NEPL-LIFT-001 v2.3 | DROPS Guidelines | LEEA Codes of Practice*`,
    citations: [
      { document_title: 'Lifting Operations Standard', document_code: 'NEPL-LIFT-001', excerpt: 'Critical lifts require an engineered lift plan approved by OIM. Exclusion zone minimum equals load diameter plus 5 metres.', relevance_score: 0.95, page: 9 },
    ],
  },
  {
    keywords: ['h2s', 'hydrogen sulfide', 'hydrogen sulphide', 'sour gas', 'h2s detector'],
    response: `## H₂S — Hydrogen Sulphide Safety

H₂S is a **highly toxic, colourless gas**. Do not rely on smell alone — olfactory fatigue occurs rapidly at dangerous levels.

### NEPL Exposure Action Levels
| Level | Action Required |
|-------|----------------|
| 1 ppm | Warning — monitor closely |
| 5 ppm | Evacuate non-essential personnel |
| 10 ppm | **Mandatory evacuation** of all personnel |
| 50 ppm | Immediately dangerous to life (IDLH) |

### If H₂S Alarm Activates:
1. **Don SCBA immediately** — do not rely on escape sets for rescue
2. Move **upwind and uphill** from the source
3. **Alert all nearby personnel** via radio
4. **Do NOT attempt rescue** without full SCBA and buddy system
5. Contact medic and OIM immediately

### First Aid for Casualties
- Move to **fresh air immediately** (rescuer must use SCBA)
- If not breathing: **CPR immediately**
- Administer emergency oxygen if available
- Evacuate to medical facility

> **NEPL Life-Saving Rule**: SCBA must be donned before entering any area where H₂S >10 ppm is detected or suspected.

*Reference: NEPL-OCC-001 H₂S Safety Procedure v2.0*`,
    citations: [
      { document_title: 'H2S Safety Procedure', document_code: 'NEPL-OCC-001', excerpt: 'Mandatory evacuation at H₂S levels ≥10 ppm. SCBA required before entering any area with detected or suspected H₂S above 10 ppm.', relevance_score: 0.98, page: 5 },
      { document_title: 'Gas Release Emergency Response', document_code: 'NEPL-EMRG-001', excerpt: 'For sour gas releases containing H₂S, activate ESD and evacuate all personnel to upwind muster station immediately.', relevance_score: 0.87, page: 3 },
    ],
  },
  {
    keywords: ['ptw', 'permit to work', 'cold work permit', 'permit system', 'work permit'],
    response: `## Permit to Work (PTW) System Overview

The NEPL PTW system is a **formal safety control** for managing non-routine, high-risk activities.

### Permit Types
| Permit | Application |
|--------|-------------|
| **Hot Work** | Any activity generating heat, flame, or spark |
| **Cold Work** | Mechanical maintenance in non-hazardous areas |
| **Confined Space Entry** | Entry into any classified confined space |
| **Electrical Isolation** | Work on electrical equipment >50V |
| **Critical Lifting** | Lifts >20T or over live process |

### PTW Process Flow
1. **Requester** identifies task, completes PTW application
2. **Responsible Person (RP)** reviews, adds risk controls
3. **Area Authority (AA)** issues permit after site inspection
4. **Control Room** logs and authorises (SIMOPS check)
5. Work commences — permit displayed at work site
6. **Suspension** if conditions change — return to AA
7. **Close-out** by RP and AA when work complete

> **Key Rule**: A permit is **only valid** when all named parties have physically signed and gas test is attached (where required).

*Reference: NEPL-PTW-001 Permit to Work Procedure v2.1*`,
    citations: [
      { document_title: 'Hot Work Permit Procedure', document_code: 'NEPL-PTW-001', excerpt: 'The PTW is only valid when all required signatures are in place and gas test certificate is attached. Permits must be displayed at the work location at all times.', relevance_score: 0.94, page: 2 },
    ],
  },
  {
    keywords: ['jsa', 'job safety analysis', 'risk assessment', 'hazard identification', 'tra', 'task risk'],
    response: `## Job Safety Analysis (JSA) — How to Conduct One

A JSA systematically identifies hazards in each step of a task **before** work begins.

### 5-Step JSA Process

**Step 1: Define the Job**
Break the activity into sequential steps (typically 5–12 steps per task).

**Step 2: Identify Hazards per Step**
For each step, ask: *What could go wrong? What are the energy sources?*
Use NEPL hazard categories: Mechanical, Electrical, Chemical, Gravitational, Pressure, Thermal.

**Step 3: Assess Pre-Control Risk**
Using the NEPL 5×5 risk matrix:
- **Likelihood**: 1 (Rare) → 5 (Almost Certain)
- **Severity**: 1 (Negligible) → 5 (Catastrophic)
- Risk Rating = L × S: 1–4 Low | 5–9 Medium | 10–16 High | 17–25 Critical

**Step 4: Define Control Measures (Hierarchy of Controls)**
Eliminate → Substitute → Engineering → Administrative → PPE

**Step 5: Assess Residual Risk**
Re-score after controls. Target: Medium (≤9) or lower. Critical/High residual risk requires OIM approval.

> **Tip**: Review the completed JSA with the **actual work crew** — their local knowledge identifies hazards the desk review misses.`,
    citations: [
      { document_title: 'Incident Investigation Guideline', document_code: 'NEPL-INC-001', excerpt: 'JSA must be completed by the work team and reviewed by the supervisor before non-routine work begins.', relevance_score: 0.89, page: 14 },
    ],
  },
  {
    keywords: ['simops', 'simultaneous operations', 'concurrent operations'],
    response: `## SIMOPS — Simultaneous Operations Management

SIMOPS refers to **two or more concurrent activities** that can create interaction hazards. This is **critical risk** on NEPL offshore facilities.

### SIMOPS Categories Requiring Formal Assessment
- Drilling operations while production is ongoing
- Lifts over live process equipment
- Hot work near running equipment
- Activities within the **500m safety zone** during well operations

### SIMOPS Control Process
1. **Identify** — All parties submit planned activities to PTW/Control Room (24h ahead)
2. **Assess** — SIMOPS coordinator reviews interaction risk
3. **Classify** — Green (proceed), Amber (proceed with controls), Red (stop one activity)
4. **Coordinate** — Daily SIMOPS meeting; all supervisors present
5. **Monitor** — Control room tracks concurrent activities

### Prohibited SIMOPS Combinations (Red)
- Well testing + hot work within 50m
- Crane lifts over diving operations
- Explosive work (perforating) + crane lifts

> **OIM Authority**: The OIM has absolute authority to stop any activity creating unacceptable SIMOPS risk.

*Reference: NEPL-SIM-001 SIMOPS Management Procedure v1.8*`,
    citations: [
      { document_title: 'SIMOPS Management Procedure', document_code: 'NEPL-SIM-001', excerpt: 'SIMOPS coordinator must review all planned concurrent activities 24 hours in advance. OIM has absolute authority to suspend any activity creating unacceptable interaction risk.', relevance_score: 0.96, page: 6 },
    ],
  },
  {
    keywords: ['toolbox talk', 'pre-job', 'safety briefing', 'crew briefing', 'pre-task'],
    response: `## Toolbox Talk — Best Practices

A toolbox talk is a **focused safety discussion** with the work crew immediately before a task. Mandatory for all non-routine work on NEPL sites.

### Effective Structure (15–20 minutes)
1. **The Task** (2 min): What are we doing? Where? Who is involved?
2. **Hazards** (5 min): What could hurt us? Cover top 3–5 hazards
3. **Controls** (5 min): What are we doing to manage each hazard?
4. **Emergency** (2 min): What do we do if something goes wrong?
5. **Questions** (2 min): Any concerns from the crew?
6. **Sign-off**: All attendees sign the record

### Tips for High-Quality Toolbox Talks
- **Specific**: "We are lifting a 2-tonne pump today" beats "be careful with lifts"
- **Interactive**: Ask questions, don't just read from a card
- **Local hazards**: Include site-specific conditions and concurrent work
- **Documentation**: Signed records retained for **minimum 3 years**

*Reference: NEPL HSE Management System v1.0, Section 7*`,
    citations: [
      { document_title: 'HSE Management System', document_code: 'NEPL-HSE-MS-001', excerpt: 'Toolbox talks are mandatory before all non-routine work. Signed records to be retained for minimum 3 years.', relevance_score: 0.88, page: 45 },
    ],
  },
  {
    keywords: ['emergency', 'muster', 'assembly point', 'evacuation', 'emergency response'],
    response: `## Emergency Response — REACT Protocol

In any emergency on a NEPL facility, follow the **REACT** protocol:

- **R**ecognise the emergency — identify type and severity
- **E**scalate immediately — sound alarm, notify OIM, Control Room
- **A**ssemble — proceed to your designated muster station
- **C**ommunicate — account for all personnel, report to muster warden
- **T**reat casualties — only if safe and you are trained

### Muster Station Roles
| Role | Responsibility |
|------|---------------|
| **OIM** | Overall emergency command |
| **Muster Warden** | Headcount at each muster point |
| **Emergency Response Team** | Fire, medical, rescue |
| **Medic** | Casualty treatment and triage |

### Do's and Don'ts
Proceed directly to muster — do not collect personal belongings.
Do NOT re-enter the facility until OIM gives all-clear.
Do NOT use lifts during emergency evacuation.

> **Emergency Numbers**: NEPL Emergency Control Centre: **+234-800-NEPL-ECC**

*Reference: NEPL-EMRG-001 Emergency Response Plan v1.5*`,
    citations: [
      { document_title: 'Gas Release Emergency Response', document_code: 'NEPL-EMRG-001', excerpt: 'REACT protocol: Recognise, Escalate, Assemble, Communicate, Treat. OIM has overall command authority. No re-entry until OIM gives all-clear.', relevance_score: 0.92, page: 8 },
    ],
  },
  {
    keywords: ['incident', 'near miss', 'accident', 'investigation', 'root cause', '5 why'],
    response: `## Incident Investigation — Process Guide

All incidents including near misses must be reported and investigated on NEPL facilities.

### Reporting Timeframes
| Severity | Deadline | NUPRC |
|----------|---------|-------|
| Near Miss | Immediately | No |
| Minor Injury | Same shift | No |
| Lost Time Injury | Within 2 hours | Yes |
| Fatality/Serious | Immediately | Yes — 24h |

### 5-Why Root Cause Analysis
Start from the immediate cause and ask "Why?" five times:

*Example: Worker slipped on wet deck*
1. Why? Deck was wet with oil
2. Why? Pump seal was leaking
3. Why? Seal was worn — not replaced at last PM
4. Why? PM schedule was overdue by 3 weeks
5. Why? Backlog not prioritised in maintenance planning

**Root cause**: Maintenance prioritisation process failure — corrective action targets the system, not the person.

### NEPL Investigation Levels
- **Level 1** (Near Miss): Supervisor-led, 48 hours
- **Level 2** (LTI/Recordable): HSE Advisor-led, 5 days
- **Level 3** (Serious/Fatality): HSE Manager + external, 30 days

*Reference: NEPL-INC-001 Incident Investigation Guideline v2.4*`,
    citations: [
      { document_title: 'Incident Investigation Guideline', document_code: 'NEPL-INC-001', excerpt: 'NUPRC requires notification of serious incidents and fatalities within 24 hours. 5-Why analysis targets systemic root causes, not individual blame.', relevance_score: 0.95, page: 3 },
    ],
  },
];

const FALLBACK_RESPONSE = `I searched the NEPL approved knowledge base for your query.

Based on available procedures, I recommend:

1. **Check with your HSE Advisor** — they can point you to the specific NEPL procedure that applies
2. **Search the Knowledge Base** — use the Knowledge Base module to search for relevant procedures
3. **Consult your Supervisor** — for operational decisions that require authorisation

If you can rephrase your question with more specific details about the activity, location, or hazard type, I'll be better able to provide accurate guidance from the approved procedures.

> **Tip**: For quicker answers, include the specific activity (e.g. "confined space entry on the Bonga FPSO") or the relevant NEPL procedure code if you know it.

*Based on NEPL HSE Management System v1.0*`;

export function generateMockResponse(query: string): MockAIResponse {
  const lowerQuery = query.toLowerCase();

  const isEscalation = HIGH_RISK_TRIGGERS.some(trigger => lowerQuery.includes(trigger));
  if (isEscalation) {
    return {
      content: ESCALATION_RESPONSE,
      citations: [{ document_title: 'Gas Release Emergency Response', document_code: 'NEPL-EMRG-001', excerpt: 'Major gas releases require immediate ESD activation and personnel muster.', relevance_score: 0.99, page: 1 }],
      safety_flag: true,
      escalation_triggered: true,
      escalation_reason: 'High-risk emergency topic detected',
      confidence_score: 0.99,
    };
  }

  for (const entry of KNOWLEDGE_RESPONSES) {
    if (entry.keywords.some(kw => lowerQuery.includes(kw))) {
      return {
        content: entry.response,
        citations: entry.citations,
        safety_flag: false,
        escalation_triggered: false,
        confidence_score: 0.87 + Math.random() * 0.1,
      };
    }
  }

  return {
    content: FALLBACK_RESPONSE,
    citations: [],
    safety_flag: false,
    escalation_triggered: false,
    confidence_score: 0.62,
  };
}

export async function streamMockResponse(
  query: string,
  onChunk: (chunk: string) => void,
  onComplete: (response: MockAIResponse) => void
) {
  const response = generateMockResponse(query);
  const words = response.content.split(' ');
  let accumulated = '';

  for (let i = 0; i < words.length; i++) {
    accumulated += (i > 0 ? ' ' : '') + words[i];
    onChunk(accumulated);
    await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 18));
  }

  onComplete(response);
}
