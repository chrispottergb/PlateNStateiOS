import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
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
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[22px] font-bold tracking-tight">Trending Plates</h3>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#A0B0BE]">
          <Flame className="h-3.5 w-3.5 text-destructive" /> Hot
        </span>
      </div>
      <div className="divide-y divide-[#889AAA]/[0.12]">
        {plates.slice(0, 5).map((plate, i) => (
          <Link key={plate.plateNumber} to={`/plate/${encodeURIComponent(plate.plateNumber)}`}>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 px-1 py-3 hover:bg-white/[0.03] transition-colors duration-150 group"
            >
              <span className={`text-[13px] font-bold w-6 tabular-nums ${i === 0 ? "text-primary" : "text-[#889AAA]"}`}>#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[15px] font-bold tracking-[0.04em] group-hover:text-primary transition-colors">
                  {plate.plateNumber}
                </p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {plate.topInfraction}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-bold text-foreground tabular-nums">{plate.reportCount}</p>
                <p className="text-[11px] text-muted-foreground">reports</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TrendingPlates;
