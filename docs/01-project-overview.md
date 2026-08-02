# HSE OPS AI — Project Overview

## Identity

**App Name**: HSE OPS AI  
**Platform**: Web (PWA), React 18 + Vite + TypeScript, hosted on Azure App Service  
**Database**: Supabase (PostgreSQL + pgvector)  
**AI Backend**: Azure OpenAI GPT-4o (primary), Anthropic Claude 3.5 Sonnet (fallback)  
**Client**: NEPL (Nigerian Exploration & Production Ltd) — oil & gas operations across onshore and offshore assets

## Purpose

HSE OPS AI is an AI-powered HSE (Health, Safety & Environment) operational support platform. It enables NEPL field workers, supervisors, and HSE professionals to:

- Query a curated, citation-grounded knowledge base of NEPL safety procedures via natural language chat
- Generate AI-assisted risk assessments (JSA/TRA), toolbox talks, and incident investigation guidance
- Access emergency response cards and permit-to-work guidance in the field (including offline)
- Track competency and learning progress through micro-learning modules and quizzes
- Provide management with governance oversight, analytics dashboards, and compliance reporting

## Core Differentiators

1. **RAG-grounded responses**: Every AI answer cites specific NEPL procedure documents — no hallucinations from general training data
2. **Safety guardrails**: High-risk queries (gas release, blowout, man overboard) trigger immediate STOP WORK escalation
3. **Field-first UX**: Voice input, large tap targets, offline capability — designed for rigs and platforms with poor connectivity
4. **Role-scoped access**: 7 roles from field worker to admin, each with strictly enforced permission boundaries
5. **Full audit trail**: Every AI interaction, governance decision, and content change is logged for regulatory traceability

## Asset Context

NEPL operates across multiple asset types, each with specific hazard profiles:
- **Onshore rigs** (drilling, workover)
- **Offshore platforms / FPSOs** (Bonga, EA, Okono)
- **Process terminals** (export terminals, gas plants)
- **Construction sites** (brownfield / greenfield projects)

## Demo Accounts (Development/Staging)

| Employee ID | Role | Name | Location |
|---|---|---|---|
| NEPL-ADM-0001 | admin | Samuel Adeyemi | Lagos HQ |
| NEPL-HSE-0042 | hse_manager | Dr. Ngozi Okafor | Bonga FPSO |
| NEPL-HSE-0087 | hse_advisor | Chukwuemeka Eze | Port Harcourt |
| NEPL-OPS-0156 | supervisor | Tunde Bakare | EA Field |
| NEPL-OPS-0789 | field_worker | Emeka Obi | Okono Platform |
| NEPL-AUD-0012 | auditor | Amaka Nwosu | Lagos HQ |

All demo accounts use password: `HSE OPS AI2024!`

## Current Implementation Status

Phase 1–3 foundations are implemented:
- Supabase auth with profile-based RBAC
- Full routing and layout with role-gated navigation
- Chat interface with streaming mock AI (keyword-matched responses + safety escalations)
- Knowledge base, emergency cards, risk assessment, toolbox talk, PTW guidance pages
- Observations, incident guidance, learning, governance, analytics, admin pages
- Database schema: profiles, chat_sessions, chat_messages, knowledge_documents, risk_assessments, toolbox_talks, observations, emergency_cards, governance_reviews, learning_modules, competency_records

## Explicit Non-Scope (MVP)

- No real-time IoT sensor integration
- No predictive incident AI
- No automated permit issuance (guidance only)
- No SCADA/DCS integration
- No multi-language (English only)
- No video analysis
- No blockchain audit trail
- No automated emergency dispatch
