import { Shield, Skull, Briefcase, ArrowRight, Zap, Users, MapPin } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import Header from "@/components/Header";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNNY_TAGLINES = [
  "Because honking isn't enough™",
  "Snitches get... safer roads 🛣️",
  "Passive-aggressive, but make it civic duty",
  "Your mom said use your blinker 💡",
  "Dashcam drama, crowdsourced 🍿",
];

const STAT_ICONS = [
  { label: "Reports Filed", icon: Zap },
  { label: "Active Reporters", icon: Users },
  { label: "Cities Covered", icon: MapPin },
];

const Index = () => {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [liveStats, setLiveStats] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [reportsRes, profilesRes, locationsRes] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("total_reports", 0),
        supabase.from("reports").select("location"),
      ]);
      const reportCount = reportsRes.count ?? 0;
      const reporterCount = profilesRes.count ?? 0;
      const uniqueCities = new Set((locationsRes.data ?? []).map(r => r.location.split(",")[0].trim())).size;
      setLiveStats([
        { label: "Reports Filed", value: reportCount.toLocaleString() },
        { label: "Active Reporters", value: reporterCount.toLocaleString() },
        { label: "Cities Covered", value: uniqueCities.toLocaleString() },
      ]);
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTaglineIndex(p => (p + 1) % FUNNY_TAGLINES.length), 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col noise-overlay">
      <Header />

      <section className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 gradient-mesh-bg" />
        </div>
        <div className="absolute inset-0 dot-grid opacity-40" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

        <div className="container relative py-16 sm:py-24 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5"
            >
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plate N' State</span>
            </motion.div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              <span className="gradient-text">Report Bad Drivers.</span>
              <br />
              <span className="text-foreground">Keep Roads Safe.</span>
            </h1>

            <div className="h-7 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={taglineIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-muted-foreground italic"
                >
                  {FUNNY_TAGLINES[taglineIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Two path cards */}
            <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto pt-4">
              <Link to="/a-hole-patrol" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  {/* Gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary/40 opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="relative m-[1px] rounded-[15px] bg-background/95 group-hover:bg-background/90 p-7 space-y-4 text-center h-full transition-colors">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto group-hover:bg-primary/20 transition-colors">
                        <Skull className="h-7 w-7" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-14 w-14 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <h2 className="text-xl font-extrabold">The A-Hole Patrol</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Report plates, roast bad drivers, upvote the worst offenders. Social media for road rage. 🚨
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                      Join the Patrol <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              </Link>

              <Link to="/business" className="group">
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent via-muted-foreground/30 to-secondary opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="relative m-[1px] rounded-[15px] bg-background/95 group-hover:bg-background/90 p-7 space-y-4 text-center h-full transition-colors">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent mx-auto group-hover:bg-accent/20 transition-colors">
                        <Briefcase className="h-7 w-7" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-14 w-14 bg-accent/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <h2 className="text-xl font-extrabold">Business & Enterprise</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Fleet management, law enforcement tools, and insurance portals. Professional road intelligence.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:gap-2.5 transition-all">
                      Explore Solutions <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            </div>

            {/* Stats row */}
            {liveStats.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-8 sm:gap-12 pt-6"
              >
                {liveStats.map((stat, i) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-lg sm:text-2xl font-extrabold gradient-text">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      <footer className="border-t border-border/30 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
