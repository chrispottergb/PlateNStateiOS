import { AlertTriangle, Search, Shield, Truck } from "lucide-react";
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
      <section className="relative overflow-hidden border-b bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }} />
        </div>
        <div className="container relative py-12 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center space-y-6"
          >
            <div className="flex items-center justify-center gap-2 text-primary-foreground/80">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-widest">Plate In State</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
              Report Bad Drivers.<br />Keep Roads Safe.
            </h1>
            <p className="text-primary-foreground/70 text-base sm:text-lg max-w-lg mx-auto">
              Community-powered accountability for your state's roads. Report dangerous driving, track repeat offenders.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <ReportModal
                trigger={
                  <Button size="lg" variant="secondary" className="gap-2 font-semibold text-base w-full sm:w-auto">
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
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 font-mono"
                  maxLength={8}
                />
                <Button type="submit" size="icon" variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Fleet CTA */}
      <section className="container pt-8">
        <Link to="/fleet" className="block rounded-lg border bg-muted/50 p-4 hover:bg-muted transition-colors">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Manage a fleet?</p>
              <p className="text-xs text-muted-foreground">Track your drivers' reports with "How's My Driving?" →</p>
            </div>
          </div>
        </Link>
      </section>

      {/* Featured Plates */}
      <section className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Worst Offenders</h2>
            <p className="text-sm text-muted-foreground">Highest-scoring plates ranked by community reports</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-muted-foreground">
            View all →
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))
            : featuredPlates.length === 0
              ? <p className="text-sm text-muted-foreground col-span-full text-center py-8">No reports yet. Be the first to report!</p>
              : featuredPlates.map((plate, i) => (
                  <motion.div
                    key={plate.plateNumber}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <PlateCard plate={plate} rank={i + 1} />
                  </motion.div>
                ))
          }
        </div>
      </section>

      {/* Recent Reports */}
      <section className="container pb-16">
        <h2 className="text-xl font-bold mb-1">Recent Reports</h2>
        <p className="text-sm text-muted-foreground mb-6">Latest activity across Wisconsin</p>
        <RecentReports />
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground space-y-1">
          <p>WI Plate Watch — Community-driven road safety for Wisconsin</p>
          <p>This is a community reporting tool. Not affiliated with any government agency.</p>
          <p className="space-x-3">
            <Link to="/insurance" className="text-primary hover:underline">Insurance Portal →</Link>
            <Link to="/screening" className="text-primary hover:underline">Batch Plate Screening →</Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
