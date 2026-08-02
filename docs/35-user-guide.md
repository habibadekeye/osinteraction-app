# HSE OPS AI — User & Management Guide

**NEPL HSE AI Platform**
**Version 1.0 | June 2026**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started — Login and Navigation](#2-getting-started)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Dashboard](#4-dashboard)
5. [AI Safety Assistant (Chat)](#5-ai-safety-assistant-chat)
6. [Risk Assessment](#6-risk-assessment)
7. [Permit to Work (PTW)](#7-permit-to-work-ptw)
8. [Toolbox Talks](#8-toolbox-talks)
9. [Safety Observations](#9-safety-observations)
10. [Incident Reports](#10-incident-reports)
11. [Emergency Procedures](#11-emergency-procedures)
12. [Knowledge Base](#12-knowledge-base)
13. [Learning & Competency](#13-learning--competency)
14. [Analytics](#14-analytics)
15. [Governance Review](#15-governance-review)
16. [Administration](#16-administration)
17. [AI Features Explained](#17-ai-features-explained)
18. [Frequently Asked Questions](#18-frequently-asked-questions)

---

## 1. Introduction

HSE OPS AI is NEPL's integrated Health, Safety, and Environment (HSE) platform. It combines day-to-day operational safety workflows — permits, observations, incident reports, toolbox talks — with an AI assistant trained on NEPL procedures, Nigerian regulations, and offshore/onshore best practice.

**What HSE OPS AI does:**

- Answers HSE questions instantly, citing the source NEPL procedure
- Generates Job Safety Analyses (JSA) and risk assessments from a brief description of the work
- Produces ready-to-use toolbox talk content tailored to the crew and topic
- Guides incident investigation using structured 5-Why root cause analysis
- Maintains a full audit trail of observations, permits, incidents, and AI interactions

**What HSE OPS AI does NOT do:**

- It does not replace the Permit to Work (PTW) system of record. It provides guidance and checklists; the authorised issuer still signs the permit.
- It does not replace qualified HSE personnel. Always escalate critical incidents to your HSE Advisor or HSE Manager as normal.
- AI-generated content is a starting point. Review and adapt all outputs before use on site.

---

## 2. Getting Started

### Accessing the Platform

Open HSE OPS AI in any modern web browser (Chrome, Edge, Firefox, or Safari). The platform is fully responsive and works on desktop, tablet, and mobile.

### Logging In

1. On the **Login** page, enter your NEPL email address and password.
2. Click **Sign In**.
3. You will be taken directly to the **Dashboard**.

> **Demo accounts** are available for evaluation. Contact your HSE Manager or System Administrator for credentials.

### Navigation

The **sidebar** on the left provides access to all sections. It is divided into four groups:

| Group | Sections |
|---|---|
| **Main** | Dashboard, AI Assistant, Knowledge Base, Emergency |
| **Operations** | PTW, Risk Assessment, Toolbox Talks, Observations, Incidents |
| **Learning** | Learning & Competency |
| **Management** | Analytics, Governance, Admin (admin only) |

On mobile, tap the menu icon to open the sidebar. Click any item to navigate. Your current section is highlighted.

Your **name**, **role**, and **location** are shown at the bottom of the sidebar. Click **Logout** to sign out securely.

---

## 3. User Roles and Permissions

HSE OPS AI uses role-based access. Each user is assigned one role when their account is created. The role controls which sections of the platform are visible and what actions can be taken.

| Role | Typical User | Key Access |
|---|---|---|
| **Field Worker** | Operator, technician, deck crew | Dashboard, Chat, Emergency, Observations, PTW, Toolbox Talks, Learning |
| **Contractor** | Third-party personnel | Dashboard, Chat, Emergency, Toolbox Talks |
| **Supervisor** | Foreman, lead technician | All of the above + Risk Assessment, Incident Reports |
| **HSE Advisor** | Site HSE Advisor | All of the above + Governance Review, Knowledge Base (edit) |
| **HSE Manager** | HSE Manager | All of the above + Analytics |
| **Auditor** | Internal/external auditor | Analytics, Governance Review (read-only) |
| **Admin** | IT / System Administrator | Full access including Administration panel |

> If you believe you have the wrong role, contact your Administrator.

---

## 4. Dashboard

The Dashboard is the first screen you see after logging in. It gives a real-time summary of HSE activity on your facility.

### Metric Cards

Six cards across the top of the screen show live counts pulled from the database:

| Card | What it shows |
|---|---|
| **Active PTW** | Number of permits currently in force |
| **Open Observations** | Safety observations not yet closed |
| **Knowledge Docs** | Documents in the Knowledge Base |
| **AI Conversations** | Total chat sessions on the platform |
| **Active Incidents** | Incidents with status Open or Investigating |
| **Governance Queue** | AI responses flagged for human review |

### Recent Observations

The five most recent safety observations are listed with type, severity, location, and time. This allows supervisors and HSE staff to spot emerging patterns at a glance.

### Quick Actions

Four shortcut buttons give one-tap access to the most common tasks:

- **Ask AI** — opens the AI Safety Assistant
- **New Observation** — jumps directly to the observation form
- **Emergency** — opens Emergency Procedures
- **Knowledge** — opens the Knowledge Base

### System Status Bar

At the bottom of the dashboard, a status bar confirms your active role, assigned asset type (platform, rig, onshore), and department. This context is passed to the AI Assistant when you ask questions.

---

## 5. AI Safety Assistant (Chat)

The AI Assistant is the core feature of HSE OPS AI. Ask it any HSE question in plain English and it will respond using NEPL procedures, regulations, and international best practice as its source.

### Starting a Conversation

1. Click **AI Assistant** in the sidebar.
2. Type your question in the text box at the bottom and press **Enter** or click the send button.
3. The AI will respond within a few seconds. Source documents used to generate the answer are shown in the right panel.

### Quick Prompts

Seven preset buttons appear above the input box for the most common questions:

- Confined Space Entry procedure
- Hot Work Permit requirements
- PPE requirements for deck operations
- H2S emergency response
- Permit to Work process
- Job Safety Analysis steps
- Incident reporting procedure

Click any of these to send that question instantly.

### Voice Input

Click the **microphone** icon to speak your question instead of typing. The platform uses your device microphone and transcribes speech to text. This is designed for use in the field where typing is impractical.

> Voice input requires microphone permission in your browser. The language is set to Nigerian English (en-NG).

### Reading the Response

Each AI message includes:

- **The answer** — structured, clear guidance referencing NEPL procedures by document code
- **Source citations** — click the bookmark icon to see which documents were used and their relevance score
- **Action buttons** on each message:
  - **Copy** — copies the message text
  - **Thumbs up / Thumbs down** — rates the quality of the response
  - **Flag for review** — sends the message to the Governance queue if you think the answer is incorrect

### Safety Escalations

If your question touches a critical risk (H2S, fire, gas release, confined space emergency, working at height, etc.), the AI will display a **Stop Work** alert in red, advising immediate escalation to your supervisor or HSE Advisor. Do not proceed with the work until this has been assessed.

### Chat History

Previous conversations are listed in the left panel. Click any session to resume it. Each session is saved automatically.

### When the AI Uses Real vs Mock Data

The AI responds using one of two modes:

- **Edge (live)** — when Azure OpenAI is configured, the AI retrieves context from uploaded NEPL documents and generates a real GPT-4o response. A small **⚡ Edge** indicator appears in the chat footer.
- **Mock** — when Azure OpenAI keys are not set, the AI returns pre-written, NEPL-specific responses for common topics. The quality is high but fixed.

---

## 6. Risk Assessment

The Risk Assessment module lets supervisors and HSE personnel generate a full Job Safety Analysis (JSA) or Task Risk Assessment (TRA) using AI, then save and export it.

### Generating a New Assessment

1. Click **Risk Assessment** in the sidebar.
2. Click **New Assessment**.
3. Fill in the form:
   - **Title** — a brief name for the assessment
   - **Work Type** — select from: Hot Work, Confined Space, Lifting Operations, Electrical Work, Excavation, or General Work
   - **Assessment Type** — JSA (step-by-step task analysis) or TRA (Task Risk Assessment)
   - **Location** — where the work will take place
   - **Crew Experience** — Mixed, Experienced, or Trainee (affects control measure recommendations)
   - **Activity Description** — describe the specific work in a few sentences
4. Click **Generate Assessment**.

The AI will produce a five-step JSA with:

- **Activity step** — what is being done at each stage
- **Hazards** — all identified hazards for that step
- **Initial risk rating** — likelihood × severity before controls (Low / Medium / High / Critical)
- **Control measures** — listed in hierarchy of controls order (Eliminate → Substitute → Engineering → Administrative → PPE)
- **Residual risk rating** — risk after controls are applied

### Reading the Assessment

Each step is shown as a collapsible row. Click a row to expand it and see the full hazard list and control measures side by side. Coloured dots show the before and after risk ratings.

### Exporting to PDF

Click **Export PDF** to open a formatted print view of the full assessment. Use your browser's **Print** function (Ctrl+P / Cmd+P) and select **Save as PDF** as the destination.

### Past Assessments

All saved assessments are listed below the form. Click **View Steps** on any past assessment to reload and review it. Each assessment shows its overall and residual risk ratings.

---

## 7. Permit to Work (PTW)

The PTW section provides AI-generated requirements checklists to support the physical PTW process. It does not replace your facility's paper or digital PTW system of record.

### Raising a New Permit Request

1. Click **PTW** in the sidebar.
2. Click **New Permit**.
3. Complete the permit form:
   - **Work Type** — Hot Work, Confined Space, Electrical Isolation, Working at Height, Excavation, Radiography, Diving Operations, or General Cold Work
   - **Work Title** — brief description of the task
   - **Location** — specific work site (e.g., "Pump Room B, Deck 3")
   - **Start and End date/time**
   - **Requested By** and **Work Order number** (optional)
   - **Risk Level** — Low, Medium, High, or Critical

### Live Requirements Checklist

As you select the **Work Type**, the right panel updates automatically with all mandatory requirements for that permit type. Each requirement is grouped by category, for example:

- **Pre-Work Checks** — gas testing, isolation verification, area barricading
- **Permit Requirements** — signatures and approvals needed
- **PPE Required** — specific personal protective equipment
- **Post-Work** — reinstatement and area clearance steps

Use the checkboxes next to each item to confirm requirements are met before submitting the form. These checkboxes are for personal reference; they are not stored in the database.

The checklist reference is **NEPL-PTW-001 Permit to Work Procedure v2.1**.

### Existing Permits

All active and past permits are listed with status badges:

| Status | Meaning |
|---|---|
| **Draft** | Not yet submitted |
| **Pending** | Awaiting approval |
| **Approved** | Permit in force |
| **Active** | Work is in progress |
| **Closed** | Work completed, permit signed off |
| **Rejected** | Not approved |
| **Cancelled** | Withdrawn before use |

---

## 8. Toolbox Talks

Toolbox Talks are short pre-shift safety briefings. HSE OPS AI can generate a complete, ready-to-deliver toolbox talk in seconds.

### Generating an AI Toolbox Talk

1. Click **Toolbox Talks** in the sidebar.
2. Select the **AI Generate** tab.
3. Fill in:
   - **Topic** — what the talk is about (e.g., "Working at Height", "Manual Handling")
   - **Duration** — 5, 10, or 15 minutes
   - **Audience** — All Crew, Operators, Maintenance, Contractors, or Supervisors
   - **Work Context** — brief description of the current job or conditions on site
4. Click **Generate Talk**.

The AI produces a structured talk including:

- **Key Discussion Points** — the main safety messages to cover
- **Identified Hazards** — hazards relevant to the topic and context
- **Engagement Questions** — questions to ask the crew to check understanding

### Delivering and Recording the Talk

Once generated, click **Mark as Conducted** to record that the talk was delivered. The talk is saved with a timestamp and status of Completed.

### Recording a Manual Toolbox Talk

Select the **Manual Record** tab to log a talk that was conducted without AI generation. Enter the topic, date, and number of attendees.

### Talk History

All past talks are listed with the topic, date, status, and whether they were AI-generated or manually recorded. AI-generated talks show a sparkle icon; manual talks show a clipboard icon.

---

## 9. Safety Observations

The Observations module is for reporting what you see — unsafe acts, unsafe conditions, near misses, positive behaviours, environmental concerns, or security issues. All workers are encouraged to use it.

### Submitting an Observation

1. Click **Observations** in the sidebar.
2. Click **New Observation**.
3. Complete the form:
   - **Observation Type** — Unsafe Act, Unsafe Condition, Near Miss, Positive, Environmental, or Security
   - **Severity** — Low, Medium, High, or Critical
   - **Location** — where you observed it (e.g., "Pump Room B, Deck 3")
   - **Description** — describe what you saw in detail
   - **Submit anonymously** — tick this box if you do not want your name attached to the observation
4. Click **Submit Observation**.

### AI Recommendation

Immediately after submission, an AI-generated corrective action recommendation is attached to the observation. The recommendation is specific to the observation type and severity level. For example:

- A **Critical Unsafe Condition** triggers: *"STOP WORK — barricade the area immediately. Assign a safety watch until the condition is corrected. Notify HSE Advisor and raise a PTW for correction work."*
- A **Low Positive observation** triggers: *"Note in safety observation log. Share verbally with the crew as encouragement."*

These recommendations follow NEPL HSE standards.

### Managing Observations

All observations are listed with their type, severity, status (Open / Closed), and the AI recommendation. Supervisors and HSE personnel can click **Close** on any open observation once the corrective action has been completed.

### Filtering

Use the filter buttons across the top to view observations by type: All, Unsafe Act, Unsafe Condition, Near Miss, Positive, Environmental, or Security.

---

## 10. Incident Reports

The Incident module is for formally reporting and investigating incidents. It includes AI-powered 5-Why root cause analysis.

### Reporting an Incident

1. Click **Incidents** in the sidebar.
2. Click **Report Incident**.
3. Complete the form:
   - **Incident Title** — brief summary of what happened
   - **Incident Type** — Injury, Near Miss, Property Damage, Environmental, Security, or Process Safety
   - **Severity** — Low, Medium, High, or Critical
   - **Location** — where the incident occurred
   - **Incident Date & Time** — exact date and time
   - **Detailed Description** — describe what happened, the conditions at the time, and any immediate actions already taken
4. Click **Submit Report**.

### Running AI Root Cause Analysis

After an incident is reported, click the **Analyse** button on its card. The AI will conduct a 5-Why analysis and return:

- **5-Why chain** — five sequential why questions and their answers, tracing from the immediate cause back to the systemic root cause
- **Root Cause** — the underlying systemic failure (not individual blame)
- **Root Cause Code** — one of ten standard NEPL codes:

| Code | Category |
|---|---|
| RC-01 | Procedure Absent |
| RC-02 | Procedure Not Followed |
| RC-03 | Procedure Inadequate |
| RC-04 | Training Deficiency |
| RC-05 | Supervision Failure |
| RC-06 | Design / Engineering |
| RC-07 | Maintenance Failure |
| RC-08 | Communication Failure |
| RC-09 | Management System |
| RC-10 | Environmental |

- **Immediate Actions** — actions to take right now at the scene
- **Corrective Actions** — structured actions with priority, timeframe, and responsible owner
- **Investigation Level** — 1 (Supervisor-led), 2 (HSE Advisor-led), or 3 (HSE Manager + external)
- **Regulatory Notification** — if required (e.g., NUPRC notification for LTIs, NOSDRA for spills), a red banner shows the notification requirement and timeframe

### Incident Status

| Status | Meaning |
|---|---|
| **Open** | Reported, not yet investigated |
| **Investigating** | AI analysis complete, investigation underway |
| **Action Required** | Corrective actions assigned, not yet completed |
| **Closed** | Investigation complete, all actions closed |

---

## 11. Emergency Procedures

The Emergency Procedures section provides instant access to step-by-step response guides for all major emergency scenarios. It is designed to be usable under pressure.

### Emergency Contact Numbers

A red banner at the top of the page shows the primary emergency contact numbers at all times:
- **Emergency:** 999 / 112
- **Control Room, HSE Hotline, Medical, Security** — specific NEPL numbers

### Emergency Cards

Cards cover the following scenarios:

- Fire
- Gas Release / H2S
- Oil Spill
- Electrical Incident
- Marine Emergency
- Medical Emergency

Each card shows a colour-coded severity level and a short summary. Click a card to expand it and see:

- **Immediate Actions** — numbered, in priority order
- **Checklist** — specific items to verify
- **Escalation Contacts** — who to call

Click **View Full Details** for the complete procedure including muster points and required equipment.

> This section requires no login to use on mobile if your browser has cached the page. Keep the page bookmarked on your phone for offline access.

---

## 12. Knowledge Base

The Knowledge Base holds all approved NEPL HSE procedures, standards, and reference documents.

### Browsing Documents

Documents are organised by category, shown in the left sidebar:
- Confined Space
- Hot Work
- Working at Height
- Lifting Operations
- Electrical Safety
- H2S Safety
- Emergency Response
- Environmental
- Process Safety

Click a category to filter. The document count updates to show how many documents are in that category.

### Searching

Type a keyword or phrase in the search bar to search across all document titles, descriptions, and tags. Results update as you type.

### Document Cards

Each document shows:
- Document code (e.g., NEPL-CS-001)
- Title and brief description
- Document type (Procedure, SOP, Manual, Form, Checklist, Regulation)
- Version number
- Approval status
- Risk level badge
- Tags (e.g., "SIMOPS", "PTW", "H2S")

### Document Detail Panel

Click any document to open the detail panel on the right. This shows the full description, all metadata, and a **Download PDF** button.

> Documents marked **Emergency Critical** are shown with a red badge and always appear at the top of their category.

---

## 13. Learning & Competency

The Learning module provides access to HSE training content.

### Featured Modules

Three recommended modules are highlighted at the top:

1. **H2S Safety Awareness** — H2S properties, detection, PPE, and emergency response
2. **Confined Space Entry** — permit requirements, atmospheric testing, rescue procedures
3. **PTW System Overview** — NEPL PTW process from request to close-out

Each module shows its duration (in minutes), whether it is mandatory, and a **Start Module** button.

### All Modules

The full module library is shown below, loaded from the database. Each module shows:
- Module type: Video, Quiz, Document, or Simulation
- Category (e.g., "Process Safety", "Emergency Response")
- Duration

### Learning Progress

A progress summary shows how many modules you have Completed, have In Progress, and have Not Started. This tracks your personal competency record.

---

## 14. Analytics

The Analytics section gives HSE Managers and Auditors a data-driven view of HSE performance. Access is restricted to Admin, HSE Manager, and Auditor roles.

### Headline Metrics

Four metric cards show totals for:
- AI Conversations (all time)
- Total Observations (with Open count highlighted)
- Permits to Work (with Approved count)
- Incidents (with Active count)

### Charts

Two bar charts show observation distribution:
- **By Type** — how many observations of each type have been submitted
- **By Severity** — breakdown across Low, Medium, High, Critical

### Summary Metrics

Three additional figures at the bottom:
- **PTW Approvals** — total permits that have been approved
- **Governance Reviews Pending** — flagged AI responses awaiting review
- **Observation Close Rate** — percentage of submitted observations that have been closed (a leading indicator of corrective action follow-through)

---

## 15. Governance Review

The Governance module allows HSE Advisors, HSE Managers, and Auditors to review AI responses that have been flagged by users as potentially inaccurate or unsafe.

Access: **Admin, HSE Manager, HSE Advisor, Auditor**

### Review Queue

All flagged responses appear as cards. Each card shows:
- Priority badge (Urgent, High, Medium, Low)
- Current status (Pending, In Review, Approved, Rejected)
- Review type and reason for flagging
- Original flagged message content
- Timestamp

### Filtering

Filter by status using the tabs across the top: All, Pending, In Review, Approved, Rejected.

### Taking Action

- Click **Start Review** to move a card from Pending to In Review
- Click **Approve** if the AI response was correct
- Click **Reject** if the AI response was incorrect or unsafe

Rejected responses are logged and used to improve the system. The reviewer's ID and review timestamp are saved automatically.

---

## 16. Administration

The Administration panel is available to Admin role users only.

### User Management

The **Users** tab lists all registered user profiles with:
- Full name and avatar initials
- Employee ID
- Role badge (colour-coded)
- Department and Location
- Account status (Active / Inactive)

### System Information

The **System** tab shows:
- Platform version
- Organisation (NEPL)
- Database status
- AI backend status
- Compliance standard
- Current date

### Demo Data

The **Re-seed Demo Users** button recreates the six demo accounts. Use this during evaluation to reset demo data without affecting live user accounts.

---

## 17. AI Features Explained

### How the AI Gets Its Answers

When you ask a question in the Chat, the AI follows these steps:

1. **Embeds your question** — converts your question into a mathematical vector
2. **Searches the Knowledge Base** — finds the most relevant chunks of NEPL procedures using vector similarity
3. **Assembles context** — passes the retrieved text to the language model as background
4. **Generates the answer** — GPT-4o writes a response grounded in the retrieved documents and cites the source codes

This process is called **Retrieval-Augmented Generation (RAG)**. It means the AI only answers from documents that NEPL has approved — it does not make things up from general internet training data.

### When Azure OpenAI Is Not Configured

If the Azure OpenAI keys have not been set in the system, all AI features fall back to rich, pre-written NEPL-specific responses. These cover the most common HSE topics and are production-quality, but they are fixed and do not adapt to novel questions. The live RAG mode adapts to any question using your actual uploaded documents.

### AI Governance and Accountability

Every AI interaction is logged in the database with:
- User ID (or anonymous flag)
- Timestamp
- The exact question and response
- Any safety escalation flags triggered

Users can flag any response for review using the **Flag** button. Flagged items go into the Governance queue where qualified HSE personnel review and approve or reject them. This creates an auditable chain of accountability for all AI-generated safety guidance.

---

## 18. Frequently Asked Questions

**Q: Can I trust the AI's answers?**
A: The AI draws from NEPL-approved HSE procedures. Always verify critical guidance against the source procedure before acting. For life-critical decisions, consult your HSE Advisor.

**Q: What happens if I submit an observation anonymously?**
A: Your name is not stored with the observation. Your user account is not linked to the record. The HSE team sees the observation details but not who submitted it.

**Q: Can contractors use the platform?**
A: Yes. Contractors have access to the AI Assistant, Emergency Procedures, and Toolbox Talks. Access to operational modules (PTW, Risk Assessment, Incident Reports) is restricted to NEPL employees unless your Administrator grants additional access.

**Q: Are my conversations private?**
A: Conversations are stored in the NEPL database. They are accessible to Administrators and HSE Managers for audit and governance purposes. Treat the Chat as an internal business communication tool.

**Q: What if the AI gives wrong information?**
A: Click the **Flag** button on the response to send it to the Governance queue. An HSE Advisor or HSE Manager will review it. Your flag helps improve the system.

**Q: Can the platform be used offline?**
A: The Emergency Procedures page can be bookmarked on mobile and cached in the browser for offline access. Full offline capability (PWA mode with background sync) is planned for a future release.

**Q: How do I get an account?**
A: Contact your HSE Manager or System Administrator. Accounts are provisioned with a specific role based on your position.

**Q: Who do I contact for technical issues?**
A: Contact your System Administrator via the NEPL IT Service Desk. For HSE procedure questions, contact your HSE Advisor.

---

*This document is for internal use at NEPL. All HSE decisions must be taken by qualified personnel in accordance with NEPL procedures and applicable Nigerian regulations (NUPRC, NOSDRA, NSIB).*

*HSE OPS AI — Built on Supabase + Azure OpenAI | NEPL HSE Platform v1.0*
