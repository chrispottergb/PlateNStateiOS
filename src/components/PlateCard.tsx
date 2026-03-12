import { Link } from "react-router-dom";
import { MapPin, Clock, AlertTriangle } from "lucide-react";
import { PlateRecord } from "@/lib/types";
import { getScoreColor, getScoreBg } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";

interface PlateCardProps {
  plate: PlateRecord;
  rank?: number;
}

const PlateCard = ({ plate, rank }: PlateCardProps) => {
  return (
    <Link
      to={`/plate/${encodeURIComponent(plate.plateNumber)}`}
      className="group block rounded-lg bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {rank && (
            <span className="text-xs font-medium text-muted-foreground mb-1 block">
              #{rank}
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-lg font-bold tracking-wider text-foreground group-hover:text-primary transition-colors">
              {plate.plateNumber}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {plate.reportCount} reports
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {plate.lastLocation}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(plate.lastReported), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className={`flex flex-col items-center rounded-lg px-3 py-2 ${getScoreBg(plate.totalScore)}`}>
          <span className={`text-2xl font-bold font-mono ${getScoreColor(plate.totalScore)}`}>
            {plate.totalScore}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">score</span>
        </div>
      </div>
    </Link>
  );
};

export default PlateCard;
