import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertTriangle, Search, Skull, TrendingUp, Flame, LayoutGrid, LayoutList, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import SocialReportCard from "@/components/SocialReportCard";
import FreshCatches from "@/components/FreshCatches";
import TrendingPlates from "@/components/TrendingPlates";
import ReportModal from "@/components/ReportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type SortMode = "hot" | "new" | "top";

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
}

const HonkZone = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("hot");
  const [flairFilter, setFlairFilter] = useState("all");
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
      return {
        plateNumber: p.plateNumber,
        reportCount: p.reportCount,
        topInfraction: topInf?.label || topKey || "Various",
      };
    }),
    [trendingPlatesRaw]
  );

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      let query = supabase
        .from("reports")
        .select("id, plate_number, infraction, location, created_at, upvote_count");

      if (sortMode === "new") query = query.order("created_at", { ascending: false });
      else if (sortMode === "top") query = query.order("upvote_count", { ascending: false });
      else query = query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });

      const { data } = await query.limit(30);
      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();

    const channel = supabase
      .channel("honkzone-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
        fetchReports();
      })
      .subscribe();
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

  const filteredReports = flairFilter === "all" ? reports : reports.filter(r => r.infraction === flairFilter);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="container py-8 sm:py-12 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">📯</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold gradient-text">The Honk Zone</h1>
        </div>

        <div className="h-6 flex items-center justify-center">
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
              className="glass font-mono rounded-full"
              maxLength={8}
            />
            <Button type="submit" size="icon" variant="secondary" className="rounded-full shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      <div className="container pb-20">
        {/* Fresh Catches */}
        {reports.length > 0 && (
          <div className="mb-8">
            <FreshCatches reports={reports.slice(0, 10)} />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main feed */}
          <div className="flex-1 space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort tabs */}
              <div className="flex rounded-full glass overflow-hidden">
                {([
                  { key: "hot" as SortMode, icon: <Flame className="h-3.5 w-3.5" />, label: "Hot" },
                  { key: "new" as SortMode, icon: <span className="text-xs">🆕</span>, label: "New" },
                  { key: "top" as SortMode, icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Top" },
                ]).map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortMode(s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      sortMode === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <button
                onClick={() => setViewMode(v => v === "feed" ? "grid" : "feed")}
                className="ml-auto p-2 rounded-full glass text-muted-foreground hover:text-foreground transition-colors"
              >
                {viewMode === "feed" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
              </button>

              {/* Wall of Shame link */}
              <Link to="/honkzone/wall">
                <Button variant="outline" size="sm" className="rounded-full gap-1.5">
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
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    flairFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "glass text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Reports */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg font-bold">No reports here yet 🦗</p>
                <p className="text-sm mt-1">Be the first to honk!</p>
              </div>
            ) : (
              <div className={viewMode === "feed" ? "grid gap-4 sm:grid-cols-2" : "grid gap-3 grid-cols-2 sm:grid-cols-3"}>
                {filteredReports.map((report, i) => (
                  <SocialReportCard
                    key={report.id}
                    report={report}
                    hasUpvoted={myUpvotes.has(report.id)}
                    votingId={votingId}
                    onUpvote={handleUpvote}
                    index={i}
                  />
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

      <footer className="border-t border-border/50 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
        </div>
      </footer>
    </div>
  );
};

export default HonkZone;
