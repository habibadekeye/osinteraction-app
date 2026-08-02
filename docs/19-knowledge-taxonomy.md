# HSE OPS AI — Knowledge Taxonomy

## Category Structure

The knowledge base is organised into 15 top-level categories. Categories are stored in `knowledge_categories` table and pre-populated in the baseline migration.

## Category Definitions

| Code | Name | Risk Level | Asset Types | Priority Documents |
|------|------|-----------|------------|-------------------|
| HSE-MS | HSE Management System | Medium | All | NEPL-HSE-MS-001 |
| PSM | Process Safety | Critical | platform, terminal | NEPL-PSM-001 |
| DRILL-SAFE | Drilling Safety | Critical | rig | NEPL-DRILL-001 |
| LIFT-OPS | Lifting Operations | High | rig, platform, construction | NEPL-LIFT-001 |
| CSE | Confined Space Entry | Critical | All | NEPL-CSE-001 |
| WAH | Working at Height | High | rig, platform, construction | NEPL-WAH-001 |
| ELEC-SAFE | Electrical Safety | High | All | NEPL-ELEC-001 |
| PTW | Permit to Work | Critical | All | NEPL-PTW-001 |
| EMERGENCY | Emergency Response | Critical | All | NEPL-EMRG-001 |
| ENV-MGMT | Environmental Management | High | All | NEPL-ENV-001 |
| CONT-SAFE | Contractor Safety | Medium | All | NEPL-CONT-001 |
| MARINE | Marine Operations | High | rig, platform | NEPL-MARINE-001 |
| SIMOPS | SIMOPS Management | Critical | rig, platform | NEPL-SIM-001 |
| INC-INV | Incident Investigation | High | All | NEPL-INC-001 |
| OCC-HEALTH | Occupational Health | Medium | All | NEPL-OCC-001 |

## Document Types

| Type | Description | Review Cycle |
|------|-------------|-------------|
| procedure | Step-by-step operational procedure | Annual |
| sop | Standard Operating Procedure | Annual |
| manual | Reference manual | Biennial |
| guideline | Advisory guidance (not mandatory) | Biennial |
| alert | Safety alert / bulletin (event-driven) | N/A |
| lesson_learned | Incident lesson | N/A |
| regulatory | External regulatory document | As published |
| emergency_plan | Emergency response plan | Annual |

## Document Status Flow

```
draft → under_review → approved → archived
                    ↓         ↓
                  rejected  superseded (new version approved)
```

Only `approved` documents are served by the RAG pipeline.

## Priority Documents for Initial Load

The following 15 documents should be the first priority for content ingestion:

1. `NEPL-HSE-MS-001` — HSE Management System v1.0 (master reference)
2. `NEPL-PTW-001` — Permit to Work Procedure v2.1
3. `NEPL-CSE-001` — Confined Space Entry Procedure v3.2
4. `NEPL-EMRG-001` — Emergency Response Plan v1.5
5. `NEPL-LIFT-001` — Lifting Operations Standard v2.3
6. `NEPL-OCC-001` — H₂S Safety Procedure v2.0
7. `NEPL-INC-001` — Incident Investigation Guideline v2.4
8. `NEPL-WAH-001` — Working at Height Procedure v2.0
9. `NEPL-ELEC-001` — Electrical Safety Procedure v1.8
10. `NEPL-SIM-001` — SIMOPS Management Procedure v1.8
11. `NEPL-DRILL-001` — Drilling Safety Procedure v3.0
12. `NEPL-PSM-001` — Process Safety Management Framework v2.0
13. `NEPL-CONT-001` — Contractor Safety Management v1.5
14. `NEPL-MARINE-001` — Marine Operations Safety v1.2
15. `NEPL-ENV-001` — Environmental Management Procedure v2.1

## Metadata Tag Taxonomy

Documents should be tagged with terms from the following controlled vocabulary for search filtering:

**Hazard Types**: `confined_space`, `hot_work`, `cold_work`, `lifting`, `electrical`, `height`, `h2s`, `fire`, `explosion`, `chemical`, `radiation`, `noise`, `vibration`, `ergonomic`, `manual_handling`

**Activity Types**: `drilling`, `well_workover`, `production`, `maintenance`, `construction`, `inspection`, `cleaning`, `testing`, `commissioning`, `decommissioning`

**Asset Types**: `rig`, `platform`, `fpso`, `terminal`, `pipeline`, `well`, `manifold`, `vessel`

**Regulatory Body**: `nuprc`, `nosdra`, `nesrea`, `iso_45001`, `iogp`, `api`, `atex`

**Department**: `drilling`, `operations`, `maintenance`, `hse`, `logistics`, `marine`, `construction`

## Contractor-Visible Documents

Documents with `is_contractor_visible = true` include:
- NEPL-HSE-MS-001 (summary section only — via chunk filter)
- NEPL-PTW-001 (requester sections only)
- NEPL-CSE-001 (full)
- NEPL-EMRG-001 (emergency response and muster only)
- NEPL-CONT-001 (full — designed for contractors)
- NEPL-OCC-001 (H₂S section)

## Emergency-Critical Documents

Documents with `is_emergency_critical = true` are prioritised for offline caching:
- NEPL-EMRG-001, NEPL-CSE-001, NEPL-PTW-001, NEPL-OCC-001, NEPL-DRILL-001
