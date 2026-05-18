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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

    if (comment.length < 5 || comment.length > 2000) {
      return new Response(
        JSON.stringify({ type: null, confidence: 0, reason: "invalid_length" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const system = `You classify short driver-behavior reports. Read the user's note and pick ONE behavior tag from this list, or null if none fits well.

BAD behaviors: ${BAD_TYPES.join(", ")}
GOOD behaviors: ${GOOD_TYPES.join(", ")}

Respond with ONLY JSON like {"type":"<tag>","confidence":0.0-1.0}. If nothing fits, respond {"type":null,"confidence":0}.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: comment },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      return new Response(
        JSON.stringify({ type: null, confidence: 0, error: "ai_error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
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
