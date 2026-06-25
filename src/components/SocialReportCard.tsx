import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { INFRACTIONS } from "@/lib/data";
import { MapPin, ThumbsUp, MessageCircle, Flag, AlertCircle, Car } from "lucide-react";
import MiniMapThumb from "./MiniMapThumb";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden hover:border-border/60 transition-colors"
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Left side — plate, infraction, vehicle */}
          <div className="flex-1 min-w-0 space-y-2">
            <Link to={`/plate/${encodeURIComponent(report.plate_number)}`} className="inline-block hover:scale-105 transition-transform">
              <LicensePlate plateNumber={report.plate_number} state={report.state} size="sm" />
            </Link>
            <div className="flex items-center gap-2">
              <Badge
                variant={inf?.kind === "good" ? "default" : "destructive"}
                className="text-xs rounded-lg"
              >
                {inf?.label || report.infraction}
              </Badge>
              {report.is_flagged && (
                <Badge variant="outline" className="text-xs rounded-lg border-amber-500/40 text-amber-500 gap-1">
                  <AlertCircle className="h-3 w-3" /> Review
                </Badge>
              )}
            </div>
            {vehicleDesc && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Car className="h-3 w-3 shrink-0" />
                <span>{vehicleDesc}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </div>
          </div>

          {/* Right side — map + location */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <MiniMapThumb latitude={report.latitude} longitude={report.longitude} location={report.location} size={72} />
            <span className="text-xs text-muted-foreground text-center max-w-[80px] truncate">
              {report.location}
            </span>
          </div>
        </div>

        {/* Comment */}
        {report.comment && (
          <p className="text-sm text-muted-foreground italic mt-3">
            "{report.comment}"
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border/20">
        <Button
          variant={hasUpvoted ? "default" : "ghost"}
          size="sm"
          className={`h-8 px-3 gap-1.5 rounded-full text-xs ${hasUpvoted ? "" : "text-muted-foreground hover:text-primary"}`}
          disabled={votingId === report.id || hasUpvoted}
          onClick={() => onUpvote(report.id)}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span className="font-mono">{report.upvote_count}</span>
        </Button>
        <button
          onClick={() => setShowComments(v => !v)}
          className={`h-8 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors ${showComments ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Comment
        </button>
        <div className="ml-auto">
          <button
            disabled={flagged}
            onClick={() => setFlagOpen(true)}
            title="Flag as false report"
            className={`h-8 px-2 rounded-full transition-colors ${flagged ? "text-amber-500" : "text-muted-foreground hover:text-amber-500 hover:bg-muted/50"}`}
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Comment thread */}
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
