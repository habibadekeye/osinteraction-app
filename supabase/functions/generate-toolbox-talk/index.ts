import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateRequest {
  activity: string;
  location?: string;
  crewSize?: number;
  durationMinutes?: number;
  environmentalConditions?: string;
  crewExperience?: string;
}

interface TalkContent {
  title: string;
  discussion_points: string[];
  hazards: string[];
  controls: string[];
  questions: string[];
}

// ============================================================
// MOCK GENERATOR (fallback when Azure OpenAI not configured)
// ============================================================
function buildMockTalk(req: GenerateRequest): TalkContent {
  const activity = req.activity || "general work activity";
  const location = req.location || "site";

  return {
    title: `Toolbox Talk: ${activity} — ${location}`,
    discussion_points: [
      `Today we are performing: ${activity}. Make sure everyone understands their specific role before we start.`,
      `Location: ${location}. Are there any concurrent operations we need to be aware of? Check the SIMOPS board.`,
      `Permit to Work status: ensure the PTW is signed, displayed at the work site, and all signatories are present.`,
      `Emergency plan: know where the nearest muster point is and which radio channel to use if something goes wrong.`,
      `Personal Protective Equipment: verify everyone has the correct PPE for this task before we begin.`,
      `Any questions or concerns from the crew? Speak now — there are no stupid questions when safety is involved.`,
    ],
    hazards: [
      `Slips, trips, and falls — uneven surfaces or wet conditions at ${location}`,
      `Struck by / caught in equipment during ${activity}`,
      `Manual handling injuries — awkward postures or heavy loads`,
      `Heat stress — working outdoors in Nigerian climate conditions`,
    ],
    controls: [
      `Conduct site walkthrough before starting, identify and barricade trip hazards`,
      `Establish exclusion zones, ensure all personnel are aware of moving equipment`,
      `Use mechanical aids where possible; team-lift anything over 20kg; warm up before heavy work`,
      `Hydration: 500ml water per hour minimum; rotate work/rest as needed; know heat stress signs`,
    ],
    questions: [
      `What is the first thing you do if you feel unsafe or see a hazard during the task?`,
      `Who do you report to if an incident occurs during this activity?`,
      `What are the emergency contact details and radio channel for this work area?`,
    ],
  };
}

// ============================================================
// AZURE OPENAI GENERATOR
// ============================================================
async function buildAITalk(req: GenerateRequest, azureKey: string, endpoint: string, deployment: string): Promise<TalkContent> {
  const activity = req.activity;
  const location = req.location ?? "NEPL facility";
  const crewSize = req.crewSize ?? 4;
  const duration = req.durationMinutes ?? 15;
  const conditions = req.environmentalConditions ?? "standard conditions";
  const experience = req.crewExperience ?? "mixed experience";

  const prompt = `You are a NEPL HSE safety expert. Generate a structured toolbox talk for the following activity.

ACTIVITY: ${activity}
LOCATION: ${location}
CREW SIZE: ${crewSize} personnel
DURATION: ${duration} minutes
ENVIRONMENTAL CONDITIONS: ${conditions}
CREW EXPERIENCE: ${experience}

Return a JSON object with exactly these fields:
{
  "title": "string — concise toolbox talk title",
  "discussion_points": ["string", ...] — 5-6 key points to discuss with the crew,
  "hazards": ["string", ...] — 4-6 specific hazards for this activity,
  "controls": ["string", ...] — 4-6 control measures matching the hazards,
  "questions": ["string", ...] — 3 engagement questions for the crew
}

Base hazards and controls on NEPL procedures. Be specific to the activity and location. Keep each item concise (1-2 sentences).`;

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!res.ok) throw new Error(`Azure OpenAI error: ${res.status}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const parsed = JSON.parse(data.choices[0].message.content) as TalkContent;

  return {
    title: parsed.title ?? `Toolbox Talk: ${activity} — ${location}`,
    discussion_points: Array.isArray(parsed.discussion_points) ? parsed.discussion_points : [],
    hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
    controls: Array.isArray(parsed.controls) ? parsed.controls : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
  };
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return respond({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }

    const body = await req.json() as GenerateRequest;
    if (!body.activity) {
      return respond({ success: false, error: { code: "VALIDATION_ERROR", message: "activity is required" } }, 400);
    }

    const azureKey = Deno.env.get("AZURE_OPENAI_KEY");
    const azureEndpoint = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const chatDeployment = Deno.env.get("AZURE_CHAT_DEPLOYMENT") ?? "gpt-4o";

    let talk: TalkContent;
    let aiGenerated = true;

    if (azureKey && azureEndpoint) {
      try {
        talk = await buildAITalk(body, azureKey, azureEndpoint, chatDeployment);
      } catch (err) {
        console.error("Azure OpenAI failed, using mock:", err);
        talk = buildMockTalk(body);
      }
    } else {
      talk = buildMockTalk(body);
      aiGenerated = true;
    }

    const { data: saved, error: saveError } = await supabase.from("toolbox_talks").insert({
      user_id: user.id,
      title: talk.title,
      activity: body.activity,
      location: body.location,
      crew_size: body.crewSize ?? 4,
      duration_minutes: body.durationMinutes ?? 15,
      discussion_points: talk.discussion_points,
      hazards: talk.hazards,
      controls: talk.controls,
      questions: talk.questions,
      environmental_conditions: body.environmentalConditions,
      status: "draft",
      ai_generated: aiGenerated,
    }).select().maybeSingle();

    if (saveError) {
      return respond({ success: false, error: { code: "INTERNAL_ERROR", message: saveError.message } }, 500);
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "toolbox_talk_generated",
      metadata: { activity: body.activity, location: body.location },
    }).then(() => {});

    return respond({ success: true, data: saved });

  } catch (err) {
    console.error("generate-toolbox-talk error:", err);
    return respond({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }, 500);
  }
});
