import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { INFRACTIONS } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User, Calendar, Coins, ArrowDownRight, RefreshCw, Flame, Zap, Award, ArrowUpRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const BADGE_DEFS: Record<string, { label: string; icon: string; description: string }> = {
  first_report: { label: "First Report", icon: "🛡️", description: "Filed your first report" },
  ten_reports: { label: "Road Watcher", icon: "👁️", description: "Filed 10 reports" },
  fifty_reports: { label: "Guardian", icon: "⚔️", description: "Filed 50 reports" },
  first_verified: { label: "Verified", icon: "✅", description: "First report verified by community" },
  streak_7: { label: "On Fire", icon: "🔥", description: "7-day reporting streak" },
  streak_30: { label: "Unstoppable", icon: "💎", description: "30-day reporting streak" },
  hundred_xp: { label: "Rising Star", icon: "⭐", description: "Earned 100 XP" },
  thousand_xp: { label: "Legend", icon: "🏆", description: "Earned 1000 XP" },
};

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface UserBadge {
  badge_key: string;
  earned_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, reportsRes, txRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("reports").select("id, plate_number, infraction, location, created_at, upvote_count").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("credit_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", user.id).order("earned_at", { ascending: false }),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (txRes.data) setTransactions(txRes.data);
      if (badgesRes.data) setBadges(badgesRes.data as UserBadge[]);

      if (profileRes.data) autoAwardBadges(profileRes.data, badgesRes.data as UserBadge[] || []);
    };
    fetchData();
  }, [user]);

  const autoAwardBadges = async (p: any, existing: UserBadge[]) => {
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
      await supabase.from("user_badges").insert(
        toAward.map((key) => ({ user_id: user.id, badge_key: key }))
      );
      setBadges((prev) => [
        ...toAward.map((key) => ({ badge_key: key, earned_at: new Date().toISOString() })),
        ...prev,
      ]);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const txIcon = (type: string, amount: number) => {
    if (type === "monthly_refresh") return <RefreshCw className="h-4 w-4" />;
    if (type === "upvote_bonus") return <ArrowUpRight className="h-4 w-4" />;
    if (type === "streak_bonus") return <Flame className="h-4 w-4" />;
    return <ArrowDownRight className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-10 max-w-2xl">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl glass p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile.display_name || "Driver"}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Joined {format(new Date(profile.joined_at), "MMM yyyy")}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-2xl font-bold font-mono gradient-text-accent">{profile.total_reports}</p>
              <p className="text-xs text-muted-foreground">Reports</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-center gap-1">
                <Coins className="h-5 w-5 text-amber-500" />
                <p className="text-2xl font-bold font-mono">{credits ?? profile.credits}</p>
              </div>
              <p className="text-xs text-muted-foreground">Coins</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-center gap-1">
                <Zap className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold font-mono gradient-text-accent">{profile.xp}</p>
              </div>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-center gap-1">
                <Flame className={`h-5 w-5 ${profile.streak_days > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                <p className="text-2xl font-bold font-mono">{profile.streak_days}</p>
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Badges
            </h2>
            <div className="flex flex-wrap gap-2 mb-8">
              {badges.map((b) => {
                const def = BADGE_DEFS[b.badge_key];
                if (!def) return null;
                return (
                  <div
                    key={b.badge_key}
                    className="rounded-xl glass px-3 py-2 flex items-center gap-2"
                    title={def.description}
                  >
                    <span className="text-lg">{def.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{def.label}</p>
                      <p className="text-[10px] text-muted-foreground">{def.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Reports */}
        <h2 className="text-lg font-bold mb-3">Your Reports</h2>
        <div className="space-y-2 mb-8">
          {reports.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No reports yet. Start reporting bad drivers!</p>
          )}
          {reports.map((report) => {
            const inf = INFRACTIONS.find((i) => i.type === report.infraction);
            return (
              <div key={report.id} className="flex items-center gap-3 rounded-xl glass px-4 py-3">
                <span className="font-mono text-sm font-bold tracking-wider min-w-[90px]">{report.plate_number}</span>
                <Badge variant="secondary" className="shrink-0 text-xs rounded-full">{inf?.label || report.infraction}</Badge>
                {report.upvote_count > 0 && (
                  <Badge variant="outline" className="shrink-0 text-xs gap-1 rounded-full">
                    👍 {report.upvote_count}
                  </Badge>
                )}
                <div className="ml-auto text-right shrink-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {report.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coin History */}
        <h2 className="text-lg font-bold mb-3">Coin History</h2>
        <div className="space-y-2">
          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
          )}
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 rounded-xl glass px-4 py-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.amount > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                {txIcon(tx.type, tx.amount)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
              </div>
              <span className={`font-mono text-sm font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-destructive"}`}>
                {tx.amount > 0 ? "+" : ""}{tx.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
