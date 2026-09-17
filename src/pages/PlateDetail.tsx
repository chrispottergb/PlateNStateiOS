import { useParams, Link } from "react-router-dom";
import ReportModal from "@/components/ReportModal";
import LicensePlate from "@/components/LicensePlate";
import NotificationBell from "@/components/NotificationBell";
import { INFRACTIONS, infractionLabel } from "@/lib/data";
import { InfractionDef } from "@/lib/types";
import { usePlateDetail } from "@/hooks/usePlateRecords";
import { useAuth } from "@/hooks/useAuth";
import { usePlateClaim } from "@/hooks/useClaimStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, ArrowLeft, MapPin, Clock, Calendar, ThumbsUp, ShieldCheck, FileText, CheckCircle2, SortDesc, Flag, Share2, Camera, ChevronRight, CircleAlert, Eye,
  CarFront, Gauge, ParkingSquare, ArrowLeftRight, Smartphone, CornerUpRight, OctagonAlert, Ban, Angry, ArrowUpDown, Undo2, Octagon, Scissors, CircleStop, Snail, Lightbulb, Volume2, Trash2, Bus, Footprints, MoveRight, MessageSquare, Wine, Siren, Tent, Handshake, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getStateByCode } from "@/lib/usStates";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DisputeReportDialog } from "@/components/DisputeReportDialog";
import { toast } from "sonner";
import sectionBg from "@/assets/section-bg.jpg";

const HIGH_RISK_INFRACTIONS = new Set([
  "road_rage", "hit_and_run", "dui_suspected", "wrong_way",
  "passing_school_bus", "brake_checking", "ran_red_light",
]);

// Shame points: high positive = bad driver, negative/zero = good or unknown.
const getSeverityLabel = (score: number, hasHighRiskInfraction = false) => {
  if (score >= 25 || hasHighRiskInfraction) return { label: "CRITICAL OFFENDER", short: "Critical", tone: "destructive" as const };
  if (score >= 12) return { label: "HIGH RISK", short: "High", tone: "destructive" as const };
  if (score >= 6) return { label: "MODERATE", short: "Moderate", tone: "warning" as const };
  if (score > 0) return { label: "LOW RISK", short: "Low", tone: "warning" as const };
  return { label: "CLEAN", short: "Clean", tone: "success" as const };
};

type Tone = "destructive" | "warning" | "success" | "muted";
const TONE_TEXT: Record<Tone, string> = { destructive: "text-[#EF4444]", warning: "text-[#F5A623]", success: "text-[#55B97A]", muted: "text-[#889AAA]" };
const TONE_RING: Record<Tone, string> = {
  destructive: "border-[#EF4444]/70 bg-[#EF4444]/10 text-[#EF4444]",
  warning: "border-[#F5A623]/70 bg-[#F5A623]/10 text-[#F5A623]",
  success: "border-[#55B97A]/70 bg-[#55B97A]/10 text-[#55B97A]",
  muted: "border-[#889AAA]/50 bg-[#889AAA]/10 text-[#A0B0BE]",
};

// Maps InfractionDef.icon names to Lucide. Unknown names fall back to a warning glyph.
const INFRACTION_ICONS: Record<string, LucideIcon> = {
  CarFront, Gauge, CircleAlert, ParkingSquare, ArrowLeftRight, Smartphone, CornerUpRight, OctagonAlert, Ban, Angry, ArrowUpDown,
  Undo2, Octagon, Scissors, CircleStop, Snail, Lightbulb, Volume2, Trash2, Bus, Footprints, MoveRight, MessageSquare, Wine, Eye, Siren,
  Calendar, Tent, Handshake, Wrench, AlertTriangle,
};
const iconFor = (inf?: InfractionDef): LucideIcon => (inf && INFRACTION_ICONS[inf.icon]) || AlertTriangle;

