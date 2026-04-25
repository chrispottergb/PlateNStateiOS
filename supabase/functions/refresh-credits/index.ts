import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all profiles
    const { data: profiles, error: fetchErr } = await supabase
      .from("profiles")
      .select("user_id, credits");

    if (fetchErr) throw fetchErr;

    // Reset all credits to 20
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ credits: 20 })
      .neq("credits", 20); // only update those not already at 20

    if (updateErr) throw updateErr;

    // Log transactions for users who had less than 20
    const txRows = (profiles || [])
      .filter((p) => p.credits < 20)
      .map((p) => ({
        user_id: p.user_id,
        amount: 20 - p.credits,
        type: "monthly_refresh",
        description: "Monthly credit refresh",
      }));

    if (txRows.length > 0) {
      const { error: txErr } = await supabase
        .from("credit_transactions")
        .insert(txRows);
      if (txErr) throw txErr;
    }

    return new Response(
      JSON.stringify({ refreshed: txRows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
