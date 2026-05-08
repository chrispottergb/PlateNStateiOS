import { useMemo, useState } from "react";
import { Skull, ArrowLeft, AlertTriangle, MapPin, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import WisconsinPlate from "@/components/WisconsinPlate";
import ReportModal from "@/components/ReportModal";
import { useWallOfShame } from "@/hooks/useWallOfShame";
import { INFRACTIONS } from "@/lib/data";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHomeState } from "@/hooks/useHomeState";

const WallOfShame = () => {
  const { homeState } = useHomeState();
  const [showAllStates, setShowAllStates] = useState(false);
  const activeState = showAllStates ? null : homeState;
  const { rows, loading } = useWallOfShame(activeState, 20);

  const driverOfTheWeek = useMemo(() => {
    if (!rows.length) return null;
    const top = rows[0];
    const topInf = INFRACTIONS.find((i) => i.type === top.top_infraction);
    return {
      plateNumber: top.plate_number,
      totalScore: top.total_score,
      reportCount: top.report_count,
      topInfraction: topInf?.label || top.top_infraction || "Various",
      lastLocation: new Date(top.last_reported_at).toLocaleDateString(),
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="container py-10 space-y-8 max-w-4xl">
        <div className="flex items-center gap-3">
          <Link to="/a-hole-patrol">
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              <span className="text-3xl">💀</span>
              <span className="gradient-text">Wall of Shame</span>
            </h1>
            <p className="text-sm text-muted-foreground">The most "gifted" drivers — refreshed every 5 min</p>
          </div>
        </div>

        {driverOfTheWeek && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
            style={{
              background: "linear-gradient(135deg, hsl(0 84% 60% / 0.15), hsl(38 92% 50% / 0.1), hsl(330 80% 55% / 0.08))",
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-destructive/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <Badge variant="destructive" className="mb-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-widest font-bold gap-1.5">
                <Crown className="h-3 w-3" /> Worst of the Week
              </Badge>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link to={`/plate/${encodeURIComponent(driverOfTheWeek.plateNumber)}`}>
                  <WisconsinPlate plateNumber={driverOfTheWeek.plateNumber} size="lg" className="hover:scale-105 transition-transform" />
                </Link>
                <div className="text-center sm:text-left space-y-2">
                  <p className="text-4xl font-black font-mono gradient-text-fire">{driverOfTheWeek.totalScore} pts</p>
                  <p className="text-sm text-muted-foreground">
                    Top sin: <span className="font-semibold text-foreground">{driverOfTheWeek.topInfraction}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
                    <MapPin className="h-3 w-3" /> Last reported {driverOfTheWeek.lastLocation}
                  </p>
                  <p className="text-xs text-muted-foreground">{driverOfTheWeek.reportCount} reports filed</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Skull className="h-5 w-5 text-destructive" />
            The Naughty List
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
              : rows.length === 0
                ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-16 space-y-3">
                    <div className="text-5xl">💀</div>
                    <p className="text-lg font-extrabold">The Wall is Bare</p>
                    <p className="text-sm text-muted-foreground">The roads are… suspiciously clean. Start reporting and fill this wall with shame. 🤔</p>
                  </motion.div>
                : rows.map((plate, i) => {
                    const topInf = INFRACTIONS.find(inf => inf.type === plate.top_infraction);
                    return (
                      <motion.div
                        key={`${plate.state}-${plate.plate_number}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link to={`/plate/${encodeURIComponent(plate.plate_number)}`} className="block">
                          <div className="rounded-xl glass-card p-4 hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm shrink-0 ${
                                i === 0 ? "bg-amber-500/20 text-amber-500" :
                                i === 1 ? "bg-muted text-muted-foreground" :
                                i === 2 ? "bg-orange-800/20 text-orange-600" :
                                "bg-muted/50 text-muted-foreground"
                              }`}>
                                #{i + 1}
                              </div>
                              <WisconsinPlate plateNumber={plate.plate_number} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-bold font-mono gradient-text-fire">{plate.total_score} pts</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {topInf?.label || "Various"} · {plate.report_count} reports · {plate.state}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })
            }
          </div>
        </div>

        <div className="text-center pt-4">
          <ReportModal
            trigger={
              <Button size="lg" className="rounded-full glow gap-2">
                <AlertTriangle className="h-5 w-5" /> Report an A-Hole
              </Button>
            }
          />
        </div>
      </section>
    </div>
  );
};

export default WallOfShame;
