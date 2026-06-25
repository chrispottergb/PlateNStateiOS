import { Trophy, Flame } from "lucide-react";
import LicensePlate from "./LicensePlate";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface DriverOfTheWeekProps {
  plateNumber: string;
  reportCount: number;
  topInfraction: string;
  state?: string | null;
}

const DriverOfTheWeek = ({ plateNumber, reportCount, topInfraction, state }: DriverOfTheWeekProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Animated gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-warning via-destructive to-primary animate-glow-pulse" />

      {/* Inner card */}
      <div className="relative m-[2px] rounded-[14px] bg-background p-6 space-y-4">
        {/* Title */}
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h3 className="text-lg font-extrabold tracking-tight gradient-text-fire">
            Worst Driver of the Week
          </h3>
          <Flame className="h-5 w-5 text-destructive animate-pulse" />
        </div>

        {/* Plate */}
        <Link
          to={`/plate/${encodeURIComponent(plateNumber)}`}
          className="block w-fit mx-auto hover:scale-105 transition-transform"
        >
          <LicensePlate plateNumber={plateNumber} state={state} size="lg" />
        </Link>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-foreground">{reportCount}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Reports</p>
          </div>
          <div className="h-8 w-px bg-border/30" />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{topInfraction}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Top Violation</p>
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
