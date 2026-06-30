import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { INFRACTIONS } from "@/lib/data";
import {
  MapPin, ThumbsUp, MessageCircle, Flag, AlertCircle,
  Car, Truck, Bus, Bike, HelpCircle, ShieldCheck, UserCircle2,
} from "lucide-react";
import LicensePlate from "./LicensePlate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import CommentThread from "./CommentThread";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface SocialReportCardProps {
  report: {
    id: string;
    plate_number: string;
    infraction: string;
    location: string;
    created_at: string;
    upvote_count: number;
    vehicle_type?: string | null;
    vehicle_color?: string | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    vehicle_features?: string[] | null;
    comment?: string | null;
    is_flagged?: boolean;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    reporter_name?: string | null;
  };
  hasUpvoted: boolean;
  votingId: string | null;
  onUpvote: (id: string) => void;
  index: number;
}

// PRIVACY-CRITICAL (revised): the card now shows a pseudonymous username byline.
// Reporter identity = profiles.display_name (server-guaranteed random handle unless
// the user explicitly picked one). Never render real name, email, or device ID.
// Once reporter_id is auto-nulled (~30 days, per data_minimization migration), the
// byline falls back to a stable "Anonymous patroller"-style label — honors the
// Terms promise that we anonymize the reporter ID after 30 days.

// Stable-anonymous label derived from the report id so repeated renders don't flicker.
const ANON_LABELS = [
  "Anonymous patroller",
  "A concerned citizen",
  "Whistleblower",
  "Mystery snitch",
  "Some hero",
  "Unidentified tattler",
];
const stableAnon = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ANON_LABELS[Math.abs(h) % ANON_LABELS.length];
};

// Map a reported vehicle_type → lucide icon. Conservative defaults — when in doubt, Car.
const vehicleIcon = (type?: string | null) => {
  const t = (type || "").toLowerCase();
  if (t.includes("truck") || t.includes("pickup") || t.includes("suv")) return Truck;
  if (t.includes("bus") || t.includes("van")) return Bus;
  if (t.includes("motor") || t.includes("bike") || t.includes("cycle")) return Bike;
  if (t === "" || t === "unknown") return HelpCircle;
  return Car;
};

// Tint the vehicle icon by reported color. Falls back to a neutral steel.
const COLOR_MAP: Record<string, string> = {
  red:    "#cc4444",
  orange: "#d97c2a",
  yellow: "#d4b020",
  green:  "#4a8a5a",
  blue:   "#3d7ab8",
  purple: "#7a4ab8",
  pink:   "#c474a0",
  brown:  "#7a5230",
  white:  "#e6e6e0",
  silver: "#b8b8b8",
  gray:   "#8a8a8e",
  grey:   "#8a8a8e",
  black:  "#3a3a3e",
  gold:   "#b8923a",
};
const tintFor = (color?: string | null) => {
  const c = (color || "").toLowerCase().trim();
  return COLOR_MAP[c] || "#7a7a82";
};

