import { BADGES } from "@/lib/data";
import { BadgeType } from "@/lib/types";
import { Flag, Eye, Telescope, Trophy, Flame } from "lucide-react";

const BADGE_ICONS: Record<string, React.ReactNode> = {
  Flag: <Flag className="h-5 w-5" />,
  Eye: <Eye className="h-5 w-5" />,
  Telescope: <Telescope className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  Flame: <Flame className="h-5 w-5" />,
};

interface BadgeDisplayProps {
  earnedBadges: BadgeType[];
}

const BadgeDisplay = ({ earnedBadges }: BadgeDisplayProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {BADGES.map(badge => {
        const earned = earnedBadges.includes(badge.type);
        return (
          <div
            key={badge.type}
            className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all ${
              earned
                ? "glass glow text-foreground"
                : "bg-muted/30 text-muted-foreground opacity-40"
            }`}
          >
            <div className={`rounded-full p-2 ${earned ? "bg-primary/10 text-primary" : "bg-muted"}`}>
              {BADGE_ICONS[badge.icon]}
            </div>
            <span className="text-xs font-semibold">{badge.label}</span>
            <span className="text-xs leading-tight">{badge.description}</span>
          </div>
        );
      })}
    </div>
  );
};

export default BadgeDisplay;
