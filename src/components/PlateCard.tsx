import { Link } from "react-router-dom";
import { MapPin, Clock, AlertTriangle } from "lucide-react";
import { PlateRecord } from "@/lib/types";
import { getScoreColor, getScoreBg } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import LicensePlate from "./LicensePlate";

interface PlateCardProps {
  plate: PlateRecord;
  rank?: number;
}

const PlateCard = ({ plate, rank }: PlateCardProps) => {
  return (
    <Link
      to={`/plate/${encodeURIComponent(plate.plateNumber)}`}
      className="group block rounded-xl glass p-4 transition-all hover:glow hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {rank && (
            <span className="text-xs font-semibold text-muted-foreground mb-1 block">
              #{rank}
            </span>
          )}
          <div className="flex items-center gap-2 mb-3">
            <LicensePlate plateNumber={plate.plateNumber} state={plate.state} size="sm" />
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
        <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${getScoreBg(plate.totalScore)}`}>
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
