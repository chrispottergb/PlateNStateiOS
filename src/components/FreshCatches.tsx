import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import LicensePlate from "./LicensePlate";
import { Badge } from "./ui/badge";
import { INFRACTIONS } from "@/lib/data";
import { motion } from "framer-motion";

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

const scrollPositions = new Map<string, number>();
const SCROLL_KEY = "fresh-catches";

const FreshCatches = ({ reports }: FreshCatchesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const saved = scrollPositions.get(SCROLL_KEY);
    if (saved !== undefined) {
      el.scrollLeft = saved;
    }

    if (reports.length <= 3) return;

    let raf: number;
    let paused = false;

    const step = () => {
      if (!paused && el.scrollLeft < el.scrollWidth - el.clientWidth) {
        el.scrollLeft += 0.5;
      } else if (!paused) {
        el.scrollLeft = 0;
      }
      scrollPositions.set(SCROLL_KEY, el.scrollLeft);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    return () => {
      scrollPositions.set(SCROLL_KEY, el.scrollLeft);
      cancelAnimationFrame(raf);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, [reports.length]);

  if (!reports.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">
        🔥 Fresh Catches
      </h3>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
        {reports.slice(0, 10).map((r, i) => {
          const inf = INFRACTIONS.find(inf => inf.type === r.infraction);
          return (
            <Link key={r.id} to={`/plate/${encodeURIComponent(r.plate_number)}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
              >
                <div className="rounded-full p-[2px] bg-gradient-to-br from-primary via-destructive to-accent">
                  <div className="rounded-full bg-background p-2">
                    <LicensePlate plateNumber={r.plate_number} state={r.state} size="sm" />
                  </div>
                </div>
                <Badge
                  variant={inf?.kind === "good" ? "default" : "destructive"}
                  className="text-[9px] px-1.5 py-0 max-w-[80px] truncate"
                >
                  {inf?.label || r.infraction}
                </Badge>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FreshCatches;
