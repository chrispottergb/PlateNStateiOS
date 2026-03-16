import { AlertTriangle, Search, Shield, Truck, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import sectionBg from "@/assets/section-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import PlateCard from "@/components/PlateCard";
import RecentReports from "@/components/RecentReports";
import ReportModal from "@/components/ReportModal";
import { usePlateRecords } from "@/hooks/usePlateRecords";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [searchPlate, setSearchPlate] = useState("");
  const navigate = useNavigate();
  const { plates: featuredPlates, loading } = usePlateRecords(6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPlate.trim().length >= 3) {
      navigate(`/plate/${encodeURIComponent(searchPlate.trim().toUpperCase())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden gradient-mesh-bg">
        <div className="absolute inset-0 dot-grid" />
        <div className="container relative py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-center space-y-8"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Plate In State</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] gradient-text">
              Report Bad Drivers.<br />Keep Roads Safe.
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
              Community-powered accountability for your state's roads. Report dangerous driving, track repeat offenders.
            </p>

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
          </motion.div>
        </div>
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Fleet CTA */}
      <section className="container pt-8">
        <Link to="/fleet" className="group block rounded-xl glass p-4 hover:glow transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Manage a fleet?</p>
              <p className="text-xs text-muted-foreground">Track your drivers' reports with "How's My Driving?"</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </section>

      {/* Featured Plates */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold">Worst Offenders</h2>
            <p className="text-sm text-muted-foreground mt-1">Highest-scoring plates ranked by community reports</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-muted-foreground rounded-full">
            View all →
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Recent Reports */}
      <section className="container pb-20">
        <h2 className="text-xl font-bold mb-1">Recent Reports</h2>
        <p className="text-sm text-muted-foreground mb-6">Latest activity from the community</p>
        <RecentReports />
      </section>

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
