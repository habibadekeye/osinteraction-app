import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRARequest {
  title: string;
  activityDescription: string;
  location: string;
  workType: string;
  assessmentType?: "JSA" | "TRA";
  crewExperience?: string;
}

interface JSAStep {
  step_number: number;
  activity_step: string;
  hazards: string[];
  risk_before_likelihood: number;
  risk_before_severity: number;
  risk_before_rating: string;
  control_measures: string[];
  risk_after_likelihood: number;
  risk_after_severity: number;
  risk_after_rating: string;
  responsible_person: string;
}

const RISK_MATRIX: Record<string, string> = {
  "1-1": "low", "1-2": "low", "1-3": "low", "1-4": "low", "1-5": "medium",
  "2-1": "low", "2-2": "low", "2-3": "medium", "2-4": "medium", "2-5": "high",
  "3-1": "low", "3-2": "medium", "3-3": "medium", "3-4": "high", "3-5": "high",
  "4-1": "low", "4-2": "medium", "4-3": "high", "4-4": "high", "4-5": "critical",
  "5-1": "medium", "5-2": "high", "5-3": "high", "5-4": "critical", "5-5": "critical",
};

function riskRating(l: number, s: number): string {
  return RISK_MATRIX[`${l}-${s}`] ?? "medium";
}

