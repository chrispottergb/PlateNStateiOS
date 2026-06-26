import { Link } from "react-router-dom";
import LicensePlate from "./LicensePlate";
import { Badge } from "./ui/badge";
import { INFRACTIONS } from "@/lib/data";

interface FreshCatch {
  id: string;
  plate_number: string;
  state?: string | null;
  infraction: string;
  created_at: string;
}

interface FreshCatchesProps {
  reports: FreshCatch[];
}

const FreshCatches = ({ reports }: FreshCatchesProps) => {
  if (!reports.length) return null;

  const items = reports.slice(0, 10);
  // Render the list twice so the track can loop seamlessly: at -50% the second
  // copy lands exactly where the first started.
  const loop = [...items, ...items];
  // Slow, steady speed that scales with the number of cards (~4s per card).
  const duration = `${items.length * 4}s`;

  const renderCard = (r: FreshCatch, key: string) => {
    const inf = INFRACTIONS.find((inf) => inf.type === r.infraction);
    return (
      <Link
        key={key}
        to={`/plate/${encodeURIComponent(r.plate_number)}`}
        className="flex-shrink-0 mr-3"
      >
        <div className="flex flex-col items-center gap-2 group rounded-xl border border-border/40 bg-card/60 p-3 hover:border-border/60 transition-colors">
          <LicensePlate plateNumber={r.plate_number} state={r.state} size="sm" />
          <Badge
            variant={inf?.kind === "good" ? "default" : "destructive"}
            className="text-xs px-2 py-0.5 max-w-[90px] truncate"
          >
            {inf?.label || r.infraction}
          </Badge>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">
        🔥 Fresh Catches
      </h3>
      {/* Seamless right-to-left carousel. Pauses on hover/touch; respects reduced-motion. */}
      <div className="group relative overflow-hidden">
        <div
          className="flex w-max pb-2 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ ["--marquee-duration" as string]: duration }}
        >
          {loop.map((r, i) =>
            renderCard(r, `${i < items.length ? "a" : "b"}-${r.id}-${i}`)
          )}
        </div>
      </div>
    </div>
  );
};

export default FreshCatches;
