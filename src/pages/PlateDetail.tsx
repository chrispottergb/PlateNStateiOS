import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import ReportModal from "@/components/ReportModal";
import LicensePlate from "@/components/LicensePlate";
import { INFRACTIONS, getScoreColor, getScoreBg } from "@/lib/data";
import { usePlateDetail } from "@/hooks/usePlateRecords";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, MapPin, Clock, ThumbsUp, MessageSquare, Shield, BarChart3, CheckCircle2, SortDesc, Flag, Share2 } from "lucide-react";
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

const getSeverityLabel = (score: number, hasHighRiskInfraction = false) => {
  if (score >= 40) return { label: "CRITICAL OFFENDER", color: "bg-destructive/15 text-destructive border-destructive/30" };
  if (score >= 25 || hasHighRiskInfraction) return { label: "HIGH RISK", color: "bg-orange-500/15 text-orange-500 border-orange-500/30" };
  if (score >= 15) return { label: "MODERATE", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
  return { label: "LOW RISK", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" };
};

const PlateDetail = () => {
  const { plateNumber } = useParams<{ plateNumber: string }>();
  const decoded = decodeURIComponent(plateNumber || "");
  const { plate, reports, loading } = usePlateDetail(decoded);
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
              <Button className="gap-2 rounded-full glow">
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="container py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Plate Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="relative inline-block mb-4">
            <LicensePlate plateNumber={plate.plateNumber} state={plate.state} size="lg" />
            <Button
              size="sm"
              variant="ghost"
              onClick={sharePlate}
              className="absolute -top-2 -right-10 rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Share this plate report"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Safety Score Pill */}
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 ${severity.color}`}>
            <Shield className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Safety Score: {plate.totalScore}</span>
            <span className="text-xs font-medium opacity-80">/ {severity.label}</span>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="rounded-xl glass-card p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold font-mono">{plate.reportCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Reports</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className={`text-2xl font-bold font-mono ${getScoreColor(plate.totalScore)}`}>{plate.totalScore}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Score</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold font-mono">{verifiedCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Verified</p>
          </div>
        </motion.div>

        {/* Top Infractions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Top Infractions</h2>
          <div className="flex flex-wrap gap-2">
            {INFRACTIONS.filter(inf => plate.infractions[inf.type] > 0)
              .sort((a, b) => plate.infractions[b.type] - plate.infractions[a.type])
              .map(inf => (
                <Badge
                  key={inf.type}
                  variant="secondary"
                  className="rounded-full px-3 py-1.5 text-xs gap-1.5"
                >
                  <span>{inf.label}</span>
                  <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-xs font-bold">{plate.infractions[inf.type]}</span>
                </Badge>
              ))}
          </div>
        </motion.div>

        {/* Report History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Report History</h2>
            <button
              onClick={() => setSortOrder(o => o === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <SortDesc className="h-3.5 w-3.5" />
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
          <div className="space-y-2">
            {sortedReports.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No reports recorded.</p>
            )}
            {sortedReports.map((report, i) => {
              const inf = INFRACTIONS.find(i => i.type === report.infraction);
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl glass-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="rounded-full text-xs">{inf?.label || report.infraction}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">+{inf?.points ?? 3} pts</span>
                        {report.upvote_count >= 3 && (
                          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                          </Badge>
                        )}
                        {(report as any).is_flagged && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/40 gap-0.5">
                            <Flag className="h-2.5 w-2.5" /> Under Review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {report.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {(report as any).latitude && (report as any).longitude && (
                        <LocationMiniMap latitude={(report as any).latitude} longitude={(report as any).longitude} height={120} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" /> {report.upvote_count}
                      </span>
                      {isOwner && (report as any).is_flagged && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 border-amber-500/40 text-amber-500 hover:text-amber-600"
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
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50">
        <div className="container max-w-2xl">
          <ReportModal
            trigger={
              <Button className="w-full gap-2 rounded-full glow h-12 text-base">
                <AlertTriangle className="h-5 w-5" /> Report This Plate Again
              </Button>
            }
            initialPlate={plate.plateNumber}
          />
        </div>
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