// Tone for a report: high-risk bad → red, other bad → amber, good → green, unrated → muted.
const toneFor = (inf?: InfractionDef): Tone => {
  if (!inf) return "muted";
  if (inf.kind === "good") return "success";
  return HIGH_RISK_INFRACTIONS.has(inf.type) ? "destructive" : "warning";
};

// Points are STORED as positive magnitudes for bad driving (shame points) and
// negative for good driving (see infraction_points() / data.ts). For display,
// bad driving is a deduction and good driving a credit, so the sign is flipped
// purely for presentation — the stored values and score math are untouched.
const formatPoints = (inf?: InfractionDef): { text: string; tone: Tone } | null => {
  if (!inf || inf.points === 0) return null;
  const magnitude = Math.abs(inf.points);
  return inf.kind === "good"
    ? { text: `+${magnitude} pts`, tone: "success" }
    : { text: `−${magnitude} pts`, tone: "destructive" };
};

const PlateDetail = () => {
  const { plateNumber } = useParams<{ plateNumber: string }>();
  const decoded = decodeURIComponent(plateNumber || "");
  const { plate, stats, reports, loading } = usePlateDetail(decoded);
  const { user } = useAuth();
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [disputeReportId, setDisputeReportId] = useState<string | null>(null);
  // Ownership via the canonical plate identity (normalizes the route param),
  // same rule as before: an active paid claim owned by the signed-in user.
  const { status: claimStatus } = usePlateClaim(decoded);
  const isOwner = claimStatus === "mine";

  // Has the signed-in user personally reported this plate? Only used to pick
  // the CTA wording. reporter_id is not readable anonymously, so this is a
  // separate signed-in-only query that degrades to first-time wording on any
  // error (and for anonymized legacy reports with reporter_id = null).
  const { data: hasReportedBefore = false } = useQuery({
    queryKey: ["my-report-exists", decoded, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id")
        .eq("plate_number", decoded)
        .eq("reporter_id", user!.id)
        .limit(1);
      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user && !!decoded,
    staleTime: 30_000,
  });

  const submitAppeal = async (reportId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in to appeal"); return; }
    const reason = window.prompt("Briefly explain why this report is inaccurate:");
    if (!reason || !reason.trim()) return;
    const { error } = await supabase.from("appeals").insert({
      report_id: reportId,
      user_id: user.id,
      plate_number: decoded.toUpperCase(),
      reason: reason.trim(),
    });
    if (error) toast.error("Appeal failed: " + error.message);
    else toast.success("Appeal submitted for admin review");
  };

  const sharePlate = async () => {
    const topInfraction = INFRACTIONS.filter(inf => plate?.infractions[inf.type] > 0)
      .sort((a, b) => (plate?.infractions[b.type] ?? 0) - (plate?.infractions[a.type] ?? 0))[0];
    const shareText = `Plate ${plate?.plateNumber}${plate?.state ? ` (${plate.state})` : ""} has ${plate?.reportCount} report${(plate?.reportCount ?? 0) !== 1 ? "s" : ""}. Top infraction: ${topInfraction?.label ?? "Unknown"}.`;
    const shareUrl = `https://platenstate.com/plate/${encodeURIComponent(plate?.plateNumber ?? "")}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Plate N State Report", text: shareText, url: shareUrl });
        return;
      } catch { /* cancelled or unsupported — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not share or copy");
    }
  };

  const sortedReports = [...reports].sort((a, b) =>
    sortOrder === "newest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const verifiedCount = reports.filter(r => r.upvote_count >= 3).length;

  // ---- Compact chrome shared by every state of this screen ----
  const DetailHeader = () => (
    <div className="container flex items-center justify-between h-[68px] pt-safe">
      <Link
        to="/"
        aria-label="Back"
        className="h-11 w-11 -ml-1 rounded-full bg-[#0D1B26]/70 backdrop-blur-sm border border-[#889AAA]/[0.18] flex items-center justify-center text-foreground hover:bg-[#122431] transition-colors"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
      </Link>
      <Link to="/" className="flex flex-col items-center leading-none">
        <span className="font-extrabold text-[15px] tracking-wide uppercase whitespace-nowrap">
          Plate <span className="text-primary">N'</span> State
        </span>
        <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground whitespace-nowrap">
          Drivers accountable. Roads safer.
        </span>
      </Link>
      <div className="flex items-center gap-2 -mr-1">
        {user && <NotificationBell />}
        <button
          type="button"
          onClick={sharePlate}
          title="Share this plate report"
          aria-label="Share this plate report"
          className="h-11 w-11 rounded-full bg-[#0D1B26]/70 backdrop-blur-sm border border-[#889AAA]/[0.18] flex items-center justify-center text-foreground hover:bg-[#122431] transition-colors"
        >
          <Share2 className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-nav">
        <DetailHeader />
        <div className="container pt-2 space-y-4">
          <Skeleton className="h-[150px] w-[300px] mx-auto rounded-[14px] bg-[#0D1B26]" />
          <Skeleton className="h-8 w-40 mx-auto bg-[#0D1B26]" />
          <Skeleton className="h-[88px] rounded-2xl bg-[#0D1B26]" />
          <Skeleton className="h-14 rounded-[14px] bg-[#0D1B26]" />
        </div>
      </div>
    );
  }

  if (!plate) {
    return (
      <div className="min-h-screen bg-background pb-nav">
        <DetailHeader />
        <div className="container pt-4 pb-10 text-center">
          <LicensePlate plateNumber={decoded} size="xl" className="mx-auto" />
          <p className="mt-5 font-mono text-[26px] font-bold tracking-[0.1em]">{decoded}</p>
          <p className="text-[15px] text-muted-foreground mt-2 mb-6">No reports found for this plate.</p>
          <ReportModal
            trigger={
              <Button size="lg" className="w-full h-14 gap-2.5 text-[18px] rounded-[14px]">
                <Camera className="!h-[22px] !w-[22px]" /> Report this Plate
              </Button>
            }
            initialPlate={decoded}
          />
        </div>
      </div>
    );
  }

  const hasHighRisk = reports.some((r) => HIGH_RISK_INFRACTIONS.has(r.infraction));
  const severity = getSeverityLabel(plate.totalScore, hasHighRisk);
  const goodCount = stats?.good_reports ?? 0;
  const badCount = stats?.bad_reports ?? 0;
  const witnessCount = (stats?.good_witnesses ?? 0) + (stats?.bad_witnesses ?? 0);
  const reportCount = stats?.report_count ?? plate.reportCount;
  const stateName = plate.state ? getStateByCode(plate.state).name : null;

  const topIssues = INFRACTIONS
    .filter(inf => plate.infractions[inf.type] > 0)
    .sort((a, b) => plate.infractions[b.type] - plate.infractions[a.type]);

  // Derived from the real report rows (no fabrication): date range + modal location.
  const timestamps = reports.map(r => new Date(r.created_at).getTime());
  const firstReported = timestamps.length ? new Date(Math.min(...timestamps)) : null;
  const lastReported = timestamps.length ? new Date(Math.max(...timestamps)) : null;
  const locationCounts = reports.reduce<Record<string, number>>((acc, r) => {
    if (r.location) acc[r.location] = (acc[r.location] ?? 0) + 1;
    return acc;
  }, {});
  const mostCommonArea = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const latestLocated = sortedReports.find(r => (r as any).latitude && (r as any).longitude) as
    | (typeof reports[number] & { latitude: number; longitude: number })
    | undefined;

  const riskPillLabel = severity.short === "Clean" ? "Clean Record" : `${severity.short} Risk`;

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* ===== Upper region: atmospheric backdrop dissolving into the page.
           Swap `sectionBg` for a production automotive asset without touching JSX. ===== */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 h-[360px] pointer-events-none" aria-hidden>
          <img src={sectionBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(7,19,28,0.15) 0%, rgba(7,19,28,0.6) 60%, rgba(7,19,28,0.9) 100%)" }} />
          <div className="absolute inset-x-0 bottom-0 h-[45%]" style={{ background: "linear-gradient(180deg, rgba(7,19,28,0) 0%, #07131C 100%)" }} />
        </div>

        <div className="relative">
          <DetailHeader />

          {/* Plate hero */}
          <div className="container pt-1 text-center">
            <LicensePlate plateNumber={plate.plateNumber} state={plate.state} size="xl" className="mx-auto" />
            <p className="mt-4 text-[28px] leading-none font-extrabold tracking-[0.02em]">{plate.plateNumber}</p>
            {stateName && (
              <p className="text-[15px] text-muted-foreground mt-2">{stateName}</p>
            )}

            {/* Status indicators — real severity + real report count */}
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-[13px] font-bold ${TONE_RING[severity.tone]}`}>
                <CircleAlert className="h-4 w-4" strokeWidth={2.25} />
                {riskPillLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#55B97A]/60 bg-[#55B97A]/10 px-3 h-8 text-[13px] font-semibold text-[#55B97A]">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
                {reportCount} Community Report{reportCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Core statistics — one instrument surface, three segments ===== */}
      <section className="container pt-4">
        <div className="grid grid-cols-[1.3fr_1fr_1fr] rounded-t-2xl bg-[#0D1B26] border border-[#889AAA]/[0.14] divide-x divide-[#889AAA]/[0.14] h-[84px]">
          <div className="flex items-center gap-2 px-2.5 min-w-0">
            <span className={`h-10 w-10 shrink-0 rounded-full border-2 flex items-center justify-center font-extrabold text-[14px] tabular-nums ${TONE_RING[severity.tone]}`}>
              {plate.totalScore}
            </span>
            <span className="min-w-0 leading-[1.15]">
              <span className="block text-[12px] font-bold whitespace-nowrap">Risk Score</span>
              <span className={`block text-[11px] font-medium whitespace-nowrap ${TONE_TEXT[severity.tone]}`}>{riskPillLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-2 min-w-0">
            <span className="h-10 w-10 shrink-0 rounded-full bg-[#3B82F6]/15 flex items-center justify-center text-[#3B82F6]">
              <FileText className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 leading-[1.15]">
              <span className="block text-[17px] font-bold tabular-nums">{reportCount}</span>
              <span className="block text-[11px] text-muted-foreground">Total Reports</span>
            </span>
          </div>
          <div className="flex items-center gap-2 px-2 min-w-0">
            <span className="h-10 w-10 shrink-0 rounded-full bg-[#55B97A]/15 flex items-center justify-center text-[#55B97A]">
              <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 leading-[1.15]">
              <span className="block text-[17px] font-bold tabular-nums">{verifiedCount}</span>
              <span className="block text-[11px] text-muted-foreground">Verified</span>
            </span>
          </div>
        </div>
        {/* Community split — part of the same instrument surface */}
        <div className="-mt-px grid grid-cols-[1.3fr_1fr_1fr] divide-x divide-[#889AAA]/[0.14] rounded-b-2xl border border-t-0 border-[#889AAA]/[0.14] bg-[#0A1620] h-9 text-[12.5px] font-semibold tabular-nums">
          <span className="flex items-center justify-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#EF4444]" />{badCount} bad</span>
          <span className="flex items-center justify-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#55B97A]" />{goodCount} good</span>
          <span className="flex items-center justify-center gap-1.5 text-[#A0B0BE]"><Eye className="h-3.5 w-3.5 text-[#889AAA]" strokeWidth={2} />{witnessCount} witness{witnessCount === 1 ? "" : "es"}</span>
        </div>
      </section>

      {/* ===== Primary CTA ===== */}
      <section className="container pt-3">
        <ReportModal
          trigger={
            <button
              type="button"
              className="relative w-full h-[58px] flex items-center justify-center gap-3 rounded-[14px] text-[#0B1017] text-[19px] font-bold tracking-[-0.01em] transition-[filter,transform] duration-150 hover:brightness-[1.03] active:translate-y-px active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{
                background: "linear-gradient(180deg, #F8AE2E 0%, #F5A623 60%, #EE9E1C 100%)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.28) inset, 0 -1px 0 rgba(0,0,0,0.10) inset, 0 4px 10px -2px rgba(0,0,0,0.5), 0 8px 16px -10px rgba(245,166,35,0.28)",
              }}
            >
              <Camera className="h-6 w-6" strokeWidth={2.25} />
              {hasReportedBefore ? "Report This Plate Again" : "Report This Plate"}
              <ChevronRight className="absolute right-4 h-5 w-5" strokeWidth={2.5} />
            </button>
          }
          initialPlate={plate.plateNumber}
        />
        <p className="text-center text-[12.5px] text-muted-foreground mt-2.5 leading-snug">
          {hasReportedBefore ? "Seen it again? Add a new report to help keep roads safer." : "Seen this driver? Add a report to help keep roads safer."}
        </p>
      </section>

      {/* ===== Top reported issues (real categories only) ===== */}
      {topIssues.length > 0 && (
        <section className="container pt-6">
          <h2 className="text-[19px] font-bold tracking-tight mb-2.5">Top Reported Issues</h2>
          <ul className="rounded-2xl bg-[#0D1B26] border border-[#889AAA]/[0.14] divide-y divide-[#889AAA]/[0.12] overflow-hidden">
            {topIssues.map(inf => {
              const Icon = iconFor(inf);
              const tone = toneFor(inf);
              const count = plate.infractions[inf.type];
              return (
                <li key={inf.type} className="flex items-center gap-3 px-3.5 h-[54px]">
                  <span className={`h-9 w-9 shrink-0 rounded-full border-2 flex items-center justify-center ${TONE_RING[tone]}`}>
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="flex-1 min-w-0 text-[15px] font-bold truncate">{inf.label}</span>
                  <span className="text-[13px] font-semibold text-muted-foreground tabular-nums shrink-0">{count} report{count === 1 ? "" : "s"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ===== Derived facts from the real report rows ===== */}
      {reports.length > 0 && (
        <section className="container pt-5">
          <div className="grid grid-cols-3 divide-x divide-[#889AAA]/[0.14] border-y border-[#889AAA]/[0.14] py-3">
            <div className="min-w-0 pr-2 leading-tight">
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"><Calendar className="h-3.5 w-3.5 text-[#889AAA] shrink-0" strokeWidth={1.75} />First Reported</span>
              <span className="block text-[12.5px] font-semibold mt-1 whitespace-nowrap">{firstReported ? format(firstReported, "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="min-w-0 px-2 leading-tight">
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"><Clock className="h-3.5 w-3.5 text-[#889AAA] shrink-0" strokeWidth={1.75} />Last Reported</span>
              <span className="block text-[12.5px] font-semibold mt-1 whitespace-nowrap">{lastReported ? format(lastReported, "MMM d, yyyy") : "—"}</span>
            </div>
            <div className="min-w-0 pl-2 leading-tight">
              <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-[#889AAA] shrink-0" strokeWidth={1.75} />Most Common</span>
              <span className="block text-[12.5px] font-semibold mt-1 truncate">{mostCommonArea ?? "—"}</span>
            </div>
          </div>
        </section>
      )}

      {/* ===== Recent reports — activity ledger ===== */}
      <section className="container pt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[19px] font-bold tracking-tight">Recent Reports</h2>
          <button
            type="button"
            onClick={() => setSortOrder(o => o === "newest" ? "oldest" : "newest")}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#A0B0BE] hover:text-foreground transition-colors"
          >
            <SortDesc className="h-3.5 w-3.5" />
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>

        {sortedReports.length === 0 && (
          <p className="text-[14px] text-muted-foreground py-4">No reports recorded.</p>
        )}

        <div className="relative">
          {sortedReports.length > 1 && (
            <div className="absolute left-[21px] top-8 bottom-8 w-px bg-[#889AAA]/[0.18]" aria-hidden />
          )}
          <ul className="divide-y divide-[#889AAA]/[0.10]">
            {sortedReports.map((report) => {
              const inf = INFRACTIONS.find(i => i.type === report.infraction);
              const Icon = report.infraction === "unspecified" || !inf ? Flag : iconFor(inf);
              const tone = report.infraction === "unspecified" ? "muted" : toneFor(inf);
              const pts = formatPoints(inf);
              const r = report as any;
              const hasCoords = !!(r.latitude && r.longitude);
              return (
                <li key={report.id} className="flex items-start gap-3 py-3">
                  <span className={`relative z-[1] mt-0.5 h-11 w-11 shrink-0 rounded-full border-2 flex items-center justify-center ring-4 ring-background ${TONE_RING[tone]}`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[16px] font-bold leading-tight">{infractionLabel(report.infraction, r.comment)}</p>
                      {pts && (
                        <span className={`text-[13px] font-bold tabular-nums ${TONE_TEXT[pts.tone]}`}>{pts.text}</span>
                      )}
                      {report.upvote_count >= 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#55B97A] border-[#55B97A]/40 gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                      {r.is_flagged && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#F5A623] border-[#F5A623]/40 gap-1">
                          <Flag className="h-2.5 w-2.5" /> Under Review
                        </Badge>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 truncate">
                      {format(new Date(report.created_at), "MMM d, yyyy")}
                      <span className="mx-1.5 text-[#889AAA]">·</span>
                      {report.location}
                    </p>
                    {r.comment && (
                      <p className="text-[13px] text-muted-foreground/90 mt-1 line-clamp-2">{r.comment}</p>
                    )}
                    {isOwner && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {r.is_flagged && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 border-[#F5A623]/40 text-[#F5A623] hover:text-[#F5A623]"
                            onClick={() => submitAppeal(report.id)}
                          >
                            <AlertTriangle className="h-3 w-3" /> Appeal
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setDisputeReportId(report.id)}
                        >
                          <Flag className="h-3 w-3" /> Dispute
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center shrink-0 mt-2 -mr-1">
                    <span className="inline-flex items-center gap-1 text-[12.5px] text-[#A0B0BE] tabular-nums">
                      <ThumbsUp className="h-[15px] w-[15px]" strokeWidth={2} /> {report.upvote_count}
                    </span>
                    {hasCoords ? (
                      <Link
                        to={`/map?lat=${r.latitude}&lng=${r.longitude}`}
                        className="h-8 w-8 inline-flex items-center justify-center text-[#889AAA] hover:text-foreground"
                        aria-label="View on map"
                        title="View on map"
                      >
                        <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
                      </Link>
                    ) : (
                      <span className="h-8 w-4" aria-hidden />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ===== Recent activity map — real coordinates from the latest located report ===== */}
      {latestLocated && (
        <section className="container pt-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="inline-flex items-center gap-2 text-[17px] font-bold tracking-tight">
              <MapPin className="h-[18px] w-[18px] text-[#889AAA]" strokeWidth={2} /> Recent Activity Map
            </h2>
            <Link
              to={`/map?lat=${latestLocated.latitude}&lng=${latestLocated.longitude}`}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#A0B0BE] hover:text-foreground transition-colors"
            >
              Open in Map <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="map-dark rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(136,154,170,0.12)] [&>div]:mt-0 [&>div]:rounded-2xl [&>div]:border-0">
            <LocationMiniMap latitude={latestLocated.latitude} longitude={latestLocated.longitude} label={latestLocated.location} height={190} />
          </div>
        </section>
      )}

      {disputeReportId && (
        <DisputeReportDialog
          open={!!disputeReportId}
          onClose={() => setDisputeReportId(null)}
          reportId={disputeReportId}
          plateNumber={plate.plateNumber}
        />
      )}
    </div>
  );
};

export default PlateDetail;
