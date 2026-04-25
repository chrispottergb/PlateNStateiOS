import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { priceId, plateNumber, disputeId, returnUrl, environment } = body ?? {};

    if (typeof priceId !== "string" || !ALLOWED_PRICES.has(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof returnUrl !== "string" || !returnUrl.startsWith("http")) {
      return new Response(JSON.stringify({ error: "Invalid returnUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "Invalid environment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env: StripeEnv = environment;
    const isDispute = priceId === "report_dispute_fee";
    let cleanPlate = "";
    let verifiedDisputeId = "";

    if (isDispute) {
      if (typeof disputeId !== "string" || disputeId.length < 10) {
        return new Response(JSON.stringify({ error: "Invalid disputeId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify the dispute belongs to this user and is unpaid+pending
      const { data: dispute } = await supabaseAdmin
        .from("report_disputes")
        .select("id, disputer_id, paid, status")
        .eq("id", disputeId)
        .maybeSingle();
      if (!dispute || dispute.disputer_id !== user.id) {
        return new Response(JSON.stringify({ error: "Dispute not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (dispute.paid) {
        return new Response(JSON.stringify({ error: "Dispute already paid" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      verifiedDisputeId = dispute.id;
    } else {
      if (typeof plateNumber !== "string" || plateNumber.trim().length < 3) {
        return new Response(JSON.stringify({ error: "Invalid plateNumber" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cleanPlate = plateNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (priceId === "plate_claim_one_time") {
        const { data: existing } = await supabaseAdmin
          .from("claimed_plates")
          .select("user_id, paid")
          .eq("plate_number", cleanPlate)
          .maybeSingle();
        if (existing && existing.user_id !== user.id && existing.paid) {
          return new Response(JSON.stringify({ error: "Plate already claimed by another user" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { data: claim } = await supabaseAdmin
          .from("claimed_plates")
          .select("user_id, paid")
          .eq("plate_number", cleanPlate)
          .maybeSingle();
        if (!claim || claim.user_id !== user.id || !claim.paid) {
          return new Response(JSON.stringify({ error: "You must claim this plate before subscribing" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const stripe = createStripeClient(env);
    const prices = await stripe.prices.list({ lookup_keys: [priceId], limit: 1 });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const sessionParams: any = {
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      customer_email: user.email ?? undefined,
      managed_payments: { enabled: true },
      metadata: {
        userId: user.id,
        priceLookup: priceId,
        managed_payments: "true",
        ...(isDispute ? { type: "dispute", disputeId: verifiedDisputeId } : { plateNumber: cleanPlate }),
      },
    };
    if (isRecurring) {
      sessionParams.subscription_data = {
        metadata: {
          userId: user.id,
          plateNumber: cleanPlate,
          priceLookup: priceId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
