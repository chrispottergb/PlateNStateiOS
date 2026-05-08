import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, Search, Skull, TrendingUp, Flame, LayoutGrid, LayoutList, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import SocialReportCard from "@/components/SocialReportCard";
import FreshCatches from "@/components/FreshCatches";
import TrendingPlates from "@/components/TrendingPlates";
import ReportModal from "@/components/ReportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlateRecords } from "@/hooks/usePlateRecords";
import { INFRACTIONS } from "@/lib/data";
import { toast } from "sonner";

const FUNNY_TAGLINES = [
  "Because honking isn't enough™",
  "Snitches get... safer roads 🛣️",
  "Passive-aggressive, but make it civic duty",
  "Your mom said use your blinker 💡",
  "Dashcam drama, crowdsourced 🍿",
  "Making roads slightly less terrifying",
  "Report now, laugh later 😂",
  "Honk if you love accountability 📯",
];

const FLAIR_FILTERS = [
  { key: "all", label: "🔥 All" },
  { key: "tailgating", label: "🐌 Tailgaters" },
  { key: "ran_red_light", label: "🚦 Red Runners" },
  { key: "speeding", label: "🏎️ Speed Demons" },
  { key: "bad_parking", label: "🎨 Parking Picassos" },
  { key: "aggressive_lane_change", label: "🐍 Lane Snakers" },
  { key: "distracted_driving", label: "📱 Textaholics" },
];

const VEHICLE_TYPES = ["Sedan", "SUV", "Truck", "Van", "Minivan", "Coupe", "Convertible", "Hatchback", "Wagon", "Motorcycle", "Semi/Commercial"];
const VEHICLE_COLORS = ["Black", "White", "Silver/Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Gold"];

type SortMode = "hot" | "new" | "top";

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
  vehicle_type: string | null;
  vehicle_color: string | null;
}

