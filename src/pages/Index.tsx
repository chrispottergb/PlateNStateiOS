import { AlertTriangle, Search, Shield, Truck, ArrowRight, ShieldCheck, Landmark, Skull, Briefcase } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import PlateCard from "@/components/PlateCard";
import ReportModal from "@/components/ReportModal";
import SocialReportCard from "@/components/SocialReportCard";
import DriverOfTheWeek from "@/components/DriverOfTheWeek";
import { usePlateRecords } from "@/hooks/usePlateRecords";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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

type TabMode = "social" | "business";

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
}

const Index = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const [activeTab, setActiveTab] = useState<TabMode>("social");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const navigate = useNavigate();
  const { plates: featuredPlates, loading } = usePlateRecords(6);
  const { user } = useAuth();

  // Reports for social feed
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
      .channel("index-reports")
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

  // Rotate taglines
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

  // Driver of the week: plate with most reports
  const driverOfTheWeek = useMemo(() => {
    if (!featuredPlates.length) return null;
    const top = featuredPlates[0];
    const topInfraction = INFRACTIONS.find((i) => i.type === top.topInfraction);
    return {
      plateNumber: top.plateNumber,
      reportCount: top.reportCount,
      topInfraction: topInfraction?.label || top.topInfraction || "Various",
    };
  }, [featuredPlates]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
        </div>
        <div className="absolute inset-0 dot-grid" />
        <div className="container relative py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-center space-y-6"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Plate In State</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] gradient-text">
              Report Bad Drivers.<br />Keep Roads Safe.
            </h1>

            {/* Rotating funny tagline */}
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

            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setActiveTab("social")}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "social"
                    ? "bg-primary text-primary-foreground glow"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                <Skull className="h-4 w-4" />
                Wall of Shame
              </button>
              <button
                onClick={() => setActiveTab("business")}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === "business"
                    ? "bg-primary text-primary-foreground glow"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Business & Enterprise
              </button>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "social" ? (
          <motion.div
            key="social"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Driver of the Week */}
            {driverOfTheWeek && (
              <section className="container pt-8 max-w-md mx-auto">
                <DriverOfTheWeek {...driverOfTheWeek} />
              </section>
            )}

            {/* Wall of Shame heading */}
            <section className="container pt-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Skull className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-extrabold">Wall of Shame</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-muted-foreground rounded-full">
                  Full Leaderboard →
                </Button>
              </div>

              {/* Worst offenders as plate cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 rounded-xl" />
                    ))
                  : featuredPlates.length === 0
                    ? <p className="text-sm text-muted-foreground col-span-full text-center py-8">No reports yet. Be the first to report!</p>
                    : featuredPlates.map((plate, i) => (
                        <motion.div
                          key={plate.plateNumber}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                        >
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
          </motion.div>
        ) : (
          <motion.div
            key="business"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Business hero text */}
            <section className="container pt-12 text-center max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold gradient-text">
                Enterprise Solutions for Road Safety
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Professional-grade tools for fleet operators, law enforcement agencies, and insurance companies. 
                Real-time plate intelligence, risk scoring, and investigation support.
              </p>
            </section>

            {/* Portal CTAs */}
            <section className="container pt-8 pb-6 grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <Link to="/fleet" className="group block rounded-2xl glass p-6 hover:glow transition-all text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold">Fleet Management</h3>
                <p className="text-xs text-muted-foreground">Track your drivers with "How's My Driving?" programs. Tiered plans starting at $199/mo.</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Get Started <ArrowRight className="h-3 w-3" />
                </span>
              </Link>

              <Link to="/law-enforcement" className="group block rounded-2xl glass p-6 hover:glow transition-all text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
                  <Landmark className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold">Law Enforcement</h3>
                <p className="text-xs text-muted-foreground">Advanced plate lookups, investigation tools, and inter-agency data sharing.</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Learn More <ArrowRight className="h-3 w-3" />
                </span>
              </Link>

              <Link to="/insurance" className="group block rounded-2xl glass p-6 hover:glow transition-all text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold">Insurance Portal</h3>
                <p className="text-xs text-muted-foreground">Driver risk scores, incident history reports, and automated screening tools.</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Access Portal <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </section>

            {/* Trust stats */}
            <section className="container pb-20 max-w-3xl mx-auto">
              <div className="glass rounded-2xl p-8 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-extrabold gradient-text">10K+</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Reports Filed</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold gradient-text">5K+</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Plates Tracked</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold gradient-text">50+</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Agency Partners</p>
                </div>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-xs text-muted-foreground space-y-2">
          <p className="font-medium">Plate In State — Community-driven road safety</p>
          <p>This is a community reporting tool. Not affiliated with any government agency.</p>
          <p className="space-x-4">
            <Link to="/insurance" className="text-primary hover:text-primary/80 transition-colors">Insurance Portal →</Link>
            <Link to="/screening" className="text-primary hover:text-primary/80 transition-colors">Batch Screening →</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
