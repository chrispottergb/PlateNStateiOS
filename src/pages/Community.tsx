import { AlertTriangle, Search, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import PlateCard from "@/components/PlateCard";
import ReportModal from "@/components/ReportModal";
import SocialReportCard from "@/components/SocialReportCard";
import DriverOfTheWeek from "@/components/DriverOfTheWeek";
import { usePlateRecords } from "@/hooks/usePlateRecords";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { INFRACTIONS } from "@/lib/data";

const FUNNY_TAGLINES = [
  "Because honking isn't enough™",
  "Snitches get... safer roads 🛣️",
  "Passive-aggressive, but make it civic duty",
  "Your mom said use your blinker 💡",
  "Dashcam drama, crowdsourced 🍿",
  "Making Wisconsin roads slightly less terrifying",
  "Report now, laugh later 😂",
];

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
}

const Community = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const navigate = useNavigate();
  const { plates: featuredPlates, loading } = usePlateRecords(6);
  const { user } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, plate_number, infraction, location, created_at, upvote_count")
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setReports(data);
    };
    fetchReports();

    const channel = supabase
      .channel("community-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
        fetchReports();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchUpvotes = async () => {
      const { data } = await supabase
        .from("report_upvotes")
        .select("report_id")
        .eq("user_id", user.id);
      if (data) setMyUpvotes(new Set(data.map((u) => u.report_id)));
    };
    fetchUpvotes();
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % FUNNY_TAGLINES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim().length >= 3) {
      navigate(`/plate/${encodeURIComponent(searchPlate.trim().toUpperCase())}`);
    }
  };

  const handleUpvote = async (reportId: string) => {
    if (!user) {
      toast.error("Sign in to upvote reports");
      return;
    }
    setVotingId(reportId);
    try {
      const { error } = await supabase.rpc("upvote_report", { p_report_id: reportId } as any);
      if (error) {
        if (error.message.includes("duplicate")) toast.info("Already upvoted");
        else if (error.message.includes("own report")) toast.info("Can't upvote your own report");
        else toast.error(error.message);
      } else {
        setMyUpvotes((prev) => new Set(prev).add(reportId));
        setReports((prev) =>
          prev.map((r) => r.id === reportId ? { ...r, upvote_count: r.upvote_count + 1 } : r)
        );
        toast.success("Upvoted! +1 XP");
      }
    } finally {
      setVotingId(null);
    }
  };

  const driverOfTheWeek = useMemo(() => {
    if (!featuredPlates.length) return null;
    const top = featuredPlates[0];
    const topInfractionKey = Object.entries(top.infractions).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topInfraction = INFRACTIONS.find((i) => i.type === topInfractionKey);
    return {
      plateNumber: top.plateNumber,
      reportCount: top.reportCount,
      topInfraction: topInfraction?.label || topInfractionKey || "Various",
    };
  }, [featuredPlates]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="container py-12 sm:py-16 text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Skull className="h-5 w-5 text-primary" />
          <h1 className="text-3xl sm:text-5xl font-extrabold gradient-text">Wall of Shame</h1>
        </div>

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

      {/* Driver of the Week */}
      {driverOfTheWeek && (
        <section className="container max-w-md mx-auto pb-8">
          <DriverOfTheWeek {...driverOfTheWeek} />
        </section>
      )}

      {/* Worst offenders */}
      <section className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold">Worst Offenders</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-muted-foreground rounded-full">
            Full Leaderboard →
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : featuredPlates.length === 0
              ? <p className="text-sm text-muted-foreground col-span-full text-center py-8">No reports yet. Be the first!</p>
              : featuredPlates.map((plate, i) => (
                  <motion.div key={plate.plateNumber} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <PlateCard plate={plate} rank={i + 1} />
                  </motion.div>
                ))
          }
        </div>
      </section>

      {/* Social feed */}
      <section className="container pb-20">
        <h2 className="text-xl font-extrabold mb-1">Latest Tea ☕</h2>
        <p className="text-sm text-muted-foreground mb-6">Fresh reports from the streets</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report, i) => (
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
      </section>

      <footer className="border-t border-border/50 py-6">
        <div className="container text-center text-xs text-muted-foreground">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
        </div>
      </footer>
    </div>
  );
};

export default Community;
