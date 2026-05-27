import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { INFRACTIONS } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MapPin, Clock, User, Calendar, Coins, Flame, Zap, Award, Star, Shield, Trophy, Eye, Flag, Telescope, Pencil } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import LicensePlate from "@/components/LicensePlate";
import EditReportModal, { EditableReport } from "@/components/EditReportModal";
import { differenceInHours } from "date-fns";

const BADGE_DEFS: Record<string, { label: string; icon: string; description: string }> = {
  first_report: { label: "First Report", icon: "🛡️", description: "Filed your first report" },
  ten_reports: { label: "Road Watcher", icon: "👁️", description: "Filed 10 reports" },
  fifty_reports: { label: "Guardian", icon: "⚔️", description: "Filed 50 reports" },
  first_verified: { label: "Verified", icon: "✅", description: "First report verified" },
  streak_7: { label: "On Fire", icon: "🔥", description: "7-day streak" },
  streak_30: { label: "Unstoppable", icon: "💎", description: "30-day streak" },
  hundred_xp: { label: "Rising Star", icon: "⭐", description: "Earned 100 XP" },
  thousand_xp: { label: "Legend", icon: "🏆", description: "Earned 1000 XP" },
};

const ALL_BADGE_KEYS = Object.keys(BADGE_DEFS);

const LEVEL_TITLES = [
  "Rookie Reporter", "Street Scout", "Road Watcher", "Traffic Tracker",
  "Lane Enforcer", "Signal Sentinel", "Highway Hero", "Patrol Pro",
  "Asphalt Avenger", "Road Guardian", "Traffic Titan", "Enforcement Elite",
  "Road Ruler", "Supreme Snitch", "Legend of the Lane"
];

const getLevel = (xp: number) => {
  const level = Math.floor(xp / 100) + 1;
  return Math.min(level, LEVEL_TITLES.length);
};

const getLevelTitle = (xp: number) => LEVEL_TITLES[Math.min(getLevel(xp) - 1, LEVEL_TITLES.length - 1)];
const getXpForNextLevel = (xp: number) => getLevel(xp) * 100;
const getXpProgress = (xp: number) => {
  const currentLevelXp = (getLevel(xp) - 1) * 100;
  const nextLevelXp = getLevel(xp) * 100;
  return ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
};

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
  state?: string | null;
  // editable fields
  comment?: string | null;
  vehicle_type?: string | null;
  vehicle_color?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_features?: string[] | null;
  driver_gender?: string | null;
  edited_at?: string | null;
}

