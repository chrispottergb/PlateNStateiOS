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
]);

const supabaseAdmin = createClient(
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
    const { priceId, plateNumber, returnUrl, environment } = body ?? {};

    if (typeof priceId !== "string" || !ALLOWED_PRICES.has(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof plateNumber !== "string" || plateNumber.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Invalid plateNumber" }), {
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
    const cleanPlate = plateNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    // For claim, ensure the plate isn't already claimed by someone else
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
      // Blacklist tiers require the user to own the plate first
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
        plateNumber: cleanPlate,
        priceLookup: priceId,
        managed_payments: "true",
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
