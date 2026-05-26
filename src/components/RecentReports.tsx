import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { INFRACTIONS } from "@/lib/data";
import { MapPin, ThumbsUp } from "lucide-react";
import LicensePlate from "./LicensePlate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Report {
  id: string;
  plate_number: string;
  infraction: string;
  location: string;
  created_at: string;
  upvote_count: number;
  state?: string | null;
}

const RecentReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [myUpvotes, setMyUpvotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select("id, plate_number, infraction, location, created_at, upvote_count")
      .order("created_at", { ascending: false })
      .limit(15);
    if (data) setReports(data);
  };

  const fetchMyUpvotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("report_upvotes")
      .select("report_id")
      .eq("user_id", user.id);
    if (data) setMyUpvotes(new Set(data.map((u) => u.report_id)));
  };

  useEffect(() => {
    fetchReports();
    fetchMyUpvotes();
  }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel("recent-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
        fetchReports();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpvote = async (reportId: string) => {
    if (!user) {
      toast.error("Sign in to upvote reports");
      return;
    }
    setVotingId(reportId);
    try {
      const { error } = await supabase.rpc("upvote_report", { p_report_id: reportId } as any);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.info("Already upvoted");
        } else if (error.message.includes("own report")) {
          toast.info("Can't upvote your own report");
        } else {
          toast.error(error.message);
        }
      } else {
        setMyUpvotes((prev) => new Set(prev).add(reportId));
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, upvote_count: r.upvote_count + 1 } : r
          )
        );
        toast.success("Upvoted! +1 XP");
      }
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {reports.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">No reports yet.</p>
      )}
      {reports.map((report) => {
        const inf = INFRACTIONS.find((i) => i.type === report.infraction);
        const hasUpvoted = myUpvotes.has(report.id);
        return (
          <div
            key={report.id}
            className="flex items-center gap-3 rounded-xl glass px-4 py-3 transition-all hover:glow group"
          >
            <Link
              to={`/plate/${encodeURIComponent(report.plate_number)}`}
              className="shrink-0"
            >
              <WisconsinPlate plateNumber={report.plate_number} size="sm" />
            </Link>
            <Badge variant="secondary" className="text-xs shrink-0 rounded-full">
              {inf?.label || report.infraction}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto shrink-0">
              <MapPin className="h-3 w-3" />
              <span className="hidden sm:inline">{report.location}</span>
              <span className="sm:hidden">{report.location.split(",")[0]}</span>
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </span>
            <Button
              variant={hasUpvoted ? "default" : "ghost"}
              size="sm"
              className={`h-7 px-2 gap-1 shrink-0 rounded-full ${hasUpvoted ? "" : "text-muted-foreground"}`}
              disabled={votingId === report.id || hasUpvoted}
              onClick={() => handleUpvote(report.id)}
            >
              <ThumbsUp className="h-3 w-3" />
              <span className="text-xs font-mono">{report.upvote_count}</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default RecentReports;
