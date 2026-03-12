export type InfractionType =
  | "tailgating"
  | "speeding"
  | "ran_red_light"
  | "bad_parking"
  | "aggressive_lane_change"
  | "distracted_driving";

export interface InfractionDef {
  type: InfractionType;
  label: string;
  icon: string;
  points: number;
}

export interface PlateReport {
  id: string;
  plateNumber: string;
  infraction: InfractionType;
  location: string;
  timestamp: string;
  reporterId: string;
}

export interface PlateRecord {
  plateNumber: string;
  totalScore: number;
  reportCount: number;
  lastLocation: string;
  lastReported: string;
  infractions: Record<InfractionType, number>;
}

export interface Reporter {
  id: string;
  displayName: string;
  totalReports: number;
  badges: BadgeType[];
  joinedAt: string;
}

export type BadgeType = "first_report" | "watchdog" | "eagle_eye" | "top_reporter" | "streak_7";

export interface BadgeDef {
  type: BadgeType;
  label: string;
  description: string;
  icon: string;
  threshold: number;
}
