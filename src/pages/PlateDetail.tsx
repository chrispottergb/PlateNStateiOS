import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import ReportModal from "@/components/ReportModal";
import LicensePlate from "@/components/LicensePlate";
import { INFRACTIONS, infractionLabel, getScoreColor, getScoreBg } from "@/lib/data";
import { usePlateDetail } from "@/hooks/usePlateRecords";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, MapPin, Clock, ThumbsUp, Shield, ShieldCheck, ShieldAlert, FileText, CheckCircle2, SortDesc, Flag, Share2 } from "lucide-react";
import { getStateByCode } from "@/lib/usStates";
import StatCard from "@/components/StatCard";
import SectionHeader from "@/components/SectionHeader";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DisputeReportDialog } from "@/components/DisputeReportDialog";
import { toast } from "sonner";

const HIGH_RISK_INFRACTIONS = new Set([
  "road_rage", "hit_and_run", "dui_suspected", "wrong_way",
  "passing_school_bus", "brake_checking", "ran_red_light",
]);

// Shame points: high positive = bad driver, negative/zero = good or unknown.
const getSeverityLabel = (score: number, hasHighRiskInfraction = false) => {
  if (score >= 25 || hasHighRiskInfraction) return { label: "CRITICAL OFFENDER", short: "Critical", tone: "destructive" as const, color: "bg-destructive/15 text-destructive border-destructive/30" };
  if (score >= 12) return { label: "HIGH RISK", short: "High", tone: "destructive" as const, color: "bg-destructive/12 text-destructive border-destructive/30" };
  if (score >= 6) return { label: "MODERATE", short: "Moderate", tone: "warning" as const, color: "bg-warning/12 text-warning border-warning/30" };
  if (score > 0) return { label: "LOW RISK", short: "Low", tone: "warning" as const, color: "bg-warning/12 text-warning border-warning/30" };
  return { label: "CLEAN", short: "Clean", tone: "success" as const, color: "bg-success/12 text-success border-success/30" };
};

const TONE_TEXT = { destructive: "text-destructive", warning: "text-warning", success: "text-success" } as const;
const TONE_BANNER = {
  destructive: "border-destructive/30 bg-destructive/[0.08]",
  warning: "border-warning/30 bg-warning/[0.08]",
  success: "border-success/30 bg-success/[0.08]",
} as const;

