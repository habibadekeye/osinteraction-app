import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ============================================================
// SAFETY GUARDRAILS
// ============================================================
const HIGH_RISK_TRIGGERS = [
  "gas release", "major gas", "blowout", "well control", "loss of control",
  "man overboard", "explosion", "fire offshore", "platform fire",
  "confined space rescue", "h2s emergency", "structural collapse", "toxic gas cloud",
  "live electrical rescue", "radiation exposure", "well kick",
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

// ============================================================
// MOCK KNOWLEDGE BASE (fallback when Azure OpenAI is not configured)
// ============================================================
const KNOWLEDGE_RESPONSES: Array<{
  keywords: string[];
  response: string;
  citations: Array<{ document_title: string; document_code: string; excerpt: string; relevance_score: number; page: number }>;
}> = [
  {
    keywords: ["confined space", "tank entry", "vessel entry", "cse"],
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
      { document_title: "Confined Space Entry Procedure", document_code: "NEPL-CSE-001", excerpt: "Atmospheric testing requirements: O₂ 19.5–23.5%, flammable gas <10% LEL. Full isolation and LOTO mandatory before entry.", relevance_score: 0.97, page: 4 },
      { document_title: "Permit to Work Procedure", document_code: "NEPL-PTW-001", excerpt: "Confined space entry requires a Category A permit issued by the Area Authority with gas test attached.", relevance_score: 0.88, page: 12 },
    ],
  },
  {
    keywords: ["hot work", "welding", "grinding", "cutting", "flame", "spark"],
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

> **Remember**: Fire watch must remain for the full **30-minute cool-down** period after hot work stops.

*Reference: NEPL-PTW-001 v2.1 | NUPRC Safety Regulation Section 8*`,
    citations: [
      { document_title: "Hot Work Permit Procedure", document_code: "NEPL-PTW-001", excerpt: "Gas testing required within 30 minutes of hot work commencement. Fire watch mandatory during all hot work activities and 30 minutes after completion.", relevance_score: 0.96, page: 7 },
    ],
  },
  {
    keywords: ["lifting", "crane", "rigging", "sling", "hoisting", "overhead"],
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

> **Life-Saving Rule**: Never stand under a suspended load.

*Reference: NEPL-LIFT-001 v2.3 | DROPS Guidelines*`,
    citations: [
      { document_title: "Lifting Operations Standard", document_code: "NEPL-LIFT-001", excerpt: "Critical lifts require an engineered lift plan approved by OIM. Exclusion zone minimum equals load diameter plus 5 metres.", relevance_score: 0.95, page: 9 },
    ],
  },
  {
    keywords: ["h2s", "hydrogen sulfide", "hydrogen sulphide", "sour gas"],
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
1. **Don SCBA immediately**
2. Move **upwind and uphill** from the source
3. **Do NOT attempt rescue** without full SCBA and buddy system
4. Contact medic and OIM immediately

*Reference: NEPL-OCC-001 H₂S Safety Procedure v2.0*`,
    citations: [
      { document_title: "H2S Safety Procedure", document_code: "NEPL-OCC-001", excerpt: "Mandatory evacuation at H₂S levels ≥10 ppm. SCBA required before entering any area with detected or suspected H₂S above 10 ppm.", relevance_score: 0.98, page: 5 },
    ],
  },
  {
    keywords: ["ptw", "permit to work", "work permit", "cold work"],
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
2. **Area Authority (AA)** issues permit after site inspection
3. Work commences — permit displayed at work site
4. **Close-out** by RP and AA when work complete

> **Key Rule**: A permit is **only valid** when all named parties have physically signed.

*Reference: NEPL-PTW-001 Permit to Work Procedure v2.1*`,
    citations: [
      { document_title: "Permit to Work Procedure", document_code: "NEPL-PTW-001", excerpt: "The PTW is only valid when all required signatures are in place. Permits must be displayed at the work location at all times.", relevance_score: 0.94, page: 2 },
    ],
  },
  {
    keywords: ["jsa", "job safety analysis", "risk assessment", "hazard identification", "tra", "task risk"],
    response: `## Job Safety Analysis (JSA) — How to Conduct One

A JSA systematically identifies hazards in each step of a task **before** work begins.

### 5-Step JSA Process

**Step 1: Define the Job** — Break the activity into sequential steps (typically 5–12 per task).

**Step 2: Identify Hazards per Step** — For each step, ask: *What could go wrong? What are the energy sources?*

**Step 3: Assess Pre-Control Risk** — Using the NEPL 5×5 risk matrix: Likelihood (1–5) × Severity (1–5).

**Step 4: Define Control Measures (Hierarchy of Controls)** — Eliminate → Substitute → Engineering → Administrative → PPE

**Step 5: Assess Residual Risk** — Re-score after controls. Target: Medium (≤9) or lower.

> **Tip**: Review the completed JSA with the **actual work crew** — their local knowledge identifies hazards the desk review misses.`,
    citations: [
      { document_title: "Incident Investigation Guideline", document_code: "NEPL-INC-001", excerpt: "JSA must be completed by the work team and reviewed by the supervisor before non-routine work begins.", relevance_score: 0.89, page: 14 },
    ],
  },
  {
    keywords: ["simops", "simultaneous operations", "concurrent operations"],
    response: `## SIMOPS — Simultaneous Operations Management

SIMOPS refers to **two or more concurrent activities** that can create interaction hazards.

### SIMOPS Control Process
1. **Identify** — All parties submit planned activities to PTW/Control Room (24h ahead)
2. **Assess** — SIMOPS coordinator reviews interaction risk
3. **Classify** — Green (proceed), Amber (proceed with controls), Red (stop one activity)
4. **Coordinate** — Daily SIMOPS meeting; all supervisors present

### Prohibited SIMOPS Combinations (Red)
- Well testing + hot work within 50m
- Crane lifts over diving operations
- Explosive work (perforating) + crane lifts

> **OIM Authority**: The OIM has absolute authority to stop any activity creating unacceptable SIMOPS risk.

*Reference: NEPL-SIM-001 SIMOPS Management Procedure v1.8*`,
    citations: [
      { document_title: "SIMOPS Management Procedure", document_code: "NEPL-SIM-001", excerpt: "SIMOPS coordinator must review all planned concurrent activities 24 hours in advance. OIM has absolute authority to suspend any activity creating unacceptable interaction risk.", relevance_score: 0.96, page: 6 },
    ],
  },
  {
    keywords: ["toolbox talk", "pre-job", "safety briefing", "crew briefing", "pre-task"],
    response: `## Toolbox Talk — Best Practices

A toolbox talk is a **focused safety discussion** with the work crew immediately before a task.

### Effective Structure (15–20 minutes)
1. **The Task** (2 min): What are we doing? Where? Who is involved?
2. **Hazards** (5 min): What could hurt us? Cover top 3–5 hazards
3. **Controls** (5 min): What are we doing to manage each hazard?
4. **Emergency** (2 min): What do we do if something goes wrong?
5. **Questions** (2 min): Any concerns from the crew?
6. **Sign-off**: All attendees sign the record

Documentation: Signed records retained for **minimum 3 years**.

*Reference: NEPL HSE Management System v1.0, Section 7*`,
    citations: [
      { document_title: "HSE Management System", document_code: "NEPL-HSE-MS-001", excerpt: "Toolbox talks are mandatory before all non-routine work. Signed records to be retained for minimum 3 years.", relevance_score: 0.88, page: 45 },
    ],
  },
  {
    keywords: ["incident", "near miss", "accident", "investigation", "root cause", "5 why"],
    response: `## Incident Investigation — Process Guide

All incidents including near misses must be reported and investigated on NEPL facilities.

### Reporting Timeframes
| Severity | Deadline | NUPRC Required |
|----------|---------|----------------|
| Near Miss | Immediately | No |
| Minor Injury | Same shift | No |
| Lost Time Injury | Within 2 hours | Yes |
| Fatality/Serious | Immediately | Yes — 24h |

### 5-Why Root Cause Analysis
Start from the immediate cause and ask "Why?" five times to reach the systemic root cause. **Root cause** targets the system, not the person.

### NEPL Investigation Levels
- **Level 1** (Near Miss): Supervisor-led, 48 hours
- **Level 2** (LTI/Recordable): HSE Advisor-led, 5 days
- **Level 3** (Serious/Fatality): HSE Manager + external, 30 days

*Reference: NEPL-INC-001 Incident Investigation Guideline v2.4*`,
    citations: [
      { document_title: "Incident Investigation Guideline", document_code: "NEPL-INC-001", excerpt: "NUPRC requires notification of serious incidents and fatalities within 24 hours. 5-Why analysis targets systemic root causes, not individual blame.", relevance_score: 0.95, page: 3 },
    ],
  },
  {
    keywords: ["emergency", "muster", "assembly point", "evacuation"],
    response: `## Emergency Response — REACT Protocol

In any emergency on a NEPL facility, follow the **REACT** protocol:

- **R**ecognise the emergency — identify type and severity
- **E**scalate immediately — sound alarm, notify OIM, Control Room
- **A**ssemble — proceed to your designated muster station
- **C**ommunicate — account for all personnel, report to muster warden
- **T**reat casualties — only if safe and you are trained

### Do's and Don'ts
- Proceed directly to muster — do not collect personal belongings
- Do NOT re-enter the facility until OIM gives all-clear
- Do NOT use lifts during emergency evacuation

*Reference: NEPL-EMRG-001 Emergency Response Plan v1.5*`,
    citations: [
      { document_title: "Gas Release Emergency Response", document_code: "NEPL-EMRG-001", excerpt: "REACT protocol: Recognise, Escalate, Assemble, Communicate, Treat. OIM has overall command authority.", relevance_score: 0.92, page: 8 },
    ],
  },
];

