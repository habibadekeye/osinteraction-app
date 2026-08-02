# HSE OPS AI — Nigerian Regulatory Mapping

## Overview

NEPL operations are regulated by multiple Nigerian and international frameworks. HSE OPS AI content must be compliant with and traceable to these regulations.

## Primary Regulators

| Regulator | Full Name | Scope |
|-----------|-----------|-------|
| NUPRC | Nigerian Upstream Petroleum Regulatory Commission | Upstream E&P, drilling, production |
| NOSDRA | National Oil Spill Detection and Response Agency | Oil spills, environmental incidents |
| NESREA | National Environmental Standards and Regulations Enforcement Agency | Environmental compliance |
| DPR | Department of Petroleum Resources (legacy, now NUPRC) | Petroleum industry safety |
| FMEnv | Federal Ministry of Environment | Environmental impact assessments |

## Key Nigerian Regulations

### Petroleum Industry Act (PIA) 2021
- Establishes NUPRC and NMDPRA
- Section 104: HSE obligations for upstream operators
- Section 237: Environmental protection requirements
- Mandates HSE Management Systems for all licensees

### Nigerian Oil and Gas Industry Content Development Act 2010
- Local content requirements for personnel and services

### NUPRC Safety Regulations
- Well control procedures and reporting
- Drilling safety requirements
- Incident reporting timeframes:
  - Fatality: immediate notification + formal report within 24 hours
  - Serious injury: within 24 hours
  - LTI: within 48 hours
  - Near miss: not mandatory but recommended

### NOSDRA (Oil Spill) Regulations
- Reporting: oil spill > 1 barrel must be reported within 24 hours
- Response plan must be pre-approved
- Clean-up contractor list must be pre-registered

## International Standards Referenced

| Standard | Application in HSE OPS AI |
|----------|--------------------------|
| ISO 45001:2018 | HSE Management System framework |
| API RP 505 | Fire hazard classifications |
| API RP 54 | Drilling safety |
| IOGP Life-Saving Rules | 9 core rules referenced in high-risk responses |
| IOGP Report 634 | Process safety fundamentals |
| NORSOK Z-013 | Risk assessment methodology |
| IEC 60079 | Hazardous area classification (ATEX) |

## IOGP Life-Saving Rules (Core 9)

These are referenced automatically when relevant topics are queried:

1. Bypass safety controls → Obtain authorisation before overriding or disabling safety systems
2. Energy isolation → Verify isolation and zero energy before work begins
3. Confined space → Obtain permit, test atmosphere before and during entry
4. Line of fire → Position yourself to avoid being in the line of fire
5. Work at height → Protect yourself against a fall when working at height
6. Driving → Follow safe driving rules — speed, seatbelt, no phone
7. Alcohol & drugs → Do not work or drive under the influence
8. Hot work → Obtain permit and test atmosphere before lighting the flame
9. Lifting → Never work or walk under a suspended load

## Document Code Convention

NEPL procedure codes follow the format: `NEPL-{CATEGORY}-{###}`

| Category Code | Category |
|---------------|----------|
| CSE | Confined Space Entry |
| PTW | Permit to Work |
| LIFT | Lifting Operations |
| EMRG | Emergency Response |
| INC | Incident Investigation |
| OCC | Occupational Health |
| HSE-MS | HSE Management System |
| SIM | SIMOPS |
| DRILL | Drilling Safety |
| WAH | Working at Height |
| ELEC | Electrical Safety |
| PSM | Process Safety Management |

## Mandatory Regulatory References by Topic

When AI responds to the following topics, it MUST reference the applicable regulation:

| Topic | NEPL Procedure | Nigerian Regulation |
|-------|---------------|---------------------|
| Incident reporting | NEPL-INC-001 | NUPRC Safety Regulations Sec. 15 |
| Well control | NEPL-DRILL-001 | NUPRC Drilling Regulations |
| Gas release / oil spill | NEPL-EMRG-001 | NOSDRA Reporting Requirement |
| Confined space | NEPL-CSE-001 | Factory Act Cap F1 LFN 2004 |
| Working at height | NEPL-WAH-001 | Factories Act, NUPRC Guidelines |
| H₂S | NEPL-OCC-001 | NUPRC Technical Standards |

## NUPRC Incident Classification

| Class | Description | Reporting |
|-------|-------------|-----------|
| Class 1 | Near Miss | Internal log only |
| Class 2 | First Aid / Medical Treatment | Internal 48h report |
| Class 3 | Lost Time Injury | NUPRC 48h notification |
| Class 4 | Permanent Disability / Fatality | NUPRC immediate + 24h formal |
| Class 5 | Process Safety Event (Tier 1/2) | NUPRC immediate + 24h formal |
| Class 6 | Blowout / Well Control | NUPRC immediate + OIM notification |
