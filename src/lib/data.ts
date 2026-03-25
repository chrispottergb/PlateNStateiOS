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