const HonkZone = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("hot");
  const [flairFilter, setFlairFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [vehicleColorFilter, setVehicleColorFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plates: trendingPlatesRaw } = usePlateRecords(5);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  const trendingPlates = useMemo(() =>
    trendingPlatesRaw.map(p => {
      const topKey = Object.entries(p.infractions).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topInf = INFRACTIONS.find(i => i.type === topKey);
      return { plateNumber: p.plateNumber, reportCount: p.reportCount, topInfraction: topInf?.label || topKey || "Various" };
    }),
    [trendingPlatesRaw]
  );

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      let query = supabase.from("reports").select("id, plate_number, infraction, location, created_at, upvote_count, vehicle_type, vehicle_color");
      if (sortMode === "new") query = query.order("created_at", { ascending: false });
      else if (sortMode === "top") query = query.order("upvote_count", { ascending: false });
      else query = query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });
      const { data } = await query.limit(30);
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
    const channel = supabase.channel("patrol-reports").on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => fetchReports()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sortMode]);

  useEffect(() => {
    if (!user) return;
    const fetchUpvotes = async () => {
      const { data } = await supabase.from("report_upvotes").select("report_id").eq("user_id", user.id);
      if (data) setMyUpvotes(new Set(data.map(u => u.report_id)));
    };
    fetchUpvotes();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => setTaglineIndex(p => (p + 1) % FUNNY_TAGLINES.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim().length >= 3) navigate(`/plate/${encodeURIComponent(searchPlate.trim().toUpperCase())}`);
  };

  const handleUpvote = async (reportId: string) => {
    if (!user) { toast.error("Sign in to upvote"); return; }
    setVotingId(reportId);
    try {
      const { error } = await supabase.rpc("upvote_report", { p_report_id: reportId } as any);
      if (error) {
        if (error.message.includes("duplicate")) toast.info("Already upvoted");
        else if (error.message.includes("own report")) toast.info("Can't upvote your own report");
        else toast.error(error.message);
      } else {
        setMyUpvotes(prev => new Set(prev).add(reportId));
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, upvote_count: r.upvote_count + 1 } : r));
        toast.success("Upvoted! +1 XP");
      }
    } finally { setVotingId(null); }
  };

  const filteredReports = reports.filter(r => {
    if (flairFilter !== "all" && r.infraction !== flairFilter) return false;
    if (vehicleTypeFilter !== "all" && r.vehicle_type !== vehicleTypeFilter) return false;
    if (vehicleColorFilter !== "all" && r.vehicle_color !== vehicleColorFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Header />

      {/* Hero with mesh background */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh-bg" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        {/* Floating orbs */}
        <div className="absolute top-10 left-1/3 w-40 h-40 bg-primary/8 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-accent/6 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

        <div className="container relative py-10 sm:py-14 text-center space-y-5 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5">
              <span className="text-lg">🚨</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">The A-Hole Patrol</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold gradient-text-fire">The A-Hole Patrol</h1>
          </motion.div>

          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p key={taglineIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="text-sm text-muted-foreground italic">
                {FUNNY_TAGLINES[taglineIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <ReportModal
              trigger={
                <Button size="lg" className="gap-2 font-semibold text-base w-full sm:w-auto rounded-full glow">
                  <AlertTriangle className="h-5 w-5" />
                  Report a Plate
                </Button>
              }
            />
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <Input
                value={searchPlate}
                onChange={e => setSearchPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                placeholder="Search plate..."
                className="glass font-mono rounded-full border-foreground/5"
                maxLength={8}
              />
              <Button type="submit" size="icon" variant="secondary" className="rounded-full shrink-0">
                <Search className="h-4 w-4" />
              </Button>
              <Link to="/claim">
                <Button type="button" variant="outline" size="sm" className="rounded-full shrink-0 gap-1.5 h-10">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Claim Plate</span>
                </Button>
              </Link>
            </form>
          </div>
        </div>
      </section>

      <div className="container pb-20 relative z-10">
        {/* Fresh Catches */}
        {reports.length > 0 && (
          <div className="mb-8 mt-2">
            <FreshCatches reports={reports.slice(0, 10)} />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main feed */}
          <div className="flex-1 space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full glass overflow-hidden">
                {([
                  { key: "hot" as SortMode, icon: <Flame className="h-3.5 w-3.5" />, label: "Hot" },
                  { key: "new" as SortMode, icon: <span className="text-xs">🆕</span>, label: "New" },
                  { key: "top" as SortMode, icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Top" },
                ]).map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortMode(s.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-all ${
                      sortMode === s.key ? "bg-primary text-primary-foreground shadow-[0_0_12px_-3px_hsl(var(--glow-primary)/0.4)]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setViewMode(v => v === "feed" ? "grid" : "feed")}
                className="ml-auto p-2 rounded-full glass text-muted-foreground hover:text-foreground transition-colors"
              >
                {viewMode === "feed" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </button>

              <Link to="/a-hole-patrol/wall">
                <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Skull className="h-3.5 w-3.5" /> Wall of Shame
                </Button>
              </Link>
            </div>

            {/* Flair filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {FLAIR_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFlairFilter(f.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    flairFilter === f.key
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Vehicle filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={vehicleTypeFilter}
                onChange={e => setVehicleTypeFilter(e.target.value)}
                className="rounded-full px-3 py-1.5 text-xs font-medium glass border-none bg-muted/30 text-foreground cursor-pointer focus:ring-1 focus:ring-primary/30 outline-none"
              >
                <option value="all">🚗 All Vehicles</option>
                {VEHICLE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={vehicleColorFilter}
                onChange={e => setVehicleColorFilter(e.target.value)}
                className="rounded-full px-3 py-1.5 text-xs font-medium glass border-none bg-muted/30 text-foreground cursor-pointer focus:ring-1 focus:ring-primary/30 outline-none"
              >
                <option value="all">🎨 All Colors</option>
                {VEHICLE_COLORS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {(vehicleTypeFilter !== "all" || vehicleColorFilter !== "all") && (
                <button
                  onClick={() => { setVehicleTypeFilter("all"); setVehicleColorFilter("all"); }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-52 rounded-2xl" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 glass-card p-10 rounded-2xl space-y-4"
              >
                <div className="text-6xl">🦗</div>
                <p className="text-xl font-extrabold">Suspiciously Quiet…</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Either everyone's driving like angels or nobody's snitching yet. We both know which one it is.
                </p>
                <ReportModal
                  trigger={
                    <Button size="lg" className="rounded-full gap-2 mt-2 glow">
                      <AlertTriangle className="h-4 w-4" /> Be the First to Report
                    </Button>
                  }
                />
              </motion.div>
            ) : (
              <div className={viewMode === "feed" ? "grid gap-4 sm:grid-cols-2" : "grid gap-3 grid-cols-2 sm:grid-cols-3"}>
                {filteredReports.map((report, i) => (
                  <SocialReportCard key={report.id} report={report} hasUpvoted={myUpvotes.has(report.id)} votingId={votingId} onUpvote={handleUpvote} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 space-y-4 shrink-0">
            <TrendingPlates plates={trendingPlates} />
          </div>
        </div>
      </div>

      <footer className="border-t border-border/30 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
        </div>
      </footer>
    </div>
  );
};

export default HonkZone;