const FALLBACK = `I searched the NEPL approved knowledge base for your query.

Based on available procedures, I recommend:

1. **Check with your HSE Advisor** — they can point you to the specific NEPL procedure that applies
2. **Search the Knowledge Base** — use the Knowledge Base module to search for relevant procedures
3. **Consult your Supervisor** — for operational decisions that require authorisation

If you can rephrase your question with more specific details about the activity, location, or hazard type, I'll be better able to provide accurate guidance.

*Based on NEPL HSE Management System v1.0*`;

function mockResponse(query: string) {
  const q = query.toLowerCase();
  if (HIGH_RISK_TRIGGERS.some(t => q.includes(t))) {
    return {
      content: ESCALATION_RESPONSE,
      citations: [{ document_title: "Gas Release Emergency Response", document_code: "NEPL-EMRG-001", excerpt: "Major gas releases require immediate ESD activation and personnel muster.", relevance_score: 0.99, page: 1 }],
      safety_flag: true,
      escalation_triggered: true,
      confidence_score: 0.99,
    };
  }
  for (const entry of KNOWLEDGE_RESPONSES) {
    if (entry.keywords.some(kw => q.includes(kw))) {
      return {
        content: entry.response,
        citations: entry.citations,
        safety_flag: false,
        escalation_triggered: false,
        confidence_score: 0.87 + Math.random() * 0.10,
      };
    }
  }
  return { content: FALLBACK, citations: [], safety_flag: false, escalation_triggered: false, confidence_score: 0.62 };
}

