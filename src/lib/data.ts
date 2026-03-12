import { BadgeDef, InfractionDef, InfractionType, PlateRecord, PlateReport, Reporter } from "./types";

export const INFRACTIONS: InfractionDef[] = [
  { type: "tailgating", label: "Tailgating", icon: "CarFront", points: 3 },
  { type: "speeding", label: "Speeding", icon: "Gauge", points: 4 },
  { type: "ran_red_light", label: "Ran Red Light", icon: "CircleAlert", points: 5 },
  { type: "bad_parking", label: "Bad Parking", icon: "ParkingSquare", points: 2 },
  { type: "aggressive_lane_change", label: "Aggressive Lane Change", icon: "ArrowLeftRight", points: 3 },
  { type: "distracted_driving", label: "Distracted Driving", icon: "Smartphone", points: 4 },
];

export const BADGES: BadgeDef[] = [
  { type: "first_report", label: "First Report", description: "Submitted your first report", icon: "Flag", threshold: 1 },
  { type: "watchdog", label: "Watchdog", description: "Submitted 10+ reports", icon: "Eye", threshold: 10 },
  { type: "eagle_eye", label: "Eagle Eye", description: "Submitted 50+ reports", icon: "Telescope", threshold: 50 },
  { type: "top_reporter", label: "Top Reporter", description: "In the top 10 reporters", icon: "Trophy", threshold: 0 },
  { type: "streak_7", label: "7-Day Streak", description: "Reported 7 days in a row", icon: "Flame", threshold: 7 },
];

export const WISCONSIN_CITIES = [
  "Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine",
  "Appleton", "Waukesha", "Oshkosh", "Eau Claire", "Janesville",
  "West Allis", "La Crosse", "Sheboygan", "Wauwatosa", "Fond du Lac",
];

// Mock data
const generatePlate = (): string => {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const l = () => letters[Math.floor(Math.random() * letters.length)];
  const n = () => Math.floor(Math.random() * 10);
  return `${l()}${l()}${l()} ${n()}${n()}${n()}${n()}`;
};

const randomCity = () => WISCONSIN_CITIES[Math.floor(Math.random() * WISCONSIN_CITIES.length)];
const randomInfraction = (): InfractionType => {
  const types: InfractionType[] = ["tailgating", "speeding", "ran_red_light", "bad_parking", "aggressive_lane_change", "distracted_driving"];
  return types[Math.floor(Math.random() * types.length)];
};

const PLATE_NUMBERS = Array.from({ length: 20 }, generatePlate);

export const MOCK_REPORTS: PlateReport[] = Array.from({ length: 80 }, (_, i) => {
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 14) + 6);
  date.setMinutes(Math.floor(Math.random() * 60));
  return {
    id: `report-${i}`,
    plateNumber: PLATE_NUMBERS[Math.floor(Math.random() * PLATE_NUMBERS.length)],
    infraction: randomInfraction(),
    location: `${randomCity()}, WI`,
    timestamp: date.toISOString(),
    reporterId: `reporter-${Math.floor(Math.random() * 5)}`,
  };
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export function buildPlateRecords(reports: PlateReport[]): PlateRecord[] {
  const map = new Map<string, PlateRecord>();
  for (const r of reports) {
    let rec = map.get(r.plateNumber);
    if (!rec) {
      rec = {
        plateNumber: r.plateNumber,
        totalScore: 0,
        reportCount: 0,
        lastLocation: r.location,
        lastReported: r.timestamp,
        infractions: { tailgating: 0, speeding: 0, ran_red_light: 0, bad_parking: 0, aggressive_lane_change: 0, distracted_driving: 0 },
      };
      map.set(r.plateNumber, rec);
    }
    const inf = INFRACTIONS.find(i => i.type === r.infraction)!;
    rec.totalScore += inf.points;
    rec.reportCount += 1;
    rec.infractions[r.infraction] += 1;
    if (new Date(r.timestamp) > new Date(rec.lastReported)) {
      rec.lastReported = r.timestamp;
      rec.lastLocation = r.location;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore);
}

export const MOCK_PLATES = buildPlateRecords(MOCK_REPORTS);

export const MOCK_REPORTER: Reporter = {
  id: "reporter-0",
  displayName: "Anonymous Reporter",
  totalReports: MOCK_REPORTS.filter(r => r.reporterId === "reporter-0").length,
  badges: ["first_report", "watchdog"],
  joinedAt: "2025-01-15T00:00:00Z",
};

export function getScoreColor(score: number): string {
  if (score >= 30) return "text-destructive";
  if (score >= 15) return "text-warning";
  return "text-muted-foreground";
}

export function getScoreBg(score: number): string {
  if (score >= 30) return "bg-destructive/10";
  if (score >= 15) return "bg-warning/10";
  return "bg-muted";
}
