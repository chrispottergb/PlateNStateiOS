import { Shield, ArrowRight, Zap, Users, MapPin, Megaphone } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import Header from "@/components/Header";
import ReportModal from "@/components/ReportModal";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const { data: liveStats = [] } = useQuery({
    queryKey: ["homepage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_homepage_stats");
      if (error) throw error;
      const stats = (data ?? {}) as { report_count?: number; reporter_count?: number; city_count?: number };
      return [
        { label: "Reports Filed", value: (stats.report_count ?? 0).toLocaleString() },
        { label: "Active Reporters", value: (stats.reporter_count ?? 0).toLocaleString() },
        { label: "Cities Covered", value: (stats.city_count ?? 0).toLocaleString() },
      ];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const interval = setInterval(() => setTaglineIndex(p => (p + 1) % FUNNY_TAGLINES.length), 3500);
    return () => clearInterval(interval);
  }, []);

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/watch" replace />;

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
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plate N' State</span>
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

            {/* Primary CTA: Report a Plate */}
            <div className="pt-4 flex justify-center">
              <ReportModal
                trigger={
                  <button
                    type="button"
                    className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-base px-7 py-3.5 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-all glow"
                  >
                    <Megaphone className="h-5 w-5" />
                    Report a Plate
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                }
              />
            </div>

            {/* Secondary CTA */}
            <div className="pt-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in or create an account <ArrowRight className="h-4 w-4" />
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
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      <footer className="border-t border-border/30 py-6">
        <div className="container text-center text-xs text-muted-foreground space-y-2">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="text-border">|</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span className="text-border">|</span>
            <Link to="/delete-account" className="hover:text-foreground transition-colors">Delete My Data</Link>
            <span className="text-border">|</span>
            <Link to="/csae-policy" className="hover:text-foreground transition-colors">CSAE Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
