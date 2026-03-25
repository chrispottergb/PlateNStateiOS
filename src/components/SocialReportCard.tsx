import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { INFRACTIONS } from "@/lib/data";
import { MapPin, ThumbsUp, MessageCircle, Share2, Car } from "lucide-react";
import WisconsinPlate from "./WisconsinPlate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import CommentThread from "./CommentThread";
const FUNNY_BADGES: Record<string, string> = {
  reckless: "🏎️ Speed Demon",
  tailgating: "🐌 Personal Space Invader",
  running_red: "🚦 Red Means Go, Apparently",
  no_signal: "💡 Turn Signal Allergic",
  road_rage: "😤 Road Rager",
  illegal_parking: "🎨 Parking Picasso",
  phone_use: "📱 Textaholic",
  dui: "🍺 Happy Hour Hero",
  hit_and_run: "🏃 Ghost Driver",
  other: "🤷 Mystery Menace",
};

const REACTIONS = [
  { emoji: "😂", label: "LOL" },
  { emoji: "🤦", label: "Facepalm" },
  { emoji: "🚨", label: "Yikes" },
  { emoji: "💀", label: "Dead" },
  { emoji: "🤡", label: "Clown" },
  { emoji: "😤", label: "Rage" },
];

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
  };
  hasUpvoted: boolean;
  votingId: string | null;
  onUpvote: (id: string) => void;
  index: number;
}

const SocialReportCard = ({ report, hasUpvoted, votingId, onUpvote, index }: SocialReportCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const inf = INFRACTIONS.find((i) => i.type === report.infraction);
  const funnyBadge = FUNNY_BADGES[report.infraction] || FUNNY_BADGES.other;

  const vehicleDesc = [report.vehicle_color, report.vehicle_type, report.vehicle_make, report.vehicle_model]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card overflow-hidden hover:shadow-[0_0_30px_-8px_hsl(var(--glow-primary)/0.15)] transition-all duration-300 group"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-sm ring-1 ring-foreground/5">
          🚗
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Anonymous Reporter</p>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] rounded-full shrink-0 bg-primary/10 text-primary border-primary/20 border">
          {funnyBadge}
        </Badge>
      </div>

      {/* Plate & infraction */}
      <div className="px-4 py-3 space-y-2">
        <Link to={`/plate/${encodeURIComponent(report.plate_number)}`} className="block w-fit mx-auto group-hover:scale-105 transition-transform">
          <WisconsinPlate plateNumber={report.plate_number} size="sm" />
        </Link>

        {/* Vehicle description */}
        {vehicleDesc && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Car className="h-3 w-3" />
            <span>{vehicleDesc}</span>
          </div>
        )}

        {/* Vehicle features badges */}
        {report.vehicle_features && report.vehicle_features.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {report.vehicle_features.map(feat => (
              <Badge key={feat} variant="outline" className="text-[9px] px-1.5 py-0 rounded-full border-accent/30 text-accent-foreground/70">
                {feat}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-sm text-center font-semibold text-foreground">
          {inf?.label || report.infraction}
        </p>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{report.location}</span>
        </div>

        {/* Comment */}
        {report.comment && (
          <p className="text-xs text-muted-foreground italic text-center px-2 pt-1 border-t border-border/20">
            "{report.comment}"
          </p>
        )}
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-0.5 px-3 py-2.5 border-t border-border/20">
        {REACTIONS.map((r) => (
          <button
            key={r.emoji}
            className="flex items-center gap-0.5 rounded-full px-1.5 py-1 text-xs hover:bg-muted/60 hover:scale-110 transition-all"
            title={r.label}
          >
            <span>{r.emoji}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant={hasUpvoted ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2 gap-1 rounded-full text-xs ${hasUpvoted ? "glow" : "text-muted-foreground hover:text-primary"}`}
            disabled={votingId === report.id || hasUpvoted}
            onClick={() => onUpvote(report.id)}
          >
            <ThumbsUp className="h-3 w-3" />
            <span className="font-mono text-[11px]">{report.upvote_count}</span>
          </Button>
          <button className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
          <button className="p-1.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SocialReportCard;