interface UserBadge {
  badge_key: string;
  earned_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingReport, setEditingReport] = useState<EditableReport | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: reports = [], refetch: refetchReports } = useQuery<Report[]>({
    queryKey: ["my-reports", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reports")
        .select("id, plate_number, infraction, location, created_at, upvote_count, state, comment, vehicle_type, vehicle_color, vehicle_make, vehicle_model, vehicle_features, driver_gender, edited_at")
        .eq("reporter_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Report[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: badges = [] } = useQuery<UserBadge[]>({
    queryKey: ["badges", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", user!.id).order("earned_at", { ascending: false });
      return (data ?? []) as UserBadge[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ["disputes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("report_disputes").select("id, plate_number, reason, status, paid, created_at").eq("disputer_id", user!.id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const autoAwardBadges = useCallback(async (p: any, existing: UserBadge[]) => {
    const earned = new Set(existing.map((b) => b.badge_key));
    const toAward: string[] = [];
    if (p.total_reports >= 1 && !earned.has("first_report")) toAward.push("first_report");
    if (p.total_reports >= 10 && !earned.has("ten_reports")) toAward.push("ten_reports");
    if (p.total_reports >= 50 && !earned.has("fifty_reports")) toAward.push("fifty_reports");
    if (p.streak_days >= 7 && !earned.has("streak_7")) toAward.push("streak_7");
    if (p.streak_days >= 30 && !earned.has("streak_30")) toAward.push("streak_30");
    if (p.xp >= 100 && !earned.has("hundred_xp")) toAward.push("hundred_xp");
    if (p.xp >= 1000 && !earned.has("thousand_xp")) toAward.push("thousand_xp");
    if (toAward.length > 0 && user) {
      await supabase.from("user_badges").insert(toAward.map((key) => ({ user_id: user.id, badge_key: key })));
      // Invalidate badges cache so the new badges appear
      queryClient.invalidateQueries({ queryKey: ["badges", user.id] });
    }
  }, [user, queryClient]);

  // Award badges once profile + badges are loaded
  useEffect(() => {
    if (profile && badges.length >= 0) autoAwardBadges(profile, badges);
  }, [profile?.id]); // only run when profile first loads, not on every badge change

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const earnedKeys = new Set(badges.map(b => b.badge_key));
  const level = getLevel(profile.xp);
  const xpProgress = getXpProgress(profile.xp);
  const nextLevelXp = getXpForNextLevel(profile.xp);
  const xpNeeded = nextLevelXp - profile.xp;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10 max-w-2xl">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-3 text-2xl font-bold">
            {(profile.display_name || "D")[0].toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold">{profile.display_name || "Driver"}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
            <Calendar className="h-3 w-3" /> Reporting for duty since {format(new Date(profile.joined_at), "MMMM yyyy")}
          </p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl glass-card p-4 text-center">
            <p className="text-2xl font-bold font-mono gradient-text-accent">{profile.total_reports}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reports</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame className={`h-5 w-5 ${profile.streak_days > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              <p className="text-2xl font-bold font-mono">{profile.streak_days}</p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Day Streak</p>
          </div>
          <div className="rounded-xl glass-card p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Coins className="h-5 w-5 text-amber-500" />
              <p className="text-2xl font-bold font-mono">{credits ?? profile.credits}</p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coins</p>
          </div>
        </motion.div>

        {/* Level Progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl glass-card p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Level {level} — {getLevelTitle(profile.xp)}</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{profile.xp} / {nextLevelXp} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2.5 [&>div]:bg-primary" />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {xpNeeded} XP until "{LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)]}"
          </p>
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" /> Achievements
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {ALL_BADGE_KEYS.map(key => {
              const def = BADGE_DEFS[key];
              const earned = earnedKeys.has(key);
              return (
                <div
                  key={key}
                  className={`rounded-xl p-3 text-center transition-all ${
                    earned ? "glass-card border-primary/30" : "bg-muted/30 opacity-40"
                  }`}
                  title={def.description}
                >
                  <span className="text-2xl block mb-1">{def.icon}</span>
                  <p className="text-[10px] font-semibold truncate">{def.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Reports */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Recent Reports</h2>
          <div className="space-y-2 mb-4">
            {reports.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No reports yet. Start reporting bad drivers!</p>
            )}
            {reports.map((report) => {
              const inf = INFRACTIONS.find((i) => i.type === report.infraction);
              const editable = differenceInHours(new Date(), new Date(report.created_at)) < 24;
              return (
                <div key={report.id} className="flex items-center gap-2">
                  <Link to={`/plate/${encodeURIComponent(report.plate_number)}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 rounded-xl glass-card p-3 hover:border-primary/30 transition-all">
                      <LicensePlate plateNumber={report.plate_number} state={report.state} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="rounded-full text-[10px]">{inf?.label || report.infraction}</Badge>
                          {report.edited_at && (
                            <span className="text-[9px] text-muted-foreground italic">edited</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {report.location}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px] text-primary rounded-full">+{inf?.points ?? 3} XP</Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </Link>
                  {editable && (
                    <button
                      title="Edit report"
                      onClick={() => {
                        setEditingReport(report as EditableReport);
                        setEditModalOpen(true);
                      }}
                      className="shrink-0 rounded-lg border border-border/50 p-2.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {reports.length > 0 && (
            <div className="text-center">
              <Button variant="outline" size="sm" className="rounded-full">View Full History</Button>
            </div>
          )}
        </motion.div>

        <EditReportModal
          report={editingReport}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSaved={(updated) => {
            setReports(prev => prev.map(r =>
              r.id === editingReport?.id ? { ...r, ...updated } : r
            ));
          }}
        />
        {/* My Disputes */}
        {disputes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Flag className="h-4 w-4" /> My Disputes
            </h2>
            <div className="space-y-2">
              {disputes.map((d) => {
                const statusColor =
                  d.status === "upheld" ? "text-emerald-600 border-emerald-500/30" :
                  d.status === "denied" ? "text-destructive border-destructive/30" :
                  d.paid ? "text-amber-500 border-amber-500/30" : "text-muted-foreground border-border";
                const statusLabel =
                  d.status === "upheld" ? "Upheld — post removed" :
                  d.status === "denied" ? "Denied" :
                  d.paid ? "Pending review" : "Awaiting payment";
                return (
                  <div key={d.id} className="rounded-xl glass-card p-3 flex items-center gap-3">
                    <LicensePlate plateNumber={d.plate_number} size="sm" />
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="rounded-full text-[10px] mb-0.5 capitalize">{d.reason.replace(/_/g, " ")}</Badge>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] rounded-full ${statusColor}`}>{statusLabel}</Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
