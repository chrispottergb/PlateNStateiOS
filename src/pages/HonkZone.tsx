import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, Search, Skull, TrendingUp, Flame, LayoutGrid, LayoutList, ShieldCheck } from "lucide-react";

const HeroMiniMap = lazy(() => import("@/components/HeroMiniMap"));
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

const COMPOSER_PROMPTS = [
  "Spotted something? Tap to report…",
  "Spotted a rolling menace? Drop the plate…",
  "Witness a parking Picasso? Snitch here…",
  "Caught a tailgater? Make it official…",
  "Someone forgot their blinker? We'll remember…",
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

const ReportComposer = () => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [promptIndex] = useState(() => Math.floor(Math.random() * COMPOSER_PROMPTS.length));

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-2xl border border-foreground/5 p-3 sm:p-4 hover:border-primary/20 transition-colors">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg shadow-inner ring-1 ring-foreground/5">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span aria-hidden>🚨</span>
            )}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 500))}
            placeholder={COMPOSER_PROMPTS[promptIndex]}
            rows={1}
            maxLength={500}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground outline-none resize-none border-0 focus:ring-0 py-2"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
          />
        </div>
      </div>
      <ReportModal
        initialComment={text}
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setText("");
        }}
        trigger={
          <Button
            size="lg"
            onClick={() => setOpen(true)}
            className="gap-2 font-bold text-base w-full rounded-full glow h-12"
          >
            <AlertTriangle className="h-5 w-5" />
            Report a Plate
          </Button>
        }
      />
    </div>
  );
};

const HonkZone = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [flairFilter, setFlairFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [vehicleColorFilter, setVehicleColorFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"feed" | "grid">("feed");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { plates: trendingPlatesRaw } = usePlateRecords(5);

  const [votingId, setVotingId] = useState<string | null>(null);

  const trendingPlates = useMemo(() =>
    trendingPlatesRaw.map(p => {
      const topKey = Object.entries(p.infractions).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topInf = INFRACTIONS.find(i => i.type === topKey);
      return { plateNumber: p.plateNumber, reportCount: p.reportCount, topInfraction: topInf?.label || topKey || "Various" };
    }),
    [trendingPlatesRaw]
  );

  // Feed — React Query handles caching + 30s background refresh (no setInterval needed)
  const { data: reports = [], isLoading: loading } = useQuery<Report[]>({
    queryKey: ["honkzone-reports", sortMode],
    queryFn: async () => {
      let query = supabase.from("reports").select("id, plate_number, infraction, location, created_at, upvote_count, vehicle_type, vehicle_color, is_flagged, state, latitude, longitude");
      if (sortMode === "new") query = query.order("created_at", { ascending: false });
      else if (sortMode === "top") query = query.order("upvote_count", { ascending: false });
      else query = query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });
      const { data } = await query.limit(30);
      return (data ?? []) as Report[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // User's existing upvotes — cached per session, only refetched on mount
  const { data: upvoteRows = [] } = useQuery({
    queryKey: ["my-upvotes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("report_upvotes").select("report_id").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const myUpvotes = useMemo(() => new Set(upvoteRows.map((u: any) => u.report_id)), [upvoteRows]);

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
        // Optimistic cache updates — no need to re-fetch just for a +1
        queryClient.setQueryData<Report[]>(["honkzone-reports", sortMode], prev =>
          prev?.map(r => r.id === reportId ? { ...r, upvote_count: r.upvote_count + 1 } : r) ?? []
        );
        queryClient.setQueryData<{ report_id: string }[]>(["my-upvotes", user.id], prev =>
          [...(prev ?? []), { report_id: reportId }]
        );
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
    <div className="min-h-screen bg-background pb-nav">
      <Header />

      <section className="relative overflow-hidden border-b border-border/30">
        <div className="container py-6 sm:py-8 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-1 text-center"
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold">The Patrol</h1>
            <div className="h-5 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p key={taglineIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="text-xs text-muted-foreground italic">
                  {FUNNY_TAGLINES[taglineIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Live incident map */}
          <Suspense fallback={<div className="h-[280px] rounded-2xl bg-muted/30 animate-pulse" />}>
            <HeroMiniMap />
          </Suspense>

          {/* Claim Your Plate gold banner */}
          <Link to="/claim" className="block">
            <div className="w-full h-12 rounded-full bg-amber-500 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer">
              <ShieldCheck className="h-5 w-5 text-amber-950" />
              <span className="text-amber-950 font-extrabold text-base tracking-wide">Claim Your Plate</span>
            </div>
          </Link>
        </div>
      </section>

      <div className="container pb-20 relative z-10">
        {/* Twitter-style report composer */}
        {!loading && (
          <div className="mt-4 mb-4">
            <ReportComposer />
          </div>
        )}

        {/* Fresh Catches */}
        {reports.length > 0 && (
          <div className="mb-8 mt-2">
            <FreshCatches reports={reports.slice(0, 10)} />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main feed */}
          <div className="flex-1 space-y-4">
            {/* Wall of Shame — centered, bold, white */}
            <div className="flex justify-center">
              <Link to="/a-hole-patrol/wall">
                <Button size="lg" variant="outline" className="rounded-full px-10 h-11 font-extrabold text-sm text-white border-destructive/50 bg-destructive/20 hover:bg-destructive/30">
                  Wall of Shame
                </Button>
              </Link>
            </div>

            {/* Flair filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {FLAIR_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFlairFilter(f.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    flairFilter === f.key
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Vehicle filters — hidden behind disclosure */}
            <div className="flex gap-2 flex-wrap" style={{ display: "none" }}>
              <select
                value={vehicleTypeFilter}
                onChange={e => setVehicleTypeFilter(e.target.value)}
                className="rounded-full px-3 py-1.5 text-xs font-medium bg-muted/30 text-foreground cursor-pointer focus:ring-1 focus:ring-primary/30 outline-none"
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
              <div className="grid grid-cols-2 gap-3">
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
