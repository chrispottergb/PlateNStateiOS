import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { INFRACTIONS, MOCK_REPORTS } from "@/lib/data";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RecentReports = () => {
  const recent = MOCK_REPORTS.slice(0, 10);

  return (
    <div className="space-y-2">
      {recent.map(report => {
        const inf = INFRACTIONS.find(i => i.type === report.infraction)!;
        return (
          <Link
            key={report.id}
            to={`/plate/${encodeURIComponent(report.plateNumber)}`}
            className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 shadow-sm transition-all hover:shadow-md group"
          >
            <span className="font-mono text-sm font-bold tracking-wider text-foreground group-hover:text-primary transition-colors min-w-[90px]">
              {report.plateNumber}
            </span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {inf.label}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto shrink-0">
              <MapPin className="h-3 w-3" />
              <span className="hidden sm:inline">{report.location}</span>
              <span className="sm:hidden">{report.location.split(",")[0]}</span>
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default RecentReports;
