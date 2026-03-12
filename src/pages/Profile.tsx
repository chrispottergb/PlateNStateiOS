import Header from "@/components/Header";
import BadgeDisplay from "@/components/BadgeCard";
import { MOCK_REPORTER, MOCK_REPORTS, INFRACTIONS } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

const Profile = () => {
  const reporter = MOCK_REPORTER;
  const myReports = MOCK_REPORTS.filter(r => r.reporterId === reporter.id);

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
              <h1 className="text-xl font-bold">{reporter.displayName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Joined {format(new Date(reporter.joinedAt), "MMM yyyy")}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-2xl font-bold font-mono">{reporter.totalReports}</p>
              <p className="text-xs text-muted-foreground">Reports</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-2xl font-bold font-mono">{reporter.badges.length}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-2xl font-bold font-mono">#{3}</p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </div>
          </div>
        </motion.div>

        <h2 className="text-lg font-bold mb-4">Badges</h2>
        <div className="mb-8">
          <BadgeDisplay earnedBadges={reporter.badges} />
        </div>

        <h2 className="text-lg font-bold mb-3">Your Reports</h2>
        <div className="space-y-2">
          {myReports.map(report => {
            const inf = INFRACTIONS.find(i => i.type === report.infraction)!;
            return (
              <div key={report.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm">
                <span className="font-mono text-sm font-bold tracking-wider min-w-[90px]">{report.plateNumber}</span>
                <Badge variant="secondary" className="shrink-0 text-xs">{inf.label}</Badge>
                <div className="ml-auto text-right shrink-0">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {report.location}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}
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

export default Profile;
