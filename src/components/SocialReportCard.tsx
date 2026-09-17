import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { INFRACTIONS, infractionLabel } from "@/lib/data";
import { MapPin, ThumbsUp, MessageCircle, Flag, AlertCircle, ChevronRight } from "lucide-react";
import PlateChip from "./PlateChip";
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
  };
  hasUpvoted: boolean;
  votingId: string | null;
  onUpvote: (id: string) => void;
  index: number;
}

const SocialReportCard = ({ report, hasUpvoted, votingId, onUpvote, index }: SocialReportCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const inf = INFRACTIONS.find(i => i.type === report.infraction);
  const vehicleDesc = [report.vehicle_color, report.vehicle_type].filter(Boolean).join(" ");

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

  // PRIVACY-CRITICAL: this card intentionally does NOT render the reporter's identity.
  // Reports are public; the reporter stays anonymous. Do not add reporter name, username,
  // or avatar here — it would expose who flagged whom and chill participation.
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="bg-transparent"
    >
      {/* Row */}
      <div className="flex items-center gap-3 px-3 py-3">
        <Link to={`/plate/${encodeURIComponent(report.plate_number)}`} className="shrink-0 press">
          <PlateChip plateNumber={report.plate_number} state={report.state} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center text-[11px] font-black leading-none ${
                inf?.kind === "good" ? "bg-success text-[#07131C]" : report.infraction === "unspecified" ? "bg-[#889AAA] text-[#07131C]" : "bg-destructive text-white"
              }`}
              aria-hidden
            >
              {inf?.kind === "good" ? "+" : "!"}
            </span>
            <p className="text-[15px] font-bold truncate leading-tight">{infractionLabel(report.infraction, report.comment)}</p>
            {report.is_flagged && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/40 text-warning gap-1 shrink-0">
                <AlertCircle className="h-3 w-3" /> Review
              </Badge>
            )}
          </div>
          <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            <span className="mx-1.5 text-icon-muted">•</span>
            {report.location}
          </p>
          {report.comment && (
            <p className="text-[12.5px] text-muted-foreground/90 truncate mt-0.5">{report.comment}</p>
          )}
        </div>

        {/* Compact existing actions */}
        <div className="flex items-center shrink-0 -mr-1">
          <button
            type="button"
            disabled={votingId === report.id || hasUpvoted}
            onClick={() => onUpvote(report.id)}
            aria-label="Upvote report"
            className={`h-8 px-1.5 rounded-lg inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums transition-colors duration-150 disabled:opacity-100 ${hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            <ThumbsUp className="h-[18px] w-[18px]" strokeWidth={2} />
            {report.upvote_count}
          </button>
          <button
            type="button"
            onClick={() => setShowComments(v => !v)}
            aria-label="Comments"
            className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors duration-150 ${showComments ? "text-primary" : "text-icon-muted hover:text-foreground"}`}
          >
            <MessageCircle className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            disabled={flagged}
            onClick={() => setFlagOpen(true)}
            title="Flag as false report"
            aria-label="Flag as false report"
            className={`h-8 w-7 rounded-lg inline-flex items-center justify-center transition-colors duration-150 ${flagged ? "text-warning" : "text-icon-muted hover:text-warning"}`}
          >
            <Flag className="h-[15px] w-[15px]" strokeWidth={2} />
          </button>
          {(report.latitude && report.longitude) ? (
            <Link
              to={`/map?lat=${report.latitude}&lng=${report.longitude}`}
              className="h-8 w-7 inline-flex items-center justify-center text-icon-muted hover:text-foreground"
              title="View on map"
              aria-label="View on map"
            >
              <MapPin className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to={`/plate/${encodeURIComponent(report.plate_number)}`}
              className="h-8 w-7 inline-flex items-center justify-center text-icon-muted hover:text-foreground"
              aria-label="Open plate"
            >
              <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </Link>
          )}
        </div>
      </div>

      {/* Comment thread */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[#889AAA]/[0.12] overflow-hidden"
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
            <Button variant="destructive" onClick={handleFlag} disabled={flagging}>
              {flagging ? "Submitting..." : "Flag Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SocialReportCard;
