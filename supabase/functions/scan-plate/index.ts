import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { captureException, verifyCaptcha, getClientIp } from "../_shared/sentry.ts";

async function isAuthenticated(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return false;
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data } = await client.auth.getUser();
    return Boolean(data?.user?.id);
  } catch {
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured — add it as a Supabase edge function secret");

    const ip = getClientIp(req);
    if (ip) {
      const url = Deno.env.get("SUPABASE_URL")!;
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(url, key);
      const { data: ok } = await admin.rpc("check_rate_limit", {
        p_key: `scan_ip:${ip}`, p_capacity: 60, p_refill_per_sec: 1,
      } as any);
      if (ok === false) {
        return new Response(JSON.stringify({ error: "Too many requests, slow down" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let body: any;
    try {
      const rawText = await req.text();
      if (!rawText || rawText.length === 0) {
        return new Response(JSON.stringify({ error: "Empty request body" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      body = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body — image may be too large. Try a smaller photo." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image, captcha_token } = body;
    const authed = await isAuthenticated(req);
    if (!authed && !(await verifyCaptcha(captcha_token))) {
      return new Response(JSON.stringify({ error: "Captcha failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "Missing image data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data URL prefix to get raw base64
    let base64Data = image;
    let mediaType = "image/jpeg";
    const dataUrlMatch = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mediaType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
              {
                type: "text",
                text: `Read the license plate number and US state from this image. Return ONLY a JSON object with these exact keys:
- "plate_number": uppercase string, no spaces or special chars (null if unreadable)
- "state": 2-letter US state abbreviation (null if unreadable)
- "confidence": "high", "medium", or "low"

Example: {"plate_number": "ABC1234", "state": "WI", "confidence": "high"}
Return ONLY the JSON object, nothing else.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      throw new Error(`AI vision error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({
        plate_number: result.plate_number || null,
        state: result.state || null,
        confidence: result.confidence || "low",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ plate_number: null, state: null, confidence: "low" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("scan-plate error:", err);
    await captureException(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
