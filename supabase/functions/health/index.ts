import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let dbStatus: "up" | "down" = "down";
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, key);
    const { error } = await admin.from("rate_limits").select("key", { count: "exact", head: true }).limit(1);
    dbStatus = error ? "down" : "up";
  } catch (e) {
    console.error("[health] db ping failed", e);
  }

  return new Response(
    JSON.stringify({ ok: dbStatus === "up", ts: new Date().toISOString(), db: dbStatus }),
    {
      status: dbStatus === "up" ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
