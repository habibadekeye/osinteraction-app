import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  incidentId: string;
  title: string;
  description: string;
  incidentType: string;
  severity: string;
  location: string;
}

interface FiveWhy {
  why: string;
  answer: string;
}

interface CorrectiveAction {
  action: string;
  priority: "immediate" | "short_term" | "medium_term" | "long_term";
  timeframe: string;
  owner: string;
}

interface IncidentAnalysis {
  fiveWhys: FiveWhy[];
  rootCause: string;
  rootCauseCode: string;
  correctiveActions: CorrectiveAction[];
  immediateActions: string[];
  investigationLevel: number;
  regulatoryNotification: boolean;
  notificationTimeframe?: string;
}

// ============================================================
// MOCK ANALYSIS BY INCIDENT TYPE
// ============================================================
function buildMockAnalysis(req: AnalyzeRequest): IncidentAnalysis {
  const isSerious = req.severity === "critical" || req.severity === "high";

  const templates: Record<string, IncidentAnalysis> = {
    near_miss: {
      fiveWhys: [
        { why: "Why did the near miss occur?", answer: "Worker was in the line of fire during equipment operation" },
        { why: "Why was the worker in the line of fire?", answer: "Exclusion zone was not established before work started" },
        { why: "Why was the exclusion zone not established?", answer: "The pre-task JSA did not identify line-of-fire as a specific hazard for this step" },
        { why: "Why did the JSA not identify this hazard?", answer: "JSA was completed in the office without a physical site walkthrough" },
        { why: "Why was there no site walkthrough?", answer: "Time pressure led supervisor to shortcut the JSA process" },
      ],
      rootCause: "Supervision failure — pre-task risk assessment process was bypassed due to time pressure, resulting in hazard not being identified or controlled.",
      rootCauseCode: "RC-05",
      immediateActions: [
        "Brief all personnel in the area on the near miss immediately",
        "Stop similar operations until hazards are reassessed",
        "Notify HSE Advisor and log in NEPL incident register",
      ],
      correctiveActions: [
        { action: "Revise JSA template to include mandatory site walkthrough checklist sign-off", priority: "short_term", timeframe: "5 working days", owner: "HSE Advisor" },
        { action: "Supervisor refresher training on JSA quality and pressure management", priority: "medium_term", timeframe: "30 days", owner: "HSE Manager" },
        { action: "Implement random JSA quality audits (monthly, 20% of JSAs reviewed)", priority: "long_term", timeframe: "90 days", owner: "HSE Manager" },
      ],
      investigationLevel: 1,
      regulatoryNotification: false,
    },
    injury: {
      fiveWhys: [
        { why: "Why was the worker injured?", answer: `Injury occurred at ${req.location} during the work activity` },
        { why: "Why were the hazards not controlled?", answer: "Control measures in the permit were not fully implemented at the time of injury" },
        { why: "Why were the permit controls not implemented?", answer: "Permit was reviewed in the office, not verified on site before work started" },
        { why: "Why was site verification not carried out?", answer: "Area Authority signed the permit remotely without visiting the work site" },
        { why: "Why was remote sign-off permitted?", answer: "No procedure explicitly prohibiting remote PTW sign-off for high-risk tasks" },
      ],
      rootCause: "Procedure inadequate — the Permit to Work procedure does not mandate physical site verification by Area Authority for high-risk activities.",
      rootCauseCode: "RC-03",
      immediateActions: [
        "Secure the scene — no work to resume until investigation complete",
        "Provide first aid and call platform medic immediately",
        "Notify OIM, HSE Manager, and line manager within 2 hours",
        "Preserve all evidence: take photographs, do not move equipment",
      ],
      correctiveActions: [
        { action: "Amend PTW procedure: mandatory physical site visit by Area Authority for all high/critical risk permits", priority: "immediate", timeframe: "Same day", owner: "HSE Manager" },
        { action: "Suspend remote PTW sign-off practice with immediate effect — issue management directive", priority: "immediate", timeframe: "Same day", owner: "OIM" },
        { action: "Conduct PTW compliance audit across all active permits on facility", priority: "short_term", timeframe: "5 working days", owner: "HSE Advisor" },
        { action: "Revise Area Authority competency assessment to include site verification requirements", priority: "medium_term", timeframe: "30 days", owner: "HSE Manager" },
      ],
      investigationLevel: isSerious ? 2 : 1,
      regulatoryNotification: isSerious,
      notificationTimeframe: isSerious ? "NUPRC notification required within 48 hours for LTI" : undefined,
    },
    property_damage: {
      fiveWhys: [
        { why: "Why was equipment damaged?", answer: "Equipment was struck during a lifting/moving operation" },
        { why: "Why did the equipment get struck?", answer: "Exclusion zone around moving loads was inadequate for the swing radius" },
        { why: "Why was the exclusion zone inadequate?", answer: "Lift plan did not account for the full crane slew radius and load swing" },
        { why: "Why did the lift plan not include this?", answer: "Lift study was performed without input from the crane operator" },
        { why: "Why was the crane operator not consulted?", answer: "Lift planning process does not require crane operator sign-off on complex lifts" },
      ],
      rootCause: "Procedure inadequate — lift planning procedure does not mandate crane operator input for complex lifts, leading to underestimated exclusion zones.",
      rootCauseCode: "RC-03",
      immediateActions: [
        "Stop all lifting operations until exclusion zones are reassessed",
        "Assess damaged equipment for fitness to continue service",
        "Notify Asset Integrity team for inspection",
      ],
      correctiveActions: [
        { action: "Revise Lifting Operations Standard to require crane operator sign-off on all complex lift plans", priority: "short_term", timeframe: "5 working days", owner: "CP Rigger/Supervisor" },
        { action: "Calculate minimum exclusion zones for all active crane positions on facility", priority: "short_term", timeframe: "5 working days", owner: "Lifting Supervisor" },
        { action: "Inspect all recent lifts in the affected area for potential hidden damage", priority: "immediate", timeframe: "Same day", owner: "Asset Integrity" },
      ],
      investigationLevel: 1,
      regulatoryNotification: false,
    },
    environmental: {
      fiveWhys: [
        { why: "Why did the environmental incident occur?", answer: "Hydrocarbons/chemicals were released to the environment" },
        { why: "Why did the release reach the environment?", answer: "Secondary containment (drip tray / bund) was not in place or was full" },
        { why: "Why was secondary containment not in place?", answer: "Pre-task inspection did not include secondary containment verification" },
        { why: "Why was secondary containment not on the inspection checklist?", answer: "Environmental checklist was generic and not tailored to this type of operation" },
        { why: "Why is the checklist not tailored?", answer: "Environmental procedure was last reviewed 4 years ago and does not reflect current operations" },
      ],
      rootCause: "Management system failure — environmental procedures are outdated and do not include current operational requirements for secondary containment.",
      rootCauseCode: "RC-09",
      immediateActions: [
        "Stop the source of release immediately",
        "Deploy spill containment kit — prevent spread to drains and open water",
        "Notify OIM and Environmental Manager immediately",
        "Notify NOSDRA within 24 hours as required by regulation",
      ],
      correctiveActions: [
        { action: "Review and update all environmental procedures to align with current operations", priority: "medium_term", timeframe: "30 days", owner: "Environmental Manager" },
        { action: "Add secondary containment verification to all pre-task inspection checklists", priority: "short_term", timeframe: "5 working days", owner: "HSE Advisor" },
        { action: "Conduct environmental awareness refresher for all operators handling chemicals/hydrocarbons", priority: "medium_term", timeframe: "30 days", owner: "HSE Manager" },
      ],
      investigationLevel: isSerious ? 2 : 1,
      regulatoryNotification: true,
      notificationTimeframe: "NOSDRA notification required within 24 hours of any spill",
    },
    process_safety: {
      fiveWhys: [
        { why: "Why did the process safety event occur?", answer: "Loss of primary containment from process equipment" },
        { why: "Why did containment fail?", answer: "A critical safety barrier (valve/seal/gasket) failed during operation" },
        { why: "Why did the barrier fail?", answer: "The barrier was beyond its service life and had not been replaced at last maintenance window" },
        { why: "Why was it not replaced?", answer: "Maintenance backlog — item was deferred due to production pressure" },
        { why: "Why was a safety-critical barrier deferred?", answer: "Deferral process did not distinguish between safety-critical and non-safety-critical items" },
      ],
      rootCause: "Management system failure — the maintenance deferral process does not classify safety-critical barriers separately, allowing them to be deferred under production pressure.",
      rootCauseCode: "RC-09",
      immediateActions: [
        "Activate emergency shutdown (ESD) if required",
        "Isolate affected process system and depressurise",
        "Muster all personnel and account for all on facility",
        "Notify OIM, HSE Manager, and NUPRC immediately",
      ],
      correctiveActions: [
        { action: "Immediate audit of all deferred maintenance items — identify and escalate any safety-critical barriers", priority: "immediate", timeframe: "24 hours", owner: "Asset Integrity" },
        { action: "Revise maintenance deferral procedure to classify safety-critical barriers as non-deferrable", priority: "short_term", timeframe: "5 working days", owner: "Maintenance Manager" },
        { action: "Implement risk-based maintenance prioritisation process with HSE sign-off for all deferrals", priority: "medium_term", timeframe: "30 days", owner: "HSE Manager" },
        { action: "Conduct full barrier management review for all safety-critical systems", priority: "long_term", timeframe: "90 days", owner: "Process Safety Manager" },
      ],
      investigationLevel: 3,
      regulatoryNotification: true,
      notificationTimeframe: "NUPRC immediate notification required for Tier 1/2 Process Safety Events",
    },
  };

  return templates[req.incidentType] ?? templates["near_miss"];
}