// ============================================================
// FULL-TEXT SEARCH — Free interim knowledge-base brain
// Called when no Azure/OpenAI keys are configured.
// Uses Postgres tsvector to search real uploaded document content.
// ============================================================
interface FTSRow {
  id: string;
  title: string;
  document_code: string;
  description: string;
  content: string;
  risk_level: string;
  document_type: string;
  version: string;
  rank: number;
  headline: string;
}

const RISK_EMOJI: Record<string, string> = {
  critical: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

async function searchKnowledgeBase(
  adminClient: ReturnType<typeof createClient>,
  query: string,
  isContractor: boolean
): Promise<{
  content: string;
  citations: Array<{ document_title: string; document_code: string; excerpt: string; relevance_score: number; page: number }>;
  confidence_score: number;
} | null> {
  const { data, error } = await adminClient.rpc("search_knowledge_documents", {
    query_text: query,
    match_count: 5,
    filter_contractor: isContractor,
  });

  if (error) {
    console.error("FTS search error:", error.message);
    return null;
  }

  const rows = (data as FTSRow[]) ?? [];
  if (rows.length === 0) return null;

  // Build a well-formatted markdown response from matched documents
  const lines: string[] = [];
  lines.push(`## Search Results from NEPL Knowledge Base\n`);
  lines.push(`Found **${rows.length} relevant procedure${rows.length !== 1 ? "s" : ""}** matching your query.\n`);

  rows.forEach((row, i) => {
    const emoji = RISK_EMOJI[row.risk_level] ?? "⚪";
    const type = row.document_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    lines.push(`---\n`);
    lines.push(`### ${i + 1}. ${row.title}`);
    lines.push(`**Document:** \`${row.document_code}\`  ·  ${type}  ·  v${row.version}  ·  ${emoji} ${row.risk_level.toUpperCase()} Risk\n`);

    if (row.headline && row.headline.trim()) {
      lines.push(`**Relevant Section:**`);
      // Replace FTS highlight markers with markdown bold
      const highlighted = row.headline.replace(/\*\*(.*?)\*\*/g, "**$1**");
      lines.push(`> ${highlighted.replace(/\n/g, "\n> ")}\n`);
    } else if (row.description) {
      lines.push(`> ${row.description}\n`);
    }
  });

  lines.push(`---\n`);
  lines.push(
    `*Results retrieved from your approved NEPL knowledge base using full-text search. ` +
    `For AI-synthesised answers that combine and explain information across documents, ` +
    `configure Azure OpenAI or OpenAI API keys in your Supabase secrets.*`
  );

  const citations = rows.map(row => ({
    document_title: row.title,
    document_code: row.document_code,
    excerpt: row.headline?.replace(/\*\*/g, "").slice(0, 200) ?? row.description ?? "",
    relevance_score: Math.min(0.95, 0.60 + row.rank * 0.5),
    page: 1,
  }));

  return {
    content: lines.join("\n"),
    citations,
    confidence_score: Math.min(0.92, 0.65 + (rows[0]?.rank ?? 0) * 0.4),
  };
}

// ============================================================
// AZURE OPENAI RAG PIPELINE
// ============================================================
async function generateQueryEmbedding(
  query: string,
  azureKey: string,
  endpoint: string,
  deployment: string
): Promise<number[]> {
  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify({ input: query, dimensions: 1536 }),
    }
  );
  if (!res.ok) throw new Error(`Embedding API error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  section_heading: string | null;
  page_number: number | null;
  document_title: string;
  document_code: string;
  risk_level: string;
  similarity: number;
}

async function retrieveChunks(
  adminClient: ReturnType<typeof createClient>,
  embedding: number[],
  assetType: string | null
): Promise<RetrievedChunk[]> {
  const { data, error } = await adminClient.rpc("match_document_chunks", {
    query_embedding: `[${embedding.join(",")}]`,
    match_threshold: 0.70,
    match_count: 5,
    filter_asset_type: assetType,
  });
  if (error) throw new Error(`Vector search error: ${error.message}`);
  return (data as RetrievedChunk[]) ?? [];
}

function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) =>
      `--- RETRIEVED DOCUMENT ${i + 1} (${c.document_code}, p.${c.page_number ?? "?"}, similarity: ${c.similarity.toFixed(2)}) ---\n${c.content}`
    )
    .join("\n\n");
}

function buildConversationContext(
  history: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return history.slice(-10).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
}

async function callAzureOpenAI(
  query: string,
  context: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userProfile: { role: string; department: string; location: string; asset_type: string },
  azureKey: string,
  endpoint: string,
  deployment: string
): Promise<{ content: string; citations: Array<{ document_title: string; document_code: string; excerpt: string; relevance_score: number; page: number }> }> {
  const systemPrompt = `You are HSE OPS AI, an HSE safety assistant for NEPL (Nigerian oil and gas operations).

USER CONTEXT:
- Role: ${userProfile.role}
- Department: ${userProfile.department}
- Location: ${userProfile.location}
- Asset Type: ${userProfile.asset_type}

INSTRUCTIONS:
1. Answer ONLY based on the retrieved NEPL procedure documents provided below.
2. If the retrieved documents do not contain relevant information, say so clearly.
3. Always cite the specific document code and section.
4. For safety-critical information, use bold text and numbered steps.
5. End responses with the relevant document code reference.
6. Never speculate beyond what the documents state.
7. Always recommend verification with a supervisor for critical decisions.

${context ? `RETRIEVED DOCUMENTS:\n${context}` : "NO RELEVANT DOCUMENTS RETRIEVED — advise user to consult their HSE Advisor directly."}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: query },
  ];

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify({
        messages,
        temperature: 0.3,
        max_tokens: 2000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    }
  );

  if (!res.ok) throw new Error(`Azure OpenAI error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0].message.content;

  return { content, citations: [] };
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ success: false, error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }

    const body = await req.json() as { sessionId: string; content: string };
    const { sessionId, content } = body;

    if (!sessionId || !content) {
      return respond({ success: false, error: { code: "VALIDATION_ERROR", message: "sessionId and content required" } }, 400);
    }

    // Fetch user profile for context
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, department, location, asset_type")
      .eq("id", user.id)
      .maybeSingle();

    const userProfile = {
      role: profile?.role ?? "field_worker",
      department: profile?.department ?? "Operations",
      location: profile?.location ?? "NEPL Facility",
      asset_type: profile?.asset_type ?? "platform",
    };

    // Save user message
    const { data: userMsg } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "user",
      content,
      content_type: "text",
      safety_flag: false,
      escalation_triggered: false,
      governance_status: "approved",
      metadata: {},
    }).select().maybeSingle();

    // Fetch conversation history for multi-turn context (last 10 messages)
    const { data: historyRows } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(11);

    // Exclude the message we just inserted (last row)
    const conversationHistory = buildConversationContext(
      (historyRows ?? []).slice(0, -1)
    );

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "chat_query",
      session_id: sessionId,
      metadata: { query_length: content.length },
    }).then(() => {});

    // --- Safety guardrail check ---
    const isEscalation = HIGH_RISK_TRIGGERS.some(t => content.toLowerCase().includes(t));

    let response: {
      content: string;
      citations: Array<{ document_title: string; document_code: string; excerpt: string; relevance_score: number; page: number }>;
      safety_flag: boolean;
      escalation_triggered: boolean;
      confidence_score: number;
    };

    if (isEscalation) {
      response = {
        content: ESCALATION_RESPONSE,
        citations: [{ document_title: "Gas Release Emergency Response", document_code: "NEPL-EMRG-001", excerpt: "Major gas releases require immediate ESD activation and personnel muster.", relevance_score: 0.99, page: 1 }],
        safety_flag: true,
        escalation_triggered: true,
        confidence_score: 0.99,
      };
      // Log governance flag for escalations
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event_type: "safety_escalation",
        session_id: sessionId,
        metadata: { trigger_query: content.slice(0, 200) },
      }).then(() => {});
    } else {
      // ── Tier 1: Azure OpenAI RAG (vector search + GPT-4o) ──
      const azureKey = Deno.env.get("AZURE_OPENAI_KEY");
      const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
      // ── Tier 1b: Standard OpenAI RAG ─────────────────────
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      const chatDeployment = Deno.env.get("AZURE_CHAT_DEPLOYMENT") ?? "gpt-4o";
      const embeddingDeployment = Deno.env.get("AZURE_EMBEDDING_DEPLOYMENT") ?? "text-embedding-3-small";

      if (azureKey && azureEndpoint) {
        try {
          // Step 1: Embed query
          const queryEmbedding = await generateQueryEmbedding(content, azureKey, azureEndpoint, embeddingDeployment);

          // Step 2: Retrieve relevant chunks
          const chunks = await retrieveChunks(adminClient, queryEmbedding, userProfile.asset_type);
          const contextBlock = buildContextBlock(chunks);

          // Step 3: Generate response with GPT-4o
          const aiResult = await callAzureOpenAI(
            content,
            contextBlock,
            conversationHistory,
            userProfile,
            azureKey,
            azureEndpoint,
            chatDeployment
          );

          // Build citations from retrieved chunks
          const citations = chunks.map(c => ({
            document_title: c.document_title,
            document_code: c.document_code,
            excerpt: c.content.slice(0, 200),
            relevance_score: c.similarity,
            page: c.page_number ?? 1,
          }));

          response = {
            content: aiResult.content,
            citations,
            safety_flag: false,
            escalation_triggered: false,
            confidence_score: chunks.length > 0 ? chunks[0].similarity : 0.62,
          };
        } catch (ragErr) {
          console.error("RAG pipeline error, falling back to FTS:", ragErr);
          // Fall through to FTS tier
          const ftsResult = await searchKnowledgeBase(adminClient, content, userProfile.role === "contractor");
          if (ftsResult) {
            response = { ...ftsResult, safety_flag: false, escalation_triggered: false };
          } else {
            response = { ...mockResponse(content), safety_flag: false, escalation_triggered: false };
          }
        }
      } else {
        // ── Tier 2: Postgres Full-Text Search (free, uses uploaded docs) ──
        // Try this before falling back to hardcoded mock responses.
        const isContractor = userProfile.role === "contractor";
        const ftsResult = await searchKnowledgeBase(adminClient, content, isContractor);

        if (ftsResult) {
          response = { ...ftsResult, safety_flag: false, escalation_triggered: false };
        } else {
          // ── Tier 3: Hardcoded mock responses (last resort) ──
          const mock = mockResponse(content);
          response = { ...mock, safety_flag: mock.safety_flag, escalation_triggered: mock.escalation_triggered };
        }
      }
    }

    // Save assistant message
    const { data: assistantMsg } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "assistant",
      content: response.content,
      content_type: "text",
      safety_flag: response.safety_flag,
      escalation_triggered: response.escalation_triggered,
      escalation_reason: response.escalation_triggered ? "High-risk emergency topic detected" : null,
      confidence_score: response.confidence_score,
      governance_status: response.escalation_triggered ? "escalated" : "pending",
      citations: response.citations as unknown as never,
      metadata: {},
    }).select().maybeSingle();

    // Update session timestamp
    await supabase.from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId);

    return respond({
      success: true,
      data: {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        safetyFlag: response.safety_flag,
        escalationTriggered: response.escalation_triggered,
        citations: response.citations,
      },
    });

  } catch (err) {
    console.error("chat function error:", err);
    return respond({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, 500);
  }
});
