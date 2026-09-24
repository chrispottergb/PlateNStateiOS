import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Skull, ShieldCheck, Camera, Inbox, User, Users, Route, Flame, CarFront, CircleAlert, Gauge, ParkingSquare, ArrowLeftRight, Smartphone, AlertTriangle, ChevronRight, Zap, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroMiniMap = lazy(() => import("@/components/HeroMiniMap"));
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import SocialReportCard from "@/components/SocialReportCard";
import FreshCatches from "@/components/FreshCatches";
import TrendingPlates from "@/components/TrendingPlates";
import SectionHeader from "@/components/SectionHeader";
import ReportModal from "@/components/ReportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyClaims } from "@/hooks/useClaimStatus";
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

const FLAIR_FILTERS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "all", label: "All", icon: Flame },
  { key: "tailgating", label: "Tailgaters", icon: CarFront },
  { key: "ran_red_light", label: "Red Runners", icon: CircleAlert },
  { key: "speeding", label: "Speed Demons", icon: Gauge },
  { key: "bad_parking", label: "Parking Picassos", icon: ParkingSquare },
  { key: "aggressive_lane_change", label: "Lane Snakers", icon: ArrowLeftRight },
  { key: "distracted_driving", label: "Textaholics", icon: Smartphone },
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
  comment?: string | null;
  is_flagged?: boolean;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reporter_id?: string | null;
  reporter_name?: string | null;
}

const ReportComposer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [promptIndex] = useState(() => Math.floor(Math.random() * COMPOSER_PROMPTS.length));

  return (
    <div>
      <ReportModal
        initialComment={text}
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setText("");
        }}
        trigger={<span className="hidden" />}
      />
      {/* Split CTA: fast camera path vs the full progressive report */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          to="/quick-capture"
          className="relative h-[58px] flex flex-col items-center justify-center rounded-[14px] text-[#0B1017] transition-[filter,transform] duration-150 hover:brightness-[1.03] active:translate-y-px active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            background: "linear-gradient(180deg, #F8AE2E 0%, #F5A623 60%, #EE9E1C 100%)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.28) inset, 0 -1px 0 rgba(0,0,0,0.10) inset, 0 4px 10px -2px rgba(0,0,0,0.5), 0 8px 16px -10px rgba(245,166,35,0.28)",
          }}
        >
          <span className="inline-flex items-center gap-2 text-[17px] font-bold tracking-[-0.01em] leading-none"><Camera className="h-5 w-5" strokeWidth={2.25} /> Quick Report</span>
          <span className="mt-1 text-[11px] font-semibold leading-none opacity-75">Snap the plate</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!user) { toast.error("Sign in required", { description: "You need an account to report plates." }); navigate("/auth"); return; }
            setOpen(true);
          }}
          className="relative h-[58px] flex flex-col items-center justify-center rounded-[14px] bg-[#122431] border border-primary/45 text-foreground transition-colors duration-150 hover:border-primary active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="inline-flex items-center gap-2 text-[17px] font-bold tracking-[-0.01em] leading-none text-primary"><PenLine className="h-5 w-5" strokeWidth={2.25} /> Snitch Harder</span>
          <span className="mt-1 text-[11px] font-semibold leading-none text-[#A0B0BE]">Full report</span>
        </button>
      </div>
      <p className="text-center text-[13px] text-muted-foreground mt-2.5">Snap it. Report it. Make an impact.</p>

      {/* Optional pre-modal note (prefills the report comment). Hidden in the
          default Home state; it only renders once text exists, and the same
          comment can be entered inside the report modal's "Add Details" field. */}
      {text && (
        <div className="w-full flex items-start gap-2 mt-2">
          {/* PRIVACY-CRITICAL: self-view only. This composer renders the CURRENT user's own
              OAuth avatar back to themselves — never to other viewers. Do NOT reuse this
              pattern to render another user's avatar in any community-facing surface;
              identity in the community is profiles.display_name only. */}
          <div className="shrink-0 mt-1.5 h-6 w-6 rounded-full bg-[#122431] flex items-center justify-center text-icon-muted overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-3.5 w-3.5" aria-hidden />
            )}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 500))}
            placeholder={COMPOSER_PROMPTS[promptIndex]}
            rows={1}
            maxLength={500}
            aria-label="Report note"
            className="flex-1 min-w-0 bg-[#0D1B26] rounded-xl border border-[#889AAA]/[0.16] px-3 text-[13px] leading-5 text-foreground placeholder:text-[#889AAA] outline-none resize-none focus:border-primary py-2"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
          />
        </div>
      )}
    </div>
  );
};

