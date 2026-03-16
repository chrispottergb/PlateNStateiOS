import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import ReportModal from "@/components/ReportModal";
import WisconsinPlate from "@/components/WisconsinPlate";
import { INFRACTIONS, getScoreColor, getScoreBg } from "@/lib/data";
import { usePlateDetail } from "@/hooks/usePlateRecords";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, MapPin, Clock, ThumbsUp } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const PlateDetail = () => {
  const { plateNumber } = useParams<{ plateNumber: string }>();
  const decoded = decodeURIComponent(plateNumber || "");
  const { plate, reports, loading } = usePlateDetail(decoded);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-6 max-w-2xl space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!plate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="font-mono text-3xl font-bold mb-4">{decoded}</h1>
          <p className="text-muted-foreground mb-6">No reports found for this plate.</p>
          <ReportModal
            trigger={
              <Button className="gap-2 rounded-full glow">
                <AlertTriangle className="h-4 w-4" /> Report this Plate
              </Button>
            }
            initialPlate={decoded}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl glass p-6 mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <WisconsinPlate plateNumber={plate.plateNumber} size="lg" className="mb-3" />
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>{plate.reportCount} reports</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {plate.lastLocation}
                </span>
              </div>
            </div>
            <div className={`flex flex-col items-center rounded-xl px-5 py-3 ${getScoreBg(plate.totalScore)}`}>
              <span className={`text-4xl font-bold font-mono ${getScoreColor(plate.totalScore)}`}>
                {plate.totalScore}
              </span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">score</span>
            </div>
          </div>

          {/* Infraction Breakdown */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INFRACTIONS.filter(inf => plate.infractions[inf.type] > 0).map(inf => (
              <div key={inf.type} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm font-medium">{inf.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs rounded-full">{plate.infractions[inf.type]}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <ReportModal
              trigger={
                <Button size="sm" className="gap-1.5 w-full sm:w-auto rounded-full glow">
                  <AlertTriangle className="h-4 w-4" /> Report Again
                </Button>
              }
              initialPlate={plate.plateNumber}
            />
          </div>
        </motion.div>

        {/* Report History */}
        <h2 className="text-lg font-bold mb-3">Report History</h2>
        <div className="space-y-2">
          {reports.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No reports recorded.</p>
          )}
          {reports.map(report => {
            const inf = INFRACTIONS.find(i => i.type === report.infraction);
            return (
              <div key={report.id} className="flex items-center gap-3 rounded-xl glass px-4 py-3">
                <Badge variant="secondary" className="shrink-0 rounded-full">{inf?.label || report.infraction}</Badge>
                <span className="text-xs text-muted-foreground">+{inf?.points ?? 3} pts</span>
                <div className="ml-auto text-right shrink-0 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="h-3 w-3" /> {report.upvote_count}
                  </span>
                  <div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {report.location}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {format(new Date(report.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlateDetail;