const PlateDetail = () => {
  const { plateNumber } = useParams<{ plateNumber: string }>();
  const decoded = decodeURIComponent(plateNumber || "");
  const { plate, stats, reports, loading } = usePlateDetail(decoded);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isOwner, setIsOwner] = useState(false);
  const [disputeReportId, setDisputeReportId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !decoded) { setIsOwner(false); return; }
      const { data } = await supabase
        .from("claimed_plates")
        .select("id")
        .eq("user_id", user.id)
        .eq("plate_number", decoded.toUpperCase())
        .eq("paid", true)
        .maybeSingle();
      if (active) setIsOwner(!!data);
    })();
    return () => { active = false; };
  }, [decoded]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-6 max-w-2xl space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!plate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <LicensePlate plateNumber={decoded} size="lg" className="mx-auto mb-6" />
          <p className="text-muted-foreground mb-6">No reports found for this plate.</p>
          <ReportModal
            trigger={
              <Button size="lg" className="gap-2">
                <AlertTriangle className="h-4 w-4" /> Report this Plate
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
  const stateName = plate.state ? getStateByCode(plate.state).name : null;

  return (
    <div className="min-h-screen bg-background pb-nav">
      <Header />
      <div className="container py-3 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="inline-flex items-center gap-1.5 h-9 px-3 -ml-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Button
            size="icon"
            variant="secondary"
            onClick={sharePlate}
            className="h-9 w-9 rounded-lg"
            title="Share this plate report"
            aria-label="Share this plate report"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Plate Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center mb-5"
        >
          <LicensePlate plateNumber={plate.plateNumber} state={plate.state} size="lg" className="mx-auto" />
          <p className="mt-4 font-mono text-[26px] leading-none font-bold tracking-[0.12em]">{plate.plateNumber}</p>
          {stateName && (
            <p className="text-[13px] font-medium text-muted-foreground mt-1.5">{stateName}</p>
          )}

          {/* Safety Score Pill */}
          <div className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 max-w-full ${severity.color}`}>
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">Safety Score: {plate.totalScore}</span>
            <span className="text-[11px] font-medium opacity-80 whitespace-nowrap">/ {severity.label}</span>
          </div>
        </motion.div>

        {/* Stat Cards — good on the left, bad on the right, verdict in the middle.
            Counts come from get_plate_stats: score is the anti-gamed (weighted)
            total, and "witnesses" = DISTINCT reporters so sockpuppet spam is
            visibly pointless (40 reports · 2 witnesses reads as the scam it is). */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-3 gap-2 mb-2.5"
        >
          <StatCard icon={FileText} value={stats?.report_count ?? plate.reportCount} label="Total Reports" />
          <StatCard icon={ShieldAlert} value={severity.short} label="Risk Level" tone={severity.tone} />
          <StatCard icon={ShieldCheck} value={verifiedCount} label="Verified" tone="success" valueTone="default" />
        </motion.div>

        {/* Community status banner — score + good/bad split from get_plate_stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 mb-3 ${TONE_BANNER[severity.tone]}`}
        >
          <Shield className={`h-4 w-4 mt-0.5 shrink-0 ${TONE_TEXT[severity.tone]}`} />
          <div className="text-sm leading-snug">
            <p className="font-semibold">
              {badCount >= 2
                ? "This plate has multiple reports from the community. Drive with caution."
                : badCount === 1
                  ? "This plate has a report from the community."
                  : "No bad reports on record for this plate."}
            </p>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              Score <span className={`font-semibold ${getScoreColor(stats?.total_score ?? plate.totalScore)}`}>{stats?.total_score ?? plate.totalScore}</span>
              {" · "}{badCount} bad · {goodCount} good · {witnessCount} witness{witnessCount === 1 ? "" : "es"}
            </p>
          </div>
        </motion.div>

        {/* Primary CTA */}
        <div className="mb-7">
          <ReportModal
            trigger={
              <Button size="lg" className="w-full h-14 gap-2.5 text-[17px] rounded-[14px] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_10px_24px_-10px_rgba(245,166,35,0.7),0_2px_4px_rgba(0,0,0,0.4)]">
                <AlertTriangle className="!h-5 !w-5" /> Report This Plate Again
              </Button>
            }
            initialPlate={plate.plateNumber}
          />
        </div>

        {/* Top Infractions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mb-6"
        >
          <SectionHeader
            title="Top Infractions"
            action={
              <span className="inline-flex items-center gap-1 text-xs text-success font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> {verifiedCount} community-verified
              </span>
            }
          />
          <div className="flex flex-wrap gap-2">
            {INFRACTIONS.filter(inf => plate.infractions[inf.type] > 0)
              .sort((a, b) => plate.infractions[b.type] - plate.infractions[a.type])
              .map(inf => (
                <Badge
                  key={inf.type}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs gap-2 text-foreground"
                >
                  <span>{inf.label}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${inf.kind === "good" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{plate.infractions[inf.type]}</span>
                </Badge>
              ))}
          </div>
        </motion.div>

        {/* Report History */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <SectionHeader
            title="Report History"
            action={
              <button
                onClick={() => setSortOrder(o => o === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold border border-border/60 bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <SortDesc className="h-3.5 w-3.5" />
                {sortOrder === "newest" ? "Newest" : "Oldest"}
              </button>
            }
          />
          <div className="relative">
            {sortedReports.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No reports recorded.</p>
            )}
            {sortedReports.length > 1 && (
              <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border" aria-hidden />
            )}
            <div className="space-y-2.5">
            {sortedReports.map((report, i) => {
              const inf = INFRACTIONS.find(i => i.type === report.infraction);
              const dotClass = inf?.kind === "good"
                ? "bg-success/15 text-success border-success/30"
                : inf
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : "bg-secondary text-muted-foreground border-border";
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 6) * 0.02 }}
                  className="relative flex gap-3"
                >
                  <div className={`relative z-[1] mt-2.5 h-8 w-8 shrink-0 rounded-full border flex items-center justify-center ring-4 ring-background ${dotClass}`}>
                    {inf?.kind === "good" ? <ThumbsUp className="h-3.5 w-3.5" /> : inf ? <AlertTriangle className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0 rounded-xl bg-card border border-border/40 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="text-sm font-bold leading-snug">{infractionLabel(report.infraction, (report as any).comment)}</span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                          <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {(report as any).comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{(report as any).comment}</p>
                      )}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {(inf?.points ?? 0) !== 0 && (
                          <span className={`text-xs font-mono font-semibold ${(inf?.points ?? 0) > 0 ? "text-destructive" : "text-success"}`}>{(inf?.points ?? 0) > 0 ? "+" : ""}{inf?.points} pts</span>
                        )}
                        {report.upvote_count >= 3 && (
                          <Badge variant="outline" className="text-[11px] text-success border-success/30 gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                          </Badge>
                        )}
                        {(report as any).is_flagged && (
                          <Badge variant="outline" className="text-[11px] text-warning border-warning/40 gap-1">
                            <Flag className="h-2.5 w-2.5" /> Under Review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{report.location}</span>
                        </span>
                      </div>
                      {(report as any).latitude && (report as any).longitude && (
                        <div className="map-dark">
                          <LocationMiniMap latitude={(report as any).latitude} longitude={(report as any).longitude} height={120} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <ThumbsUp className="h-3 w-3" /> {report.upvote_count}
                      </span>
                      {isOwner && (report as any).is_flagged && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 border-warning/40 text-warning hover:text-warning"
                          onClick={() => submitAppeal(report.id)}
                        >
                          <AlertTriangle className="h-3 w-3" /> Appeal
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setDisputeReportId(report.id)}
                        >
                          <Flag className="h-3 w-3" /> Dispute
                        </Button>
                      )}
                    </div>
                  </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        </motion.div>
      </div>

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
