import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_PRICES = new Set([
  "plate_claim_one_time",
  "plate_privacy_monthly",
  "plate_total_block_monthly",
  "report_dispute_fee",
]);

const supabaseAdmin: any = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { priceId, plateNumber, disputeId, state } = (await req.json().catch(() => ({}))) ?? {};
    if (typeof priceId !== "string" || !ALLOWED_PRICES.has(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const mockSessionId = `mock_${crypto.randomUUID()}`;
    const cleanState = typeof state === "string" && /^[A-Za-z]{2}$/.test(state) ? state.toUpperCase() : "WI";

    if (priceId === "report_dispute_fee") {
      if (typeof disputeId !== "string" || disputeId.length < 10) {
        return new Response(JSON.stringify({ error: "Invalid disputeId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: dispute } = await supabaseAdmin
        .from("report_disputes")
        .select("id, disputer_id, paid")
        .eq("id", disputeId).maybeSingle();
      if (!dispute || dispute.disputer_id !== user.id) {
        return new Response(JSON.stringify({ error: "Dispute not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (dispute.paid) {
        return new Response(JSON.stringify({ ok: true, already_paid: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin.from("report_disputes")
        .update({ paid: true, stripe_session_id: mockSessionId })
        .eq("id", disputeId);
      return new Response(JSON.stringify({ ok: true, type: "dispute" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof plateNumber !== "string" || plateNumber.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Invalid plateNumber" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cleanPlate = plateNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (priceId === "plate_claim_one_time") {
      const { data: existing } = await supabaseAdmin
        .from("claimed_plates").select("id, user_id, paid")
        .eq("plate_number", cleanPlate).maybeSingle();
      if (existing && existing.user_id !== user.id && existing.paid) {
        return new Response(JSON.stringify({ error: "Plate already claimed" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existing && existing.user_id === user.id) {
        await supabaseAdmin.from("claimed_plates")
          .update({ paid: true, paid_at: now, stripe_session_id: mockSessionId, state: cleanState })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("claimed_plates").insert({
          user_id: user.id, plate_number: cleanPlate, paid: true,
          paid_at: now, stripe_session_id: mockSessionId, state: cleanState,
        });
      }
      return new Response(JSON.stringify({ ok: true, type: "claim", plateNumber: cleanPlate }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Subscription tiers (mock)
    const { data: claim } = await supabaseAdmin
      .from("claimed_plates").select("user_id, paid")
      .eq("plate_number", cleanPlate).maybeSingle();
    if (!claim || claim.user_id !== user.id || !claim.paid) {
      return new Response(JSON.stringify({ error: "You must claim this plate first" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel any existing active subs for this plate
    await supabaseAdmin.from("subscriptions")
      .update({ status: "canceled", updated_at: now })
      .eq("user_id", user.id).eq("plate_number", cleanPlate)
      .in("status", ["active", "trialing", "past_due"]);

    await supabaseAdmin.from("subscriptions").insert({
      user_id: user.id,
      stripe_subscription_id: mockSessionId,
      stripe_customer_id: `mock_cus_${user.id.slice(0, 8)}`,
      product_id: priceId === "plate_total_block_monthly" ? "plate_total_block" : "plate_privacy",
      price_id: priceId,
      status: "active",
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      environment: "sandbox",
      plate_number: cleanPlate,
      state: cleanState,
    });

    return new Response(JSON.stringify({ ok: true, type: "subscription", priceId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("mock-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
