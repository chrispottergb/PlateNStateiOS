import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { captureException, getClientIp } from "../_shared/sentry.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Per-IP rate limit: 60/min
    const ip = getClientIp(req);
    if (ip) {
      const limiter = createClient(supabaseUrl, serviceKey);
      const { data: ok } = await limiter.rpc("check_rate_limit", {
        p_key: `upload_ip:${ip}`, p_capacity: 60, p_refill_per_sec: 1,
      } as any);
      if (ok === false) {
        return new Response(JSON.stringify({ error: "Too many requests, slow down" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { list_id } = await req.json();
    if (!list_id) throw new Error("Missing list_id");

    // Admin client for service-level operations
    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch the list metadata
    const { data: list, error: listErr } = await admin
      .from("uploaded_plate_lists")
      .select("*")
      .eq("id", list_id)
      .eq("user_id", user.id)
      .single();
    if (listErr || !list) throw new Error("List not found");

    // Download the CSV file from storage
    const filePath = `${user.id}/${list.file_name}`;
    const { data: fileData, error: dlErr } = await admin.storage
      .from("plate-uploads")
      .download(filePath);
    if (dlErr || !fileData) throw new Error("Failed to download file: " + (dlErr?.message || "unknown"));

    const text = await fileData.text();
    const lines = text.split(/\r?\n/).filter((l: string) => l.trim());

    // Parse CSV - expect plate_number as first column, optional label as second
    const plates: { plate_number: string; label: string | null }[] = [];
    const seen = new Set<string>();
    const plateRegex = /^[A-Z0-9]{2,8}$/;

    // Skip header if it looks like one
    const startIdx = lines.length > 0 && /plate/i.test(lines[0]) ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map((s: string) => s.trim().replace(/^["']|["']$/g, ""));
      const plateNum = (parts[0] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!plateRegex.test(plateNum) || seen.has(plateNum)) continue;
      seen.add(plateNum);
      plates.push({ plate_number: plateNum, label: parts[1] || null });
    }

    // Enforce tier limits for LE accounts
    if (list.account_type === "law_enforcement") {
      const { data: leAccount } = await admin
        .from("law_enforcement_accounts")
        .select("tier")
        .eq("id", list.account_id)
        .single();
      const tierLimits: Record<string, number> = { department: 500, precinct: 2500, agency: 999999 };
      const limit = tierLimits[leAccount?.tier || "department"] || 500;
      if (plates.length > limit) {
        await admin.from("uploaded_plate_lists").update({ status: "error", plate_count: plates.length }).eq("id", list_id);
        throw new Error(`Exceeds tier limit of ${limit} plates`);
      }
    }

    // Insert plates in batches
    const batchSize = 200;
    for (let i = 0; i < plates.length; i += batchSize) {
      const batch = plates.slice(i, i + batchSize).map((p) => ({
        list_id,
        plate_number: p.plate_number,
        label: p.label,
      }));
      await admin.from("uploaded_plates").insert(batch);
    }

    // Update plate count
    await admin.from("uploaded_plate_lists").update({ plate_count: plates.length }).eq("id", list_id);

    // Now cross-reference against reports using the scan function
    // We do it directly here for the service role
    const { error: scanErr } = await admin.rpc("scan_uploaded_plates_service", { p_list_id: list_id });
    
    // If the service function doesn't exist, do it inline
    if (scanErr) {
      // Cross-reference each plate manually
      const allPlateNumbers = plates.map((p) => p.plate_number);
      const { data: reports } = await admin
        .from("reports")
        .select("plate_number, infraction, upvote_count")
        .in("plate_number", allPlateNumbers);

      if (reports && reports.length > 0) {
        // Group reports by plate
        const reportMap = new Map<string, typeof reports>();
        for (const r of reports) {
          if (!reportMap.has(r.plate_number)) reportMap.set(r.plate_number, []);
          reportMap.get(r.plate_number)!.push(r);
        }

        // Update each plate with risk data
        for (const [plateNum, plateReports] of reportMap) {
          const totalReports = plateReports.length;
          const verifiedReports = plateReports.filter((r) => r.upvote_count >= 3).length;
          const riskScore = Math.min(100, plateReports.reduce((sum, r) => {
            const scores: Record<string, number> = {
              tailgating: 20, ran_red_light: 25, speeding: 15,
              distracted_driving: 15, bad_parking: 5, aggressive_lane_change: 10,
            };
            return sum + (scores[r.infraction] || 10);
          }, 0));

          await admin
            .from("uploaded_plates")
            .update({ total_reports: totalReports, verified_reports: verifiedReports, risk_score: riskScore, last_scanned_at: new Date().toISOString() })
            .eq("list_id", list_id)
            .eq("plate_number", plateNum);
        }
      }

      await admin.from("uploaded_plate_lists").update({ status: "complete" }).eq("id", list_id);
    }

    return new Response(JSON.stringify({ success: true, plate_count: plates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    await captureException(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
