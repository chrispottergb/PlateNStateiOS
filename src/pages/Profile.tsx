import { useEffect, useState } from "react";
import Header from "@/components/Header";
import BadgeDisplay from "@/components/BadgeCard";
import { INFRACTIONS } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User, Calendar, Coins, ArrowDownRight, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, reportsRes, txRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("reports").select("*").eq("reporter_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("credit_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (txRes.data) setTransactions(txRes.data);
    };
    fetchData();
  }, [user]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-card p-6 shadow-sm mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-2xl font-bold font-mono">{profile.total_reports}</p>
              <p className="text-xs text-muted-foreground">Reports</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-center gap-1">
                <Coins className="h-5 w-5 text-amber-500" />
                <p className="text-2xl font-bold font-mono">{credits ?? profile.credits}</p>
              </div>
              <p className="text-xs text-muted-foreground">Coins Left</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-2xl font-bold font-mono">20</p>
              <p className="text-xs text-muted-foreground">Monthly Limit</p>
            </div>
          </div>
        </motion.div>

        <h2 className="text-lg font-bold mb-3">Your Reports</h2>
        <div className="space-y-2 mb-8">
          {reports.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No reports yet. Start reporting bad drivers!</p>
          )}
          {reports.map(report => {
            const inf = INFRACTIONS.find(i => i.type === report.infraction);
            return (
              <div key={report.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm">
                <span className="font-mono text-sm font-bold tracking-wider min-w-[90px]">{report.plate_number}</span>
                <Badge variant="secondary" className="shrink-0 text-xs">{inf?.label || report.infraction}</Badge>
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

        <h2 className="text-lg font-bold mb-3">Coin History</h2>
        <div className="space-y-2">
          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
          )}
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.amount > 0 ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                {tx.type === "monthly_refresh" ? <RefreshCw className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
              </div>
              <span className={`font-mono text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}>
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