const SHOW_RECENT_ACTIVITY = false;

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
  const { paidClaims } = useMyClaims(user?.id);
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

  // Feed — React Query handles caching + 30s background refresh (no setInterval needed).
  // Reporter byline: reports.reporter_id → auth.users (no PostgREST join to profiles),
  // so we batch-fetch profiles by user_id in a follow-up and merge display_name in JS.
  const { data: reports = [], isLoading: loading } = useQuery<Report[]>({
    queryKey: ["honkzone-reports", sortMode],
    queryFn: async () => {
      let query = supabase.from("reports").select("id, plate_number, infraction, location, created_at, upvote_count, vehicle_type, vehicle_color, comment, is_flagged, state, latitude, longitude, reporter_id");
      if (sortMode === "new") query = query.order("created_at", { ascending: false });
      else if (sortMode === "top") query = query.order("upvote_count", { ascending: false });
      else query = query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });
      const { data: rows } = await query.limit(30);
      const reports = (rows ?? []) as Report[];
      const ids = Array.from(new Set(reports.map(r => r.reporter_id).filter(Boolean))) as string[];
      if (!ids.length) return reports;
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name]));
      return reports.map(r => ({ ...r, reporter_name: r.reporter_id ? nameMap.get(r.reporter_id) ?? null : null }));
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
      {/* ===== ZONE 1: cinematic hero + header ===== */}
      <section className="relative">
        <Header overlay />

        {/* Backdrop: image → navy tint → top vignette → bottom dissolve into page.
            Swap `heroBg` for the production road asset without touching JSX. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_35%]" style={{ filter: "contrast(1.08) saturate(0.9)" }} />
          {/* navy tint, lighter at the roadway centre */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(7,19,28,0.25) 0%, rgba(7,19,28,0.55) 60%, rgba(7,19,28,0.85) 100%)" }} />
          {/* top vignette for header legibility */}
          <div className="absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(180deg, rgba(7,19,28,0.9) 0%, rgba(7,19,28,0) 100%)" }} />
          {/* bottom dissolve into page */}
          <div className="absolute inset-x-0 bottom-0 h-[58%]" style={{ background: "linear-gradient(180deg, rgba(7,19,28,0) 0%, rgba(7,19,28,0.75) 45%, #07131C 100%)" }} />
        </div>

        <div className="container relative pt-[calc(68px+env(safe-area-inset-top,0px))] pb-2">
          <h1 className="font-extrabold uppercase tracking-[-0.015em]" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.55)" }}>
            <span className="block text-[38px] leading-[0.95] text-[#F2F6F8]">See it.</span>
            <span className="block text-[42px] leading-[0.98] text-primary">Report it.</span>
            <span className="block text-[28px] leading-[1] text-[#F2F6F8] mt-1">Make roads safer.</span>
          </h1>

          {/* Trust row — three equal columns, may wrap to two lines, never truncates */}
          <ul className="mt-5 grid grid-cols-3 gap-2 text-[11.5px] font-medium leading-[1.15] text-[#F2F6F8]/85 text-center">
            <li className="flex flex-col items-center gap-1.5"><ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.75} /><span>Safer<br />Drivers</span></li>
            <li className="flex flex-col items-center gap-1.5"><Users className="h-5 w-5 text-primary" strokeWidth={1.75} /><span>Stronger<br />Communities</span></li>
            <li className="flex flex-col items-center gap-1.5"><Route className="h-5 w-5 text-primary" strokeWidth={1.75} /><span>Real<br />Change</span></li>
          </ul>
        </div>
      </section>

      {/* ===== ZONE 2: primary report CTA ===== */}
      <section className="container pt-2 pb-5">
        {!loading && <ReportComposer />}
      </section>

      {/* ===== ZONE 3: live map (all-time reports, shown up front) ===== */}
      <section className="container pb-6">
        <Suspense fallback={<div className="h-[200px] rounded-2xl bg-[#0D1B26] animate-pulse" />}>
          <div>
            <HeroMiniMap />
          </div>
        </Suspense>
      </section>

      {/* ===== ZONE 4: secondary plate lookup ===== */}
      <section className="container pt-1 pb-6">
        <form onSubmit={handleSearch}>
          <label htmlFor="plate-lookup" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#A0B0BE]">Look up a plate</label>
          <p className="text-[13px] text-muted-foreground mt-1 mb-2.5">Check a plate's history and community reports.</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#889AAA] pointer-events-none" strokeWidth={2} />
            <Input
              id="plate-lookup"
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value.toUpperCase())}
              placeholder="Enter license plate (e.g. ABC123)"
              aria-label="License plate"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={10}
              className="h-[50px] py-0 pl-12 pr-11 rounded-[12px] bg-[#122431] border-[#889AAA]/[0.14] text-[16px] font-mono tracking-[0.06em] placeholder:font-sans placeholder:tracking-normal placeholder:text-[13.5px] placeholder:text-[#889AAA]"
            />
            <button
              type="submit"
              aria-label="Search plate"
              disabled={searchPlate.trim().length < 3}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-[10px] flex items-center justify-center text-foreground transition-colors duration-150 hover:bg-white/5 disabled:text-[#889AAA] press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </section>

      {/* ===== ZONE 5: recent activity ===== */}
      <div className="container pb-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main feed */}
          <div className="flex-1 space-y-3">
            {/* Fresh Catches — leads the feed */}
            {reports.length > 0 && (
              <div className="pb-2">
                <FreshCatches reports={reports.slice(0, 10)} />
                <Link to="/patrol/wall" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#A0B0BE] hover:text-foreground transition-colors">
                  <Skull className="h-3.5 w-3.5" /> Wall of Shame
                </Link>
              </div>
            )}

            {/* Recent Activity list hidden: it duplicated Fresh Catches. */}
            {SHOW_RECENT_ACTIVITY && (<>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[22px] font-bold tracking-tight">Recent Activity</h2>
              <Link to="/patrol/wall" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#A0B0BE] hover:text-foreground transition-colors">
                <Skull className="h-3.5 w-3.5" /> Wall of Shame
              </Link>
            </div>

            {/* Flair filters */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
              {FLAIR_FILTERS.map(f => {
                const Icon = f.icon;
                const active = flairFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFlairFilter(f.key)}
                    aria-pressed={active}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 h-[30px] text-[11.5px] font-semibold border transition-colors duration-150 ${
                      active
                        ? "bg-primary/10 text-primary border-primary/35"
                        : "bg-transparent text-[#A0B0BE] border-[#889AAA]/[0.14] hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-[#889AAA]"}`} />
                    {f.label}
                  </button>
                );
              })}
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
              <div className="rounded-2xl bg-[#0D1B26] overflow-hidden divide-y divide-[#889AAA]/[0.12]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[76px] rounded-none bg-transparent" />
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pt-5 pb-5 px-6 space-y-2.5"
              >
                <Inbox className="mx-auto h-9 w-9 text-[#889AAA]" strokeWidth={1.5} />
                <p className="text-[20px] font-bold">Suspiciously Quiet…</p>
                <p className="text-[14px] text-muted-foreground max-w-[300px] mx-auto leading-snug">
                  Either everyone's driving like angels or nobody's snitching yet. We both know which one it is.
                </p>
                <ReportModal
                  trigger={
                    <Button variant="secondary" className="h-12 px-5 gap-2 mt-1 bg-[#122431] border-[#889AAA]/[0.16]">
                      <AlertTriangle className="h-4 w-4 text-primary" /> Be the First to Report
                    </Button>
                  }
                />
              </motion.div>
            ) : (
              <div className="rounded-2xl bg-[#0D1B26] border border-[#889AAA]/[0.14] overflow-hidden divide-y divide-[#889AAA]/[0.12]">
                {filteredReports.map((report, i) => (
                  <SocialReportCard key={report.id} report={report} hasUpvoted={myUpvotes.has(report.id)} votingId={votingId} onUpvote={handleUpvote} index={i} />
                ))}
              </div>
            )}
            </>)}

            <Link
              to="/claim"
              className="flex items-center justify-between h-[60px] border-y border-[#889AAA]/[0.12] text-foreground hover:text-primary transition-colors"
            >
              <span className="inline-flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" strokeWidth={1.75} />
                <span className="text-[15px] font-semibold">{paidClaims.length > 0 ? "My Plates" : "Claim Your Plate"}</span>
              </span>
              <ChevronRight className="h-[18px] w-[18px] text-[#889AAA]" />
            </Link>
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 space-y-4 shrink-0">
            <TrendingPlates plates={trendingPlates} />
          </div>
        </div>
      </div>

      <footer className="border-t border-border/30 py-6">
        <div className="container text-center text-xs text-muted-foreground space-y-2">
          <p>Plate N' State — Community-driven road safety. Not affiliated with any government agency.</p>
          <p className="flex items-center justify-center gap-3">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span aria-hidden>·</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span aria-hidden>·</span>
            <a href="mailto:support@plateandstate.com" className="hover:text-foreground transition-colors">Contact</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HonkZone;
