// Auto-tag behavior: reads a free-text comment and picks the best matching
// infraction or positive-behavior type from a fixed list. Uses Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BAD_TYPES = [
  "tailgating","speeding","ran_red_light","bad_parking","aggressive_lane_change",
  "distracted_driving","no_turn_signal","rolling_stop","double_parking","blocking_intersection",
  "road_rage","wrong_way","illegal_uturn","running_stop_sign","cutting_off","brake_checking",
  "driving_too_slow","high_beams","honking_excessively","littering","passing_school_bus",
  "not_yielding_pedestrian","shoulder_driving","texting_driving","dui_suspected",
  "suspicious_vehicle","hit_and_run","expired_tags","loud_exhaust","left_lane_camping",
];
const GOOD_TYPES = [
  "courteous_merge","yielded_pedestrian","let_me_in","used_turn_signal",
  "stopped_for_school_bus","great_parking","safe_following_distance","hazard_warning",
  "roadside_assist",
];
const ALL_TYPES = [...BAD_TYPES, ...GOOD_TYPES];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (comment.length < 5 || comment.length > 2000) {
      return new Response(
        JSON.stringify({ type: null, confidence: 0, reason: "invalid_length" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `You classify short driver-behavior reports. Read the user's note and pick ONE behavior tag from this list, or null if none fits well.

BAD behaviors: ${BAD_TYPES.join(", ")}
GOOD behaviors: ${GOOD_TYPES.join(", ")}

User report: ${comment}

Respond with ONLY JSON like {"type":"<tag>","confidence":0.0-1.0}. If nothing fits, respond {"type":null,"confidence":0}.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 64,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Anthropic API error", resp.status, text);
      return new Response(
        JSON.stringify({ type: null, confidence: 0, error: "ai_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const content = data?.content?.[0]?.text ?? "{}";
    let parsed: { type: string | null; confidence: number } = { type: null, confidence: 0 };
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = { type: null, confidence: 0 };
    }

    const type = parsed.type && ALL_TYPES.includes(parsed.type) ? parsed.type : null;
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

    return new Response(JSON.stringify({ type, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("auto-tag-behavior error", err);
    return new Response(
      JSON.stringify({ type: null, confidence: 0, error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