const SocialReportCard = ({ report, hasUpvoted, votingId, onUpvote, index }: SocialReportCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const inf = INFRACTIONS.find(i => i.type === report.infraction);
  const isGood = inf?.kind === "good";
  const VIcon = vehicleIcon(report.vehicle_type);
  const tint = tintFor(report.vehicle_color);
  const vehicleLabel = [report.vehicle_color, report.vehicle_type].filter(Boolean).join(" ").trim().toUpperCase();

  const reporterDisplay = report.reporter_name?.trim()
    ? { name: report.reporter_name.trim(), anonymous: false }
    : { name: stableAnon(report.id), anonymous: true };

  const handleFlag = async () => {
    setFlagging(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in to flag"); setFlagging(false); return; }
    const { error } = await supabase.from("report_flags").insert({
      report_id: report.id,
      user_id: user.id,
      reason: flagReason.trim() || null,
    });
    setFlagging(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "You already flagged this report" : "Failed to flag");
      return;
    }
    setFlagged(true);
    setFlagOpen(false);
    toast.success("Report flagged for review");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-border/60 transition-colors"
    >
      {/* 3-zone main row */}
      <div className="flex" style={{ minHeight: 120 }}>
        {/* ZONE 1 — vehicle render (tinted to reported color) */}
        <div className="relative shrink-0 w-[92px] bg-muted/40 flex items-center justify-center overflow-hidden">
          <VIcon className="h-12 w-12" style={{ color: tint }} aria-hidden />
          {vehicleLabel && (
            <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-center bg-black/70 text-white text-[8px] font-semibold tracking-wider px-1.5 py-0.5 rounded-md">
              {vehicleLabel}
            </span>
          )}
          {(report.latitude && report.longitude) && (
            <Link
              to={`/map?lat=${report.latitude}&lng=${report.longitude}`}
              className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              title="View on map"
              aria-label="Open on map"
            >
              <MapPin className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>

        {/* ZONE 2 — info (flex) */}
        <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between gap-2">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                className={`text-[10px] rounded-full font-semibold px-2 py-0.5 border-0 ${
                  isGood
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-amber-500/15 text-amber-300"
                }`}
              >
                {inf?.label || report.infraction}
              </Badge>
              {report.is_flagged && (
                <Badge variant="outline" className="text-[10px] rounded-full border-amber-500/40 text-amber-400 gap-1 px-1.5 py-0">
                  <AlertCircle className="h-2.5 w-2.5" /> Review
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <MapPin className="h-3 w-3 shrink-0 text-amber-400/80" />
              <span className="truncate">{report.location}</span>
            </div>
            <div className="text-[11px] text-muted-foreground/80">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </div>
            {report.comment && (
              <p className="text-[11px] text-muted-foreground italic line-clamp-2 leading-snug">
                "{report.comment}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <button
              disabled={votingId === report.id || hasUpvoted}
              onClick={() => onUpvote(report.id)}
              className={`flex items-center gap-1 transition-colors ${hasUpvoted ? "text-sky-400" : "hover:text-foreground"}`}
            >
              <ThumbsUp className="h-3 w-3" />
              <span>{hasUpvoted ? "Confirmed" : "Confirm"}</span>
            </button>
            <button
              onClick={() => setShowComments(v => !v)}
              className={`flex items-center gap-1 transition-colors ${showComments ? "text-foreground" : "hover:text-foreground"}`}
            >
              <MessageCircle className="h-3 w-3" />
              Comment
            </button>
            <button
              disabled={flagged}
              onClick={() => setFlagOpen(true)}
              className={`flex items-center gap-1 ml-auto transition-colors ${flagged ? "text-amber-400" : "hover:text-amber-400"}`}
              aria-label="Flag false report"
            >
              <Flag className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ZONE 3 — plate hero + votes */}
        <div className="shrink-0 w-[132px] border-l border-border/40 flex flex-col items-center justify-center gap-2.5 px-2 py-2">
          <Link to={`/plate/${encodeURIComponent(report.plate_number)}`} className="block">
            <LicensePlate plateNumber={report.plate_number} state={report.state} size="sm" />
          </Link>
          <div className="flex items-center gap-1.5">
            <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? "text-sky-400" : "text-sky-500/80"}`} />
            <span className="text-base font-bold tabular-nums text-sky-400">{report.upvote_count}</span>
          </div>
        </div>
      </div>

      {/* REPORTER ATTRIBUTION FOOTER */}
      <div className="flex items-center justify-between gap-2 border-t border-border/30 bg-background/40 px-3 py-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {reporterDisplay.anonymous ? (
            <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          ) : (
            <span className="h-4 w-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[9px] font-bold shrink-0">
              {reporterDisplay.name[0].toUpperCase()}
            </span>
          )}
          <span className={`text-[11px] truncate ${reporterDisplay.anonymous ? "text-muted-foreground/70 italic" : "text-foreground/80 font-medium"}`}>
            {reporterDisplay.name}
          </span>
        </div>
        {!reporterDisplay.anonymous && (
          <Badge className="text-[9px] rounded-full bg-amber-500/15 text-amber-300 border-0 px-1.5 py-0 gap-1 font-medium shrink-0">
            <ShieldCheck className="h-2.5 w-2.5" /> Patroller
          </Badge>
        )}
      </div>

      {/* Comment thread (expandable) */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/20 overflow-hidden"
          >
            <CommentThread reportId={report.id} />
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Flag as false report</DialogTitle>
          </DialogHeader>
          <Textarea
            value={flagReason}
            onChange={e => setFlagReason(e.target.value)}
            placeholder="Why is this report false? (optional)"
            maxLength={500}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagOpen(false)}>Cancel</Button>
            <Button onClick={handleFlag} disabled={flagging} className="bg-amber-600 hover:bg-amber-700 text-white">
              {flagging ? "Submitting..." : "Flag Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SocialReportCard;
