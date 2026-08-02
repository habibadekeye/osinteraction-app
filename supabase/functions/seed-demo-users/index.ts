import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_USERS = [
  { email: "admin@safeops.demo", password: "SafeOps2024!", employee_id: "NEPL-ADM-0001", full_name: "Samuel Adeyemi", role: "admin", department: "IT/HSE Systems", location: "Lagos HQ", asset_type: "office" },
  { email: "manager@safeops.demo", password: "SafeOps2024!", employee_id: "NEPL-HSE-0042", full_name: "Dr. Ngozi Okafor", role: "hse_manager", department: "HSE", location: "Bonga FPSO", asset_type: "platform" },
  { email: "advisor@safeops.demo", password: "SafeOps2024!", employee_id: "NEPL-HSE-0087", full_name: "Chukwuemeka Eze", role: "hse_advisor", department: "HSE", location: "Port Harcourt", asset_type: "terminal" },
  { email: "supervisor@safeops.demo", password: "SafeOps2024!", employee_id: "NEPL-OPS-0156", full_name: "Tunde Bakare", role: "supervisor", department: "Operations", location: "EA Field", asset_type: "platform" },
  { email: "fieldworker@safeops.demo", password: "SafeOps2024!", employee_id: "NEPL-OPS-0789", full_name: "Emeka Obi", role: "field_worker", department: "Drilling", location: "Okono Platform", asset_type: "rig" },
  { email: "auditor@safeops.demo", password: "SafeOps2024!", employee_id: "NEPL-AUD-0012", full_name: "Amaka Nwosu", role: "auditor", department: "Internal Audit", location: "Lagos HQ", asset_type: "office" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const user of DEMO_USERS) {
      const { email, password, employee_id, full_name, role, department, location, asset_type } = user;

      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("employee_id", employee_id)
        .maybeSingle();

      if (existing) {
        results.push({ email, status: "already_exists" });
        continue;
      }

      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authUser.user) {
        results.push({ email, status: "error", error: authError?.message });
        continue;
      }

      const { error: profileError } = await adminClient.from("profiles").insert({
        id: authUser.user.id,
        employee_id,
        full_name,
        role,
        department,
        location,
        asset_type,
      });

      results.push({ email, status: profileError ? "profile_error" : "created", error: profileError?.message });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
