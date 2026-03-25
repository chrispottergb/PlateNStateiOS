import { Trophy, Flame } from "lucide-react";
import WisconsinPlate from "./WisconsinPlate";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface DriverOfTheWeekProps {
  plateNumber: string;
  reportCount: number;
  topInfraction: string;
}

const DriverOfTheWeek = ({ plateNumber, reportCount, topInfraction }: DriverOfTheWeekProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl p-[2px] bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 overflow-hidden"
    >
      {/* Inner card */}
      <div className="rounded-[14px] bg-background p-6 space-y-4">
        {/* Title */}
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-extrabold tracking-tight gradient-text">
            Worst Driver of the Week
          </h3>
          <Flame className="h-5 w-5 text-red-500 animate-pulse" />
        </div>

        {/* Plate */}
        <Link
          to={`/plate/${encodeURIComponent(plateNumber)}`}
          className="block w-fit mx-auto hover:scale-105 transition-transform"
        >
          <WisconsinPlate plateNumber={plateNumber} size="lg" />
        </Link>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-foreground">{reportCount}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Reports</p>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{topInfraction}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Top Violation</p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground italic">
          "Congratulations, nobody wanted this award." 🏆
        </p>
      </div>
    </motion.div>
  );
};

export default DriverOfTheWeek;