// ============================================================
// MOCK STEP TEMPLATES BY WORK TYPE
// ============================================================
function buildMockSteps(req: GenerateRARequest): JSAStep[] {
  const loc = req.location || "work site";

  const templates: Record<string, JSAStep[]> = {
    hot_work: [
      { step_number: 1, activity_step: "Prepare work area and obtain Hot Work Permit", hazards: ["Accumulation of flammable vapours", "Inadequate isolation of fuel sources", "Missing permit signatories"], risk_before_likelihood: 3, risk_before_severity: 4, risk_before_rating: "high", control_measures: ["Obtain signed Hot Work Permit (NEPL-PTW-001)", "Gas test area: <10% LEL confirmed by CP", "Remove or shield all combustibles within 10m radius"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "Area Authority" },
      { step_number: 2, activity_step: "Atmospheric testing and verification", hazards: ["H₂S above 1 ppm", "Oxygen deficiency (<19.5%)", "Flammable gas above 10% LEL"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Multi-gas detector calibrated and certified within 6 months", "Test within 30 minutes of work start", "Retest if work suspended >1 hour"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "HSE Advisor" },
      { step_number: 3, activity_step: `Execute hot work at ${loc}`, hazards: ["Fire ignition from hot sparks", "Burns to operator", "Heat stress in confined work area"], risk_before_likelihood: 3, risk_before_severity: 3, risk_before_rating: "medium", control_measures: ["Fire watch positioned with charged extinguisher", "Welding screen erected to contain sparks", "FR coveralls, face shield, leather gloves worn", "Regular breaks for operator in hot conditions"], risk_after_likelihood: 1, risk_after_severity: 3, risk_after_rating: "low", responsible_person: "Supervisor" },
      { step_number: 4, activity_step: "Cool-down period and fire watch", hazards: ["Delayed ignition of hot surfaces", "Fire watch abandoning post early", "Smouldering materials causing fire"], risk_before_likelihood: 2, risk_before_severity: 4, risk_before_rating: "medium", control_measures: ["Maintain fire watch for minimum 30 minutes after hot work stops", "Check all surfaces and adjacent areas for heat retention", "No combustible materials left in work area"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "Fire Watch" },
      { step_number: 5, activity_step: "Close-out permit and final site inspection", hazards: ["Permit not formally closed", "Tools or PPE left at work site", "Residual hazards not communicated to next shift"], risk_before_likelihood: 2, risk_before_severity: 2, risk_before_rating: "low", control_measures: ["Area Authority and RP sign permit close-out", "Conduct housekeeping and tool count", "Brief oncoming shift supervisor on completed work"], risk_after_likelihood: 1, risk_after_severity: 1, risk_after_rating: "low", responsible_person: "Area Authority" },
    ],
    confined_space: [
      { step_number: 1, activity_step: "Confined space classification and permit preparation", hazards: ["Incorrect classification of space", "Missing isolation list", "Permit issued without site verification"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Classify space per NEPL-CSE-001 risk matrix", "Complete full isolation register — double block & bleed", "Entry Supervisor conducts physical site inspection before signing permit"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Entry Supervisor" },
      { step_number: 2, activity_step: "Atmospheric testing and verification", hazards: ["H₂S exposure above 10 ppm IDLH", "Oxygen deficiency causing unconsciousness", "Flammable gas ignition during entry"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Certified gas detector: O₂ 19.5–23.5%, LEL <10%, H₂S <1ppm", "Test all four quadrants of the space at breathing zone height", "Continuous monitoring required during entry"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "HSE Advisor" },
      { step_number: 3, activity_step: "Entry with standby person positioned at entrance", hazards: ["Entrant incapacitated inside space", "Standby person abandons post", "Communication failure during entry"], risk_before_likelihood: 2, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Standby person equipped with SCBA, tripod and winch rescue line", "Radio communication tested before entry and checked every 5 minutes", "Buddy system — never enter alone"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Entry Supervisor" },
      { step_number: 4, activity_step: `Conduct work task inside ${loc}`, hazards: ["Atmospheric conditions deteriorating", "Struck by dropped tools from above", "Manual handling injury in restricted space"], risk_before_likelihood: 3, risk_before_severity: 4, risk_before_rating: "high", control_measures: ["Alarm set on gas detector at 50% of action levels", "Tool bag used — no loose tools around entry opening", "Ergonomic assessment of posture; limit single entry to 30 min max"], risk_after_likelihood: 2, risk_after_severity: 3, risk_after_rating: "medium", responsible_person: "Entrant" },
      { step_number: 5, activity_step: "Exit, permit close-out and equipment decontamination", hazards: ["Entrant unable to self-rescue on exit", "Contaminated PPE causing exposure after exit", "Permit not formally closed — space re-entered"], risk_before_likelihood: 2, risk_before_severity: 4, risk_before_rating: "medium", control_measures: ["Assisted exit plan verified before entry", "All PPE decontaminated before removal", "Entry Supervisor and RP sign close-out; space barricaded and tagged"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "Entry Supervisor" },
    ],
    lifting: [
      { step_number: 1, activity_step: "Pre-lift planning and lift categorisation", hazards: ["Incorrect lift category assessment", "Lift plan not reviewed by competent person", "Weather conditions not checked"], risk_before_likelihood: 3, risk_before_severity: 4, risk_before_rating: "high", control_measures: ["Classify lift per NEPL-LIFT-001: routine/complex/critical criteria", "Lift plan prepared and signed by CP Rigger", "Check wind speed: abort if >15 m/s offshore"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "CP Rigger" },
      { step_number: 2, activity_step: "Crane and lifting equipment pre-use inspection", hazards: ["Crane defect causing structural failure", "Lifting accessories beyond test date", "Overloaded SWL on rigging"], risk_before_likelihood: 2, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Complete crane pre-use inspection checklist (daily)", "Verify all accessories are within test date and marked SWL", "Calculate combined rigging weight — confirm within crane chart"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Crane Operator" },
      { step_number: 3, activity_step: "Rigging and slinging of load", hazards: ["Load slip from improper sling angle", "Sling damage from sharp edges", "Unbalanced load causing swing"], risk_before_likelihood: 3, risk_before_severity: 4, risk_before_rating: "high", control_measures: ["Sling angles verified: never <45° per NEPL-LIFT-001 rigging guide", "Softeners fitted on all sharp load edges", "Load trial lift to 150mm — check balance before full lift"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "CP Rigger" },
      { step_number: 4, activity_step: `Execute lift and move load to ${loc}`, hazards: ["Personnel in exclusion zone", "Load collision with structures during travel", "Tag line handler pulled under load"], risk_before_likelihood: 3, risk_before_severity: 4, risk_before_rating: "high", control_measures: ["Exclusion zone = load diameter + 5m; access controlled by Lift Supervisor", "Slow controlled lift; tag lines used to guide, not restrain", "Tag line handlers stay lateral — never under the load"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "Lift Supervisor" },
      { step_number: 5, activity_step: "Set-down load and post-lift de-rig", hazards: ["Load instability on final set-down", "De-rigging with load still under tension", "Sling entanglement during recovery"], risk_before_likelihood: 2, risk_before_severity: 3, risk_before_rating: "medium", control_measures: ["Confirm set-down area is firm, level and clear before landing", "Fully land load before removing slings — verify zero tension", "Inspect all rigging for damage before returning to store"], risk_after_likelihood: 1, risk_after_severity: 3, risk_after_rating: "low", responsible_person: "CP Rigger" },
    ],
    electrical: [
      { step_number: 1, activity_step: "Obtain Electrical Isolation Permit and verify scope", hazards: ["Wrong equipment isolated", "Permit scope not matching actual work", "Multiple energy sources not identified"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Obtain Electrical Isolation Permit per NEPL-ELEC-001", "Draw redline on P&ID identifying all energy sources", "Independent verification by second competent electrician"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Lead Electrician" },
      { step_number: 2, activity_step: "Lockout/Tagout (LOTO) all energy sources", hazards: ["Accidental re-energisation during work", "Multiple lock holders not coordinated", "Stored energy (capacitors, springs) not discharged"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Each worker applies personal padlock to isolation point", "Capacitors discharged and verified at zero volts", "LOTO log maintained with all lock holder names and shifts"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Lead Electrician" },
      { step_number: 3, activity_step: "Zero energy verification (test before touch)", hazards: ["Live circuit despite LOTO in place", "Induced voltage from adjacent live circuits", "Touch test instead of instrument verification"], risk_before_likelihood: 2, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Verify with calibrated multimeter on all phases", "Prove the tester is live on a known live circuit before and after testing", "Ground (earth) the circuit before any contact"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Lead Electrician" },
      { step_number: 4, activity_step: `Execute electrical work at ${loc}`, hazards: ["Exposed live adjacent conductors", "Arc flash during accidental contact", "PPE not rated for voltage present"], risk_before_likelihood: 2, risk_before_severity: 4, risk_before_rating: "medium", control_measures: ["Insulated barriers on all adjacent live conductors", "Arc-rated PPE worn: minimum cat 2 (8 cal/cm²)", "No metal objects (jewellery, watches) in work area"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "Electrician" },
      { step_number: 5, activity_step: "Re-energisation and permit close-out", hazards: ["Incorrect reassembly — live parts exposed", "Personnel still working on equipment during re-energisation", "Permit closed without all locks removed"], risk_before_likelihood: 2, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Pre-energisation checklist completed and signed", "All personnel accounted for and clear before removing LOTO locks", "Remove locks in reverse order; each worker removes their own lock only"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Area Authority" },
    ],
    excavation: [
      { step_number: 1, activity_step: "Site survey and underground services identification", hazards: ["Striking buried electrical cable", "Hitting gas pipeline during digging", "Unexploded ordnance at greenfield sites"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Cable Avoidance Tool (CAT) survey by competent operator", "Obtain underground services drawings from Asset Manager", "Hand-dig within 500mm of identified services"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Site Engineer" },
      { step_number: 2, activity_step: "Excavation shoring and edge protection", hazards: ["Trench collapse burying worker", "Edge collapse causing vehicle rollover", "Personnel falling into open excavation"], risk_before_likelihood: 3, risk_before_severity: 5, risk_before_rating: "high", control_measures: ["Battering, shoring or trench box for all excavations >1.2m depth", "Spoil minimum 500mm from trench edge", "Rigid barriers at trench edge; covers over open excavations"], risk_after_likelihood: 1, risk_after_severity: 5, risk_after_rating: "medium", responsible_person: "Site Supervisor" },
      { step_number: 3, activity_step: "Atmospheric monitoring in deep excavations", hazards: ["O₂ deficiency in deep trench", "Methane accumulation from biological decay", "CO from adjacent vehicle exhausts"], risk_before_likelihood: 2, risk_before_severity: 4, risk_before_rating: "medium", control_measures: ["Continuous gas monitoring for excavations >1.2m depth", "Forced ventilation if readings approach action levels", "Exclude vehicles from within 10m of open excavations"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "HSE Advisor" },
      { step_number: 4, activity_step: "Excavation work and material removal", hazards: ["Struck by excavator bucket", "Manual handling of heavy spoil", "Unsecured material rolling back into excavation"], risk_before_likelihood: 3, risk_before_severity: 4, risk_before_rating: "high", control_measures: ["Exclusion zone = 1.5 × excavator arm radius", "Mechanical handling for spoil where possible; 20kg lift limit", "Spoil bunded away from trench edge"], risk_after_likelihood: 1, risk_after_severity: 4, risk_after_rating: "low", responsible_person: "Machine Operator" },
      { step_number: 5, activity_step: "Backfill, compaction and site reinstatement", hazards: ["Premature backfill before services reinstated", "Compaction equipment rollover near trench", "Trip hazard from disturbed ground surface"], risk_before_likelihood: 2, risk_before_severity: 3, risk_before_rating: "medium", control_measures: ["Engineer sign-off before backfill commences", "Compaction equipment with rollover protection (ROPS)", "Final surface dressed flush with surrounding grade; barriers until complete"], risk_after_likelihood: 1, risk_after_severity: 3, risk_after_rating: "low", responsible_person: "Site Engineer" },
    ],
    general: [
      { step_number: 1, activity_step: "Work area preparation and hazard identification", hazards: ["Unidentified site hazards", "Concurrent operations creating interaction risk", "Inadequate access/egress from work area"], risk_before_likelihood: 3, risk_before_severity: 3, risk_before_rating: "medium", control_measures: ["Pre-work site walkthrough with work team", "Check SIMOPS board for concurrent activities", "Identify primary and secondary escape routes"], risk_after_likelihood: 1, risk_after_severity: 3, risk_after_rating: "low", responsible_person: "Supervisor" },
      { step_number: 2, activity_step: "PPE inspection and team briefing", hazards: ["Defective PPE providing false protection", "Team member unaware of site-specific hazards", "New contractor unfamiliar with site emergency procedures"], risk_before_likelihood: 2, risk_before_severity: 3, risk_before_rating: "medium", control_measures: ["PPE inspection: check for damage, expiry, correct specification", "Toolbox talk covering top 3 hazards and emergency plan", "New personnel complete site induction before work starts"], risk_after_likelihood: 1, risk_after_severity: 3, risk_after_rating: "low", responsible_person: "Supervisor" },
      { step_number: 3, activity_step: "Task execution and active supervision", hazards: ["Slip, trip or fall on work surface", "Manual handling injury (poor technique)", "Struck by / caught in moving equipment"], risk_before_likelihood: 3, risk_before_severity: 3, risk_before_rating: "medium", control_measures: ["Housekeeping maintained throughout task; clear access paths", "Mechanical assist for loads >20kg; team-lift with proper technique", "Exclusion zone established around moving equipment"], risk_after_likelihood: 1, risk_after_severity: 3, risk_after_rating: "low", responsible_person: "Supervisor" },
      { step_number: 4, activity_step: "Monitoring for environmental and health hazards", hazards: ["Heat stress in outdoor Nigerian climate", "Noise exposure from machinery", "Chemical/dust inhalation without respiratory protection"], risk_before_likelihood: 3, risk_before_severity: 2, risk_before_rating: "medium", control_measures: ["Work-rest rotation in heat; 500ml water per hour", "Hearing protection in >85dBA zones; audiometric baseline recorded", "Respiratory protection where dust or chemical exposure possible"], risk_after_likelihood: 1, risk_after_severity: 2, risk_after_rating: "low", responsible_person: "HSE Advisor" },
      { step_number: 5, activity_step: "Work completion, site cleanup and close-out", hazards: ["Tools or materials left creating trip hazard", "Waste not segregated — environmental breach", "Lessons learned not captured"], risk_before_likelihood: 2, risk_before_severity: 2, risk_before_rating: "low", control_measures: ["Tool count and site sweep before leaving area", "Waste segregated per NEPL Environmental procedure", "Debrief with team: what went well, what to improve"], risk_after_likelihood: 1, risk_after_severity: 1, risk_after_rating: "low", responsible_person: "Supervisor" },
    ],
  };

  return templates[req.workType] ?? templates["general"];
}

// ============================================================
// AZURE OPENAI GENERATOR
// ============================================================
async function buildAISteps(
  req: GenerateRARequest,
  azureKey: string,
  endpoint: string,
  deployment: string
): Promise<JSAStep[]> {
  const prompt = `You are a NEPL HSE safety expert. Generate a 5-step Job Safety Analysis (JSA) for the following activity.

TITLE: ${req.title}
ACTIVITY: ${req.activityDescription}
LOCATION: ${req.location}
WORK TYPE: ${req.workType}
CREW EXPERIENCE: ${req.crewExperience ?? "mixed"}

Return a JSON object with a "steps" array containing exactly 5 objects, each with:
{
  "step_number": number (1-5),
  "activity_step": "string — what is being done in this step",
  "hazards": ["string", ...] — 2-4 specific hazards,
  "risk_before_likelihood": number (1-5),
  "risk_before_severity": number (1-5),
  "control_measures": ["string", ...] — 2-4 specific controls using hierarchy of controls,
  "risk_after_likelihood": number (1-5),
  "risk_after_severity": number (1-5),
  "responsible_person": "string — job role responsible"
}

Apply hierarchy of controls: Eliminate > Substitute > Engineering > Administrative > PPE. Include at least one engineering or administrative control per step. Base hazards on NEPL HSE procedures.`;

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Azure OpenAI error: ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const parsed = JSON.parse(data.choices[0].message.content) as { steps: JSAStep[] };

  return parsed.steps.map((s, i) => ({
    ...s,
    step_number: i + 1,
    risk_before_rating: riskRating(s.risk_before_likelihood, s.risk_before_severity),
    risk_after_rating: riskRating(s.risk_after_likelihood, s.risk_after_severity),
  }));
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

    const body = await req.json() as GenerateRARequest;
    if (!body.title || !body.activityDescription) {
      return respond({ success: false, error: { code: "VALIDATION_ERROR", message: "title and activityDescription required" } }, 400);
    }

    const azureKey = Deno.env.get("AZURE_OPENAI_KEY");
    const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const deployment = Deno.env.get("AZURE_CHAT_DEPLOYMENT") ?? "gpt-4o";

    let steps: JSAStep[];
    if (azureKey && azureEndpoint) {
      try {
        steps = await buildAISteps(body, azureKey, azureEndpoint, deployment);
      } catch (err) {
        console.error("Azure OpenAI failed, using mock:", err);
        steps = buildMockSteps(body);
      }
    } else {
      steps = buildMockSteps(body);
    }

    // Calculate overall risk as highest pre-control rating
    const riskOrder = ["low", "medium", "high", "critical"];
    const overall = steps.reduce((max, s) => {
      return riskOrder.indexOf(s.risk_before_rating) > riskOrder.indexOf(max) ? s.risk_before_rating : max;
    }, "low");
    const residual = steps.reduce((max, s) => {
      return riskOrder.indexOf(s.risk_after_rating) > riskOrder.indexOf(max) ? s.risk_after_rating : max;
    }, "low");

    // Save risk assessment
    const { data: ra, error: raErr } = await supabase.from("risk_assessments").insert({
      user_id: user.id,
      assessment_type: body.assessmentType ?? "JSA",
      title: body.title,
      activity_description: body.activityDescription,
      location: body.location,
      overall_risk_rating: overall,
      residual_risk_rating: residual,
      status: "draft",
      ai_generated: true,
    }).select().maybeSingle();

    if (raErr || !ra) {
      return respond({ success: false, error: { code: "DB_ERROR", message: raErr?.message } }, 500);
    }

    // Save steps
    const stepRows = steps.map(s => ({ ...s, assessment_id: ra.id }));
    const { error: stepsErr } = await supabase.from("risk_assessment_steps").insert(stepRows);
    if (stepsErr) {
      console.error("Failed to save steps:", stepsErr.message);
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "risk_assessment_created",
      metadata: { work_type: body.workType, location: body.location },
    }).then(() => {});

    return respond({
      success: true,
      data: {
        assessment: ra,
        steps,
        overall_risk_rating: overall,
        residual_risk_rating: residual,
      },
    });
  } catch (err) {
    console.error("generate-risk-assessment error:", err);
    return respond({ success: false, error: { code: "INTERNAL_ERROR", message: "Unexpected error" } }, 500);
  }
});
