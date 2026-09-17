import { useMemo, useState } from "react";
import { Skull, ArrowLeft, AlertTriangle, MapPin, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import LicensePlate from "@/components/LicensePlate";
import ReportModal from "@/components/ReportModal";
import { useWallOfShame } from "@/hooks/useWallOfShame";
import { INFRACTIONS } from "@/lib/data";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHomeState } from "@/hooks/useHomeState";
import SectionHeader from "@/components/SectionHeader";

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
      state: top.state,
      totalScore: top.total_score,
      reportCount: top.report_count,
      topInfraction: topInf?.label || top.top_infraction || "Various",
      lastLocation: new Date(top.last_reported_at).toLocaleDateString(),
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background pb-nav">
      <Header />
      <section className="container py-6 space-y-6 max-w-4xl">
        <div className="flex items-start gap-2">
          <Link to="/patrol" className="mt-0.5">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2.5">
              <Skull className="h-6 w-6 text-destructive" />
              <span className="gradient-text">Wall of Shame</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Receipts, kept fresh. Updated every 5 min.</p>
          </div>
        </div>

        {homeState && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Showing:</span>
            <Button
              size="sm"
              variant={!showAllStates ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setShowAllStates(false)}
            >
              <MapPin className="h-3 w-3 mr-1" /> {homeState}
            </Button>
            <Button
              size="sm"
              variant={showAllStates ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setShowAllStates(true)}
            >
              All 50 States
            </Button>
          </div>
        )}

        {driverOfTheWeek && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 sm:p-8"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), transparent 55%)" }}
            />
            <div className="relative z-10">
              <Badge className="mb-4 px-3 py-1 text-[11px] uppercase tracking-widest font-bold gap-1.5 bg-primary/12 text-primary border-primary/40">
                <Crown className="h-3 w-3" /> Reigning Champion of Chaos
              </Badge>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link to={`/plate/${encodeURIComponent(driverOfTheWeek.plateNumber)}`}>
                  <LicensePlate plateNumber={driverOfTheWeek.plateNumber} state={driverOfTheWeek.state} size="lg" className="hover:scale-105 transition-transform" />
                </Link>
                <div className="text-center sm:text-left space-y-2">
                  <p className="text-4xl font-black font-mono text-destructive tabular-nums">{driverOfTheWeek.totalScore} pts</p>
                  <p className="text-sm text-muted-foreground">
                    Specialty: <span className="font-semibold text-foreground">{driverOfTheWeek.topInfraction}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center sm:justify-start">
                    <MapPin className="h-3 w-3" /> Last sighting {driverOfTheWeek.lastLocation}
                  </p>
                  <p className="text-xs text-muted-foreground">{driverOfTheWeek.reportCount} witnesses (and counting)</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <SectionHeader title="The Naughty List" />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
              : rows.length === 0
                ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-16 space-y-3">
                    <Skull className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-lg font-extrabold">The Wall is Bare</p>
                    <p className="text-sm text-muted-foreground">Everyone's behaving. Suspicious. Go report someone before this gets weird.</p>
                  </motion.div>
                : rows.map((plate, i) => {
                    const topInf = INFRACTIONS.find(inf => inf.type === plate.top_infraction);
                    const rankTitle =
                      i === 0 ? "Top Menace" :
                      i === 1 ? "Runner-up" :
                      i === 2 ? "Bronze Boy" :
                      `Honorable Mention #${i + 1}`;
                    return (
                      <motion.div
                        key={`${plate.state}-${plate.plate_number}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link to={`/plate/${encodeURIComponent(plate.plate_number)}`} className="block">
                          <div className="glass-card p-4 hover:border-primary/40 transition-colors duration-150 group">
                            <div className="flex items-center gap-3.5">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm shrink-0 tabular-nums border ${
                                i === 0 ? "bg-primary text-primary-foreground border-primary" :
                                i < 3 ? "bg-primary/12 text-primary border-primary/30" :
                                "bg-secondary text-muted-foreground border-border/60"
                              }`}>
                                #{i + 1}
                              </div>
                              <LicensePlate plateNumber={plate.plate_number} state={plate.state} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-bold font-mono text-destructive tabular-nums">{plate.total_score} pts</p>
                                <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mt-0.5">{rankTitle}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {topInf?.label || "Various"} · {plate.report_count} witnesses · {plate.state}
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

        <div className="text-center pt-2">
          <ReportModal
            trigger={
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <AlertTriangle className="h-5 w-5" /> Report a Driver
              </Button>
            }
          />
        </div>
      </section>
    </div>
  );
};

export default WallOfShame;