// ============================================================
// AZURE OPENAI ANALYSIS
// ============================================================
async function buildAIAnalysis(
  req: AnalyzeRequest,
  azureKey: string,
  endpoint: string,
  deployment: string
): Promise<IncidentAnalysis> {
  const prompt = `You are a NEPL HSE incident investigation expert. Conduct a 5-Why root cause analysis for the following incident.

INCIDENT TITLE: ${req.title}
TYPE: ${req.incidentType}
SEVERITY: ${req.severity}
LOCATION: ${req.location}
DESCRIPTION: ${req.description}

Return a JSON object with:
{
  "fiveWhys": [{"why": "string", "answer": "string"}, ...] — exactly 5 entries,
  "rootCause": "string — the systemic root cause (not individual blame)",
  "rootCauseCode": "string — one of: RC-01 through RC-10",
  "immediateActions": ["string", ...] — 3-4 actions to take right now,
  "correctiveActions": [
    {"action": "string", "priority": "immediate|short_term|medium_term|long_term", "timeframe": "string", "owner": "string — job role"}
  ],
  "investigationLevel": number (1, 2, or 3),
  "regulatoryNotification": boolean,
  "notificationTimeframe": "string or null"
}

Root cause codes: RC-01 Procedure Absent, RC-02 Procedure Not Followed, RC-03 Procedure Inadequate, RC-04 Training Deficiency, RC-05 Supervision Failure, RC-06 Design/Engineering, RC-07 Maintenance Failure, RC-08 Communication Failure, RC-09 Management System, RC-10 Environmental.

Investigation levels: 1=supervisor led (near miss/first aid), 2=HSE Advisor led (LTI/recordable), 3=HSE Manager+external (serious/fatality).`;

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Azure OpenAI error: ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return JSON.parse(data.choices[0].message.content) as IncidentAnalysis;
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
    if (!authHeader) return respond({ success: false, error: { code: "UNAUTHORIZED" } }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return respond({ success: false, error: { code: "UNAUTHORIZED" } }, 401);

    const body = await req.json() as AnalyzeRequest;
    if (!body.incidentId || !body.description) {
      return respond({ success: false, error: { code: "VALIDATION_ERROR", message: "incidentId and description required" } }, 400);
    }

    const azureKey = Deno.env.get("AZURE_OPENAI_KEY");
    const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const deployment = Deno.env.get("AZURE_CHAT_DEPLOYMENT") ?? "gpt-4o";

    let analysis: IncidentAnalysis;
    if (azureKey && azureEndpoint) {
      try {
        analysis = await buildAIAnalysis(body, azureKey, azureEndpoint, deployment);
      } catch (err) {
        console.error("Azure OpenAI failed, using mock:", err);
        analysis = buildMockAnalysis(body);
      }
    } else {
      analysis = buildMockAnalysis(body);
    }

    // Save analysis back to incident record
    const { error: updateErr } = await supabase.from("incident_reports").update({
      ai_analysis: analysis,
      five_whys: analysis.fiveWhys,
      corrective_actions: analysis.correctiveActions,
      status: "investigating",
      updated_at: new Date().toISOString(),
    }).eq("id", body.incidentId);

    if (updateErr) {
      console.error("Failed to update incident:", updateErr.message);
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "incident_investigated",
      metadata: { incident_id: body.incidentId, severity: body.severity },
    }).then(() => {});

    return respond({ success: true, data: analysis });
  } catch (err) {
    console.error("analyze-incident error:", err);
    return respond({ success: false, error: { code: "INTERNAL_ERROR", message: "Unexpected error" } }, 500);
  }
});
