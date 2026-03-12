import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import ReportModal from "@/components/ReportModal";
import { MOCK_REPORTS, MOCK_PLATES, INFRACTIONS, getScoreColor, getScoreBg } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";

const PlateDetail = () => {
  const { plateNumber } = useParams<{ plateNumber: string }>();
  const decoded = decodeURIComponent(plateNumber || "");
  const plate = MOCK_PLATES.find(p => p.plateNumber === decoded);
  const reports = MOCK_REPORTS.filter(r => r.plateNumber === decoded).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const rank = MOCK_PLATES.findIndex(p => p.plateNumber === decoded) + 1;

  if (!plate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <h1 className="font-mono text-3xl font-bold mb-4">{decoded}</h1>
          <p className="text-muted-foreground mb-6">No reports found for this plate.</p>
          <ReportModal
            trigger={
              <Button className="gap-2">
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
      <div className="container py-6 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-card p-6 shadow-sm mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Wisconsin Plate</p>
              <h1 className="font-mono text-3xl font-bold tracking-wider">{plate.plateNumber}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>Rank #{rank}</span>
                <span>·</span>
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
              <div key={inf.type} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <span className="text-sm font-medium">{inf.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{plate.infractions[inf.type]}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <ReportModal
              trigger={
                <Button size="sm" className="gap-1.5 w-full sm:w-auto">
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
          {reports.map(report => {
            const inf = INFRACTIONS.find(i => i.type === report.infraction)!;
            return (
              <div key={report.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm">
                <Badge variant="secondary" className="shrink-0">{inf.label}</Badge>
                <span className="text-xs text-muted-foreground">+{inf.points} pts</span>
                <div className="ml-auto text-right shrink-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {report.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {format(new Date(report.timestamp), "MMM d, h:mm a")}
                  </span>
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
