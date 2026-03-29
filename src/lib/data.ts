import { BadgeDef, InfractionDef, InfractionType, PlateRecord, PlateReport, Reporter } from "./types";

export const INFRACTIONS: InfractionDef[] = [
  { type: "tailgating", label: "Tailgating", icon: "CarFront", points: 3 },
  { type: "speeding", label: "Speeding", icon: "Gauge", points: 4 },
  { type: "ran_red_light", label: "Ran Red Light", icon: "CircleAlert", points: 5 },
  { type: "bad_parking", label: "Bad Parking", icon: "ParkingSquare", points: 2 },
  { type: "aggressive_lane_change", label: "Aggressive Lane Change", icon: "ArrowLeftRight", points: 3 },
  { type: "distracted_driving", label: "Distracted Driving", icon: "Smartphone", points: 4 },
  { type: "no_turn_signal", label: "No Turn Signal", icon: "CornerUpRight", points: 2 },
  { type: "rolling_stop", label: "Rolling Stop", icon: "OctagonAlert", points: 3 },
  { type: "double_parking", label: "Double Parking", icon: "ParkingSquare", points: 3 },
  { type: "blocking_intersection", label: "Blocking Intersection", icon: "Ban", points: 4 },
  { type: "road_rage", label: "Road Rage", icon: "Angry", points: 5 },
  { type: "wrong_way", label: "Wrong Way Driver", icon: "ArrowUpDown", points: 5 },
  { type: "illegal_uturn", label: "Illegal U-Turn", icon: "Undo2", points: 3 },
  { type: "running_stop_sign", label: "Running Stop Sign", icon: "Octagon", points: 4 },
  { type: "cutting_off", label: "Cutting Off", icon: "Scissors", points: 3 },
  { type: "brake_checking", label: "Brake Checking", icon: "CircleStop", points: 5 },
  { type: "driving_too_slow", label: "Driving Too Slow", icon: "Snail", points: 1 },
  { type: "high_beams", label: "High Beams On", icon: "Lightbulb", points: 2 },
  { type: "honking_excessively", label: "Excessive Honking", icon: "Volume2", points: 2 },
  { type: "littering", label: "Littering from Vehicle", icon: "Trash2", points: 3 },
  { type: "passing_school_bus", label: "Passing School Bus", icon: "Bus", points: 5 },
  { type: "not_yielding_pedestrian", label: "Not Yielding to Pedestrian", icon: "Footprints", points: 4 },
  { type: "shoulder_driving", label: "Driving on Shoulder", icon: "MoveRight", points: 4 },
  { type: "texting_driving", label: "Texting & Driving", icon: "MessageSquare", points: 4 },
  { type: "dui_suspected", label: "Suspected DUI", icon: "Wine", points: 5 },
  { type: "suspicious_vehicle", label: "Suspicious Vehicle", icon: "Eye", points: 3 },
  { type: "hit_and_run", label: "Hit and Run", icon: "Siren", points: 5 },
  { type: "expired_tags", label: "Expired Tags", icon: "Calendar", points: 1 },
  { type: "loud_exhaust", label: "Loud Exhaust", icon: "Volume2", points: 2 },
  { type: "left_lane_camping", label: "Left Lane Camping", icon: "Tent", points: 2 },
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
