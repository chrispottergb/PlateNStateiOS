import { Link } from "react-router-dom";
import { TrendingUp, Flame } from "lucide-react";
import { motion } from "framer-motion";

interface TrendingPlate {
  plateNumber: string;
  reportCount: number;
  topInfraction: string;
}

interface TrendingPlatesProps {
  plates: TrendingPlate[];
}

const TrendingPlates = ({ plates }: TrendingPlatesProps) => {
  if (!plates.length) return null;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Trending Plates</h3>
        <Flame className="h-3.5 w-3.5 text-destructive animate-pulse ml-auto" />
      </div>
      <div className="space-y-1">
        {plates.slice(0, 5).map((plate, i) => (
          <Link key={plate.plateNumber} to={`/plate/${encodeURIComponent(plate.plateNumber)}`}>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-primary/5 transition-all group"
            >
              <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                  {plate.plateNumber}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {plate.topInfraction}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-foreground">{plate.reportCount}</p>
                <p className="text-[9px] text-muted-foreground">reports</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TrendingPlates;
