import { Link } from "react-router-dom";
import LicensePlate from "./LicensePlate";
import { motion } from "framer-motion";

interface FreshCatch {
  id: string;
  plate_number: string;
  state?: string | null;
  infraction: string;
  created_at: string;
  state?: string | null;
}

interface FreshCatchesProps {
  reports: FreshCatch[];
}

const FreshCatches = ({ reports }: FreshCatchesProps) => {
  if (!reports.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">
        🔥 Fresh Catches
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {reports.slice(0, 10).map((r, i) => (
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
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors max-w-[60px] truncate">
                {r.plate_number}
              </span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FreshCatches;
