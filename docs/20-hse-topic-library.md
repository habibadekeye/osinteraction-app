# HSE OPS AI — HSE Topic Library

## Purpose

This document defines the canonical HSE topics that HSE OPS AI must handle accurately. Each topic includes the expected knowledge the AI should provide, the NEPL documents it should cite, and the safety rules it must always include.

**Implementation status**:
- Topics 1–10 are **currently implemented** in `src/services/mockAI.ts` with keyword matching and full response content.
- Topics 11–13 are **planned for Phase 2** — they appear in this spec but are not yet in the mock AI keyword table.

## Topic 1: Confined Space Entry (CSE)

**Trigger keywords**: confined space, tank entry, vessel entry, manhole, CSE, confined space entry

**Must include in responses**:
- Classification requirement (is it a confined space? permit-required or not?)
- Atmospheric testing requirements: O₂ 19.5–23.5%, flammable <10% LEL, H₂S <1ppm
- Isolation requirements (double block & bleed or spade)
- LOTO (Lock Out/Tag Out) requirement
- Entry team roles: Entry Supervisor, Entrant, Standby Person
- Continuous atmospheric monitoring during entry
- Emergency rescue plan activation before entry

**Primary citation**: NEPL-CSE-001  
**Safety escalation if**: "confined space rescue", "man trapped in confined space"

## Topic 2: Hot Work Permit

**Trigger keywords**: hot work, welding, grinding, cutting, flame, spark, hot work permit

**Must include**:
- Category A PTW requirement
- Gas test <10% LEL within 30 minutes of start
- Fire watch requirement (before ignition + 30 min after)
- 10m clearance of combustibles
- Control room communication
- Re-test if work suspended >1 hour

**Primary citation**: NEPL-PTW-001

## Topic 3: Lifting Operations

**Trigger keywords**: crane, lifting, rigging, sling, hoist, overhead lift, SWL

**Must include**:
- Lift category (Routine / Complex / Critical)
- Pre-use crane inspection
- SWL verification for all equipment
- Exclusion zone (load diameter + 5m minimum)
- Weather check (wind ≤15 m/s offshore)
- Never stand under suspended load (Life-Saving Rule)

**Primary citation**: NEPL-LIFT-001

## Topic 4: H₂S Safety

**Trigger keywords**: h2s, hydrogen sulfide, hydrogen sulphide, sour gas

**Must include**:
- 4-level action thresholds (1/5/10/50 ppm)
- SCBA required above 10 ppm
- Upwind/uphill evacuation direction
- No rescue without SCBA + buddy system
- First aid: fresh air, CPR, oxygen

**Primary citation**: NEPL-OCC-001  
**Safety escalation if**: "h2s emergency", "h2s cloud"

## Topic 5: PTW System

**Trigger keywords**: permit to work, PTW, cold work permit, work permit, permit system

**Must include**:
- 5 permit types (Hot Work, Cold Work, CSE, Electrical, Critical Lifting)
- PTW 7-step process flow
- Validity requirements (all signatories, gas test attached)
- Display requirement at work site

**Primary citation**: NEPL-PTW-001

## Topic 6: Job Safety Analysis / Risk Assessment

**Trigger keywords**: JSA, risk assessment, TRA, hazard identification, job safety analysis

**Must include**:
- 5-step JSA process
- NEPL 5×5 risk matrix (L×S rating: Low/Medium/High/Critical)
- Hierarchy of controls (Eliminate → Substitute → Engineering → Admin → PPE)
- Residual risk target (≤ Medium)
- Crew review requirement

**Primary citation**: NEPL-HSE-MS-001 (Section on risk assessment)

## Topic 7: SIMOPS

**Trigger keywords**: SIMOPS, simultaneous operations, concurrent operations

**Must include**:
- Definition and when it applies
- SIMOPS categories requiring formal assessment
- Green/Amber/Red classification
- Daily SIMOPS meeting requirement
- OIM absolute authority to stop operations

**Primary citation**: NEPL-SIM-001  
**Safety escalation if**: "SIMOPS conflict", "simultaneous operations emergency"

## Topic 8: Emergency Response

**Trigger keywords**: emergency, muster, assembly point, evacuation, emergency response

**Must include**:
- REACT protocol (Recognise, Escalate, Assemble, Communicate, Treat)
- Muster station roles (OIM, Warden, ERT, Medic)
- Do NOT use lifts during evacuation
- No re-entry until OIM all-clear

**Primary citation**: NEPL-EMRG-001

## Topic 9: Toolbox Talk

**Trigger keywords**: toolbox talk, pre-job briefing, safety briefing, crew briefing

**Must include**:
- 6-part structure (Task, Hazards, Controls, Emergency, Questions, Sign-off)
- 15–20 minute duration
- Interactive not lecturing
- Records retained 3 years minimum

**Primary citation**: NEPL-HSE-MS-001 (Section 7)

## Topic 10: Incident Investigation

**Trigger keywords**: incident, near miss, accident, investigation, root cause, 5 why

**Must include**:
- Reporting timeframes (near miss immediately, LTI 2h, fatality immediately)
- NUPRC notification requirements
- 5-Why methodology (systemic root cause, not blame)
- Investigation levels (1/2/3 by severity)

**Primary citation**: NEPL-INC-001

## Topic 11: Working at Height (WAH)

**Trigger keywords**: working at height, scaffolding, harness, fall arrest, fall protection, rope access

**Must include**:
- Work at height = any work above 2m
- PTW required above 3m on NEPL facilities
- Fall protection hierarchy: eliminate > collective > PPE
- Harness inspection before each use
- Exclusion zone below work area

**Primary citation**: NEPL-WAH-001

## Topic 12: Electrical Safety

**Trigger keywords**: electrical, live work, isolation, LOTO, switchboard, energized

**Must include**:
- No live electrical work without OIM/EM authorisation
- Electrical Isolation Permit required for work on >50V
- LOTO procedure (6 steps)
- Test for dead before touch
- Competent person requirement

**Primary citation**: NEPL-ELEC-001  
**Safety escalation if**: "live electrical rescue", "electrical emergency"

## Topic 13: Process Safety (PSM)

**Trigger keywords**: process safety, HAZOP, SIL, relief valve, overpressure, process upset, LOPC

**Must include**:
- PSM is for Major Accident Hazard prevention (not personal safety)
- 14 elements of PSM
- Loss of primary containment (LOPC) = Tier 1/2 event
- Immediate reporting to NUPRC

**Primary citation**: NEPL-PSM-001
