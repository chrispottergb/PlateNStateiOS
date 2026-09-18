import { useState, useCallback, useRef } from "react";
import { getPosition } from "@/lib/native";
import * as Icons from "lucide-react";
import {
  Loader2, MapPin, Car, User, Sparkles, ThumbsUp, ThumbsDown, AlertTriangle, Check, Coins,
  X, ChevronRight, ChevronDown, Calendar, FileText, Pencil, ShieldCheck, CheckCircle2, Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PlateScanner from "@/components/PlateScanner";
import LicensePlate from "@/components/LicensePlate";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BAD_INFRACTIONS, GOOD_BEHAVIORS, INFRACTIONS } from "@/lib/data";
import { US_STATES, getStateByCode, stateNameToCode } from "@/lib/usStates";
import { InfractionDef, InfractionType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCaptcha } from "@/hooks/useCaptcha";
import { useCredits } from "@/hooks/useCredits";
import { getClientIp } from "@/lib/clientIp";
import { useHomeState } from "@/hooks/useHomeState";
import { usePlateClaim } from "@/hooks/useClaimStatus";
import ClaimUpsellDialog, { claimUpsellDismissed } from "@/components/ClaimUpsellDialog";
import { cn } from "@/lib/utils";

const VEHICLE_TYPES = ["Sedan", "SUV", "Truck", "Van", "Minivan", "Coupe", "Convertible", "Hatchback", "Wagon", "Motorcycle", "Semi/Commercial"];
const VEHICLE_COLORS = ["Black", "White", "Silver/Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Gold", "Other"];
const VEHICLE_FEATURE_OPTIONS = [
  "Visible Damage",
  "Aftermarket Rims",
  "Lifted/Lowered",
  "Custom Paint/Wrap",
  "Tinted Windows",
  "Loud Exhaust",
  "Bumper Stickers",
];

const QUICK_BAD: InfractionType[] = [
  "tailgating", "speeding", "ran_red_light", "no_turn_signal",
  "distracted_driving", "road_rage", "bad_parking", "suspicious_vehicle",
];

const DRIVER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "elderly_male", label: "Elderly Male" },
  { value: "elderly_female", label: "Elderly Female" },
  { value: "young_male", label: "Young Male" },
  { value: "young_female", label: "Young Female" },
  { value: "unknown", label: "Unknown / Not Sure" },
];

interface ReportModalProps {
  trigger: React.ReactNode;
  initialPlate?: string;
  initialComment?: string;
  // Plate's registration state, as read by the scanner. Pass "" to mean
  // "scanned but state unreadable — force the user to pick it". Leave undefined
  // for non-scan callers so it defaults to the user's home state.
  initialState?: string;
  initialStacked?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// 1 plate · 2 confirm · 3 behavior · 4 details · 5 review · 6 success
const PROGRESS_STEPS = 5;
const STEP_NAMES = ["Plate", "Confirm", "Behavior", "Details", "Review"];

const BehaviorIcon = ({ name, className }: { name: string; className?: string }) => {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Cmp ? <Cmp className={className} /> : <AlertTriangle className={className} />;
};

// Bad driving is a deduction, good driving is a credit — display only, the
// stored weights in data.ts are untouched.
const formatPoints = (inf?: InfractionDef | null) => {
  if (!inf || inf.points === 0) return null;
  const magnitude = Math.abs(inf.points);
  return inf.kind === "good"
    ? { text: `+${magnitude} pts`, className: "text-success" }
    : { text: `−${magnitude} pts`, className: "text-destructive" };
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
};

const ReportModal = ({ trigger, initialPlate = "", initialComment = "", initialState, initialStacked = "", open: controlledOpen, onOpenChange: controlledOnOpenChange }: ReportModalProps) => {
  const { user } = useAuth();
  const { homeState } = useHomeState();
  const { refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    controlledOnOpenChange?.(v);
  };
  const [showClaimUpsell, setShowClaimUpsell] = useState(false);
  const startStep = initialPlate ? 2 : 1;
  const [step, setStep] = useState(startStep);
  const [direction, setDirection] = useState(1);
  const [plateNumber, setPlateNumber] = useState(initialPlate);
  // Ownership of the plate being reported — the generic claim upsell is
  // suppressed when that plate already has an active claim (mine or other).
  const { status: reportedPlateClaim } = usePlateClaim(plateNumber);
  const [infraction, setInfraction] = useState<InfractionType | null>(null);
  const [behaviorTab, setBehaviorTab] = useState<"bad" | "good">("bad");
  const [location, setLocation] = useState("");
  const [ksCounty, setKsCounty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "denied">("idle");
  const [geocoding, setGeocoding] = useState(false);
  const [autoDetectedLocation, setAutoDetectedLocation] = useState<string | null>(null);
  // Plate's home state (where the plate is registered) — defaults to user's home_state
  const [plateState, setPlateState] = useState<string>(initialState !== undefined ? initialState : (homeState || "WI"));
  // Small stacked characters to the LEFT of the main plate (e.g. Illinois "FP").
  const [stackedPrefix, setStackedPrefix] = useState<string>(initialStacked);
  // Incident state (where the report happened) — set by GPS reverse-geocode
  const [incidentState, setIncidentState] = useState<string>(homeState || "WI");
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [showAllInfractions, setShowAllInfractions] = useState(false);
  const [aiTagging, setAiTagging] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ plate: string; label: string | null } | null>(null);
  const upsellAfterCloseRef = useRef(false);

  // Vehicle fields
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>([]);

  // Driver
  const [driverDescription, setDriverDescription] = useState<string>("");
  const [comment, setComment] = useState(initialComment);

  const reset = () => {
    setStep(startStep);
    setDirection(1);
    setPlateNumber(initialPlate);
    setInfraction(null);
    setBehaviorTab("bad");
    setLocation("");
    setKsCounty("");
    setLatitude(null);
    setLongitude(null);
    setGeoStatus("idle");
    setGeocoding(false);
    setAutoDetectedLocation(null);
    setPlateState(initialState !== undefined ? initialState : (homeState || "WI"));
    setStackedPrefix(initialStacked);
    setIncidentState(homeState || "WI");
    setDateTime(new Date().toISOString().slice(0, 16));
    setVehicleType("");
    setVehicleColor("");
    setVehicleMake("");
    setVehicleModel("");
    setVehicleFeatures([]);
    setDriverDescription("");
    setComment(initialComment);
    setShowAllInfractions(false);
    setAiTagging(false);
    setVehicleOpen(false);
    setSubmitted(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (v && !user) {
      toast.error("Sign in required", { description: "You need an account to report plates." });
      navigate("/auth");
      return;
    }
    setOpen(v);
    if (v) {
      detectLocation();
      setComment(initialComment);
    }
    if (!v) {
      reset();
      if (upsellAfterCloseRef.current) {
        upsellAfterCloseRef.current = false;
        setTimeout(() => setShowClaimUpsell(true), 600);
      }
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address;
      const city = addr?.city || addr?.town || addr?.village || addr?.county || "";
      const stName = addr?.state || "";
      const code = stateNameToCode(stName);
      if (code) setIncidentState(code);
      if (city) {
        const detected = `${city}${code ? `, ${code}` : ""}`;
        setAutoDetectedLocation(detected);
        setLocation(detected);
      }
    } catch {
      // fallback to manual
    } finally {
      setGeocoding(false);
    }
  };

  const detectLocation = useCallback(async () => {
    setGeoStatus("loading");
    const pos = await getPosition();
    if (pos) {
      setLatitude(pos.latitude);
      setLongitude(pos.longitude);
      setGeoStatus("done");
      reverseGeocode(pos.latitude, pos.longitude);
    } else {
      setGeoStatus("denied");
    }
  }, []);

  const toggleFeature = (feature: string) => {
    setVehicleFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const autoTagFromComment = useCallback(async () => {
    if (infraction || !comment || comment.trim().length < 10) return;
    setAiTagging(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-tag-behavior", {
        body: { comment: comment.trim() },
      });
      if (error) return;
      if (data?.type && data.confidence >= 0.6) {
        const found = INFRACTIONS.find(i => i.type === data.type);
        if (found) {
          setInfraction(found.type);
          setBehaviorTab(found.kind === "good" ? "good" : "bad");
          toast.success(`AI tagged: ${found.label}`, { description: `Confidence ${Math.round(data.confidence * 100)}%` });
        }
      }
    } catch {
      // silent
    } finally {
      setAiTagging(false);
    }
  }, [comment, infraction]);

  const captcha = useCaptcha();
  const handleSubmit = async () => {
    if (!user) return;
    if (!plateState) {
      toast.error("Confirm the plate's state", { description: "The scanner couldn't read it — pick the state so the report lands on the right vehicle." });
      return;
    }
    setSubmitting(true);
    try {
      const ip = await getClientIp();
      void captcha.token;
      // Build location with KS county if provided; fall back to incident state if no city selected
      let finalLocation = location.trim() || incidentState;
      if (plateState === "KS" && ksCounty.trim()) {
        finalLocation = `${finalLocation} — ${ksCounty.trim()} County`;
      }
      // Infraction is OPTIONAL — use sentinel when missing
      const finalInfraction = infraction ?? "unspecified";
      // Combine the stacked prefix with the main plate (e.g. "FP" + "239633").
      const finalPlate = [stackedPrefix.trim(), plateNumber.trim()].filter(Boolean).join(" ");
      const { error } = await supabase.rpc("spend_credit_on_report", {
        p_plate_number: finalPlate,
        p_infraction: finalInfraction,
        p_location: finalLocation,
        p_latitude: latitude,
        p_longitude: longitude,
        p_vehicle_type: vehicleType || null,
        p_vehicle_color: vehicleColor || null,
        p_vehicle_make: vehicleMake || null,
        p_vehicle_model: vehicleModel || null,
        p_vehicle_features: vehicleFeatures.length > 0 ? vehicleFeatures : [],
        p_driver_gender: driverDescription || null,
        p_comment: comment || null,
        p_state: plateState,
        p_incident_state: incidentState,
        p_ip: ip,
        p_is_psv: false,
        p_psv_agency_type: null,
        p_psv_unit_number: null,
        p_psv_on_duty: false,
      } as any);
      if (error) {
        if (error.message.includes("Insufficient credits")) {
          toast.error("Not enough coins!", { description: "You've used all your monthly coins. Credits refresh on the 1st." });
        } else if (error.message.includes("DUPLICATE_REPORT")) {
          toast.error("Already reported", { description: "You've already reported this plate in the last 24 hours. Try again tomorrow." });
        } else if (error.message.includes("RATE_LIMITED")) {
          toast.error("Too many requests, slow down", { description: "Please wait a moment before submitting again." });
        } else if (error.message.includes("LOCATION_REQUIRED")) {
          toast.error("Location required", { description: "Reports must be filed from where the incident happened. Enable location and try again." });
        } else if (error.message.includes("INVALID_STATE")) {
          toast.error("Invalid state", { description: "Pick a valid US state for the report." });
        } else {
          toast.error("Failed to submit report", { description: error.message });
        }
        return;
      }
      const inf = INFRACTIONS.find(i => i.type === infraction);
      refetchCredits(); // keep header coin count in sync
      // High-intent moment: nudge the reporter to claim their own plate (unless
      // dismissed, or the plate just reported is already claimed). Fires when
      // the success screen is dismissed.
      upsellAfterCloseRef.current = !claimUpsellDismissed() && reportedPlateClaim === "unclaimed";
      setSubmitted({ plate: finalPlate, label: inf?.label ?? null });
      go(6);
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Allow up to 10 chars
  const formatPlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 10);

  const hasVerifiedLocation = latitude !== null && longitude !== null && !!autoDetectedLocation && !!incidentState;
  const plateValid = plateNumber.trim().length >= 4;

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const canContinue = () => {
    if (step === 1) return plateValid && !!plateState;
    if (step === 2) return !!plateState;
    if (step === 3) return true; // behavior optional
    if (step === 4) return hasVerifiedLocation;
    return true;
  };

  const onScanResult = (plate: string, scannedState: string | null, gps?: { latitude: number; longitude: number } | null, stacked?: string | null) => {
    setPlateNumber(plate.slice(0, 10));
    setStackedPrefix(stacked || "");
    if (scannedState && US_STATES.some(s => s.code === scannedState)) {
      setPlateState(scannedState);
    } else {
      // OCR couldn't read the state — force the user to pick it. Silently
      // defaulting to home/GPS state can pin a report on the SAME plate number
      // registered in a DIFFERENT state.
      setPlateState("");
    }
    if (gps && latitude === null) {
      setLatitude(gps.latitude);
      setLongitude(gps.longitude);
      setGeoStatus("done");
      reverseGeocode(gps.latitude, gps.longitude);
    } else if (latitude === null) {
      detectLocation();
    }
    if (plate.length >= 4) go(2);
  };

  const selectedInfraction = INFRACTIONS.find(i => i.type === infraction) ?? null;
  const displayPlate = [stackedPrefix.trim(), plateNumber.trim()].filter(Boolean).join(" ");
  const vehicleSummary = [vehicleColor, vehicleType, vehicleMake, vehicleModel].filter(Boolean).join(" ");
  const visibleBad = showAllInfractions ? BAD_INFRACTIONS : BAD_INFRACTIONS.filter(i => QUICK_BAD.includes(i.type));
  const stateName = plateState ? getStateByCode(plateState).name : "";

  const closeFromSuccess = () => handleOpenChange(false);
  const reportAnother = () => {
    upsellAfterCloseRef.current = false;
    reset();
    setStep(1);
  };
  const viewPlate = () => {
    const plate = submitted?.plate ?? displayPlate;
    upsellAfterCloseRef.current = false;
    handleOpenChange(false);
    navigate(`/plate/${encodeURIComponent(plate)}`);
  };

  /* ---------------- shared UI bits ---------------- */

  const StateSelect = ({ className }: { className?: string }) => (
    <Select value={plateState} onValueChange={setPlateState}>
      <SelectTrigger
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Plate state"
        className={cn(
          "h-14 rounded-[14px] bg-input border-[#889AAA]/[0.18] text-[16px] font-bold",
          !plateState && "border-destructive ring-2 ring-destructive/30",
          className,
        )}
      >
        <SelectValue placeholder="State" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {US_STATES.map(s => (
          <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const primaryBtn = "press flex w-full h-14 items-center justify-center gap-2.5 rounded-[14px] bg-primary text-[#0B1017] text-[17px] font-bold shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_6px_14px_-6px_rgba(245,166,35,0.55)] hover:brightness-[1.03] disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none";
  const secondaryBtn = "press flex w-full h-12 items-center justify-center gap-2 rounded-[14px] bg-[#122431] border border-[#889AAA]/[0.18] text-[15px] font-semibold text-foreground hover:border-[#889AAA]/40";
  const tertiaryBtn = "flex w-full h-11 items-center justify-center gap-1.5 text-[14px] font-semibold text-[#A0B0BE] hover:text-foreground transition-colors";

  const StepHeading = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="text-center mb-5">
      <h2 className="text-[26px] leading-[1.15] font-bold tracking-[-0.01em] text-foreground">{title}</h2>
      {sub && <p className="mt-1.5 text-[14px] leading-snug text-[#A0B0BE]">{sub}</p>}
    </div>
  );

  const BehaviorRow = ({ inf }: { inf: InfractionDef }) => {
    const selected = infraction === inf.type;
    const good = inf.kind === "good";
    const pts = formatPoints(inf);
    return (
      <button
        type="button"
        onClick={() => setInfraction(selected ? null : inf.type)}
        aria-pressed={selected}
        className={cn(
          "press flex w-full items-center gap-3 rounded-[14px] border px-3.5 h-[56px] text-left transition-colors duration-150",
          selected
            ? good
              ? "border-success bg-success/[0.10]"
              : "border-primary bg-primary/[0.10]"
            : "border-[#889AAA]/[0.16] bg-[#0D1B26] hover:border-[#889AAA]/40",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            selected ? (good ? "bg-success/20 text-success" : "bg-primary/20 text-primary") : "bg-[#122431] text-[#A0B0BE]",
          )}
        >
          <BehaviorIcon name={inf.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className={cn("flex-1 min-w-0 truncate text-[16px] font-semibold", selected ? (good ? "text-success" : "text-primary") : "text-foreground")}>
          {inf.label}
        </span>
        {pts && <span className={cn("shrink-0 font-mono text-[12px] font-semibold tabular-nums", selected ? pts.className : "text-[#889AAA]")}>{pts.text}</span>}
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            selected ? (good ? "border-success bg-success text-[#0B1017]" : "border-primary bg-primary text-[#0B1017]") : "border-[#889AAA]/40",
          )}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>
    );
  };

  const DetailRow = ({ icon, label, value, tone = "default", onClick, trailing, children }: {
    icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "default" | "danger" | "muted";
    onClick?: () => void; trailing?: React.ReactNode; children?: React.ReactNode;
  }) => {
    const inner = (
      <div className="flex items-center gap-3 px-3.5 min-h-[58px] py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#122431] text-primary">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#889AAA]">{label}</p>
          <div className={cn("text-[15px] font-semibold leading-snug truncate", tone === "danger" ? "text-destructive" : tone === "muted" ? "text-[#A0B0BE] font-medium" : "text-foreground")}>{value}</div>
        </div>
        {trailing ?? (onClick && <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#889AAA]" />)}
      </div>
    );
    return (
      <div className="rounded-[14px] border border-[#889AAA]/[0.16] bg-[#0D1B26] overflow-hidden">
        {onClick ? <button type="button" onClick={onClick} className="w-full text-left press">{inner}</button> : inner}
        {children}
      </div>
    );
  };

  const LocationBlock = () => (
    <>
      {geocoding || geoStatus === "loading" ? (
        <DetailRow icon={<MapPin className="h-[18px] w-[18px]" />} label="Location" tone="muted"
          value={<span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Detecting your location…</span>} />
      ) : autoDetectedLocation && latitude !== null && longitude !== null ? (
        <DetailRow icon={<MapPin className="h-[18px] w-[18px]" />} label="Location" value={autoDetectedLocation}
          trailing={<span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">GPS</span>}>
          <div className="map-dark border-t border-[#889AAA]/[0.12]"><LocationMiniMap latitude={latitude} longitude={longitude} label={autoDetectedLocation} height={96} /></div>
        </DetailRow>
      ) : (
        <DetailRow icon={<MapPin className="h-[18px] w-[18px]" />} label="Location" tone="danger" value="Location required"
          trailing={
            <button type="button" onClick={detectLocation} className="press shrink-0 h-9 px-3 rounded-full border border-[#889AAA]/[0.25] text-[13px] font-semibold text-foreground">
              Retry
            </button>
          }>
          <p className="px-3.5 pb-3 -mt-1 text-[12px] leading-snug text-[#A0B0BE]">Enable location access — reports must be filed from where the incident happened.</p>
        </DetailRow>
      )}
    </>
  );

  /* ---------------- steps ---------------- */

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <StepHeading title="Report a Plate" sub="Enter the license plate or scan it with your camera." />
            <div className="grid grid-cols-[44px_1fr_96px] gap-2">
              <Input
                aria-label="Stacked prefix"
                value={stackedPrefix}
                onChange={e => setStackedPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2))}
                placeholder="FP"
                className="h-14 rounded-[14px] bg-input border-[#889AAA]/[0.18] font-mono text-[13px] font-bold text-center px-0 [writing-mode:vertical-rl] placeholder:text-[#889AAA]/60"
                maxLength={2}
              />
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#889AAA] pointer-events-none" />
                <Input
                  id="report-plate"
                  value={plateNumber}
                  onChange={e => setPlateNumber(formatPlate(e.target.value))}
                  placeholder="ABC 1234"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-14 rounded-[14px] bg-input border-[#889AAA]/[0.18] pl-10 pr-3 font-mono text-[22px] font-bold tracking-[0.14em] uppercase placeholder:text-[#889AAA]/60 placeholder:tracking-[0.08em] placeholder:font-semibold"
                  maxLength={10}
                />
              </div>
              <StateSelect />
            </div>
            <p className="mt-2 text-[12px] leading-snug text-[#A0B0BE]">
              {plateState
                ? "Stacked letters (like Illinois “FP”) go in the small box."
                : <span className="text-destructive font-semibold">Couldn't read the state — pick it so the report lands on the right vehicle.</span>}
            </p>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-[#889AAA]/[0.18]" />
              <span className="text-[12px] font-bold tracking-[0.16em] text-[#889AAA]">OR</span>
              <span className="h-px flex-1 bg-[#889AAA]/[0.18]" />
            </div>

            <PlateScanner variant="primary" onResult={onScanResult} />

            <div className="mt-7 flex items-start gap-3 px-1">
              <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-[#889AAA] mt-px" />
              <p className="text-[13px] leading-snug text-[#A0B0BE]">
                Your name isn't shown on reports. Reports unlink from your account after 30 days.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <StepHeading title="Confirm Plate" sub="Make sure we got it right." />
            <div className="flex justify-center py-4">
              <LicensePlate plateNumber={displayPlate} state={plateState || undefined} size="lg" />
            </div>
            <p className="mt-3 text-center font-mono text-[30px] font-bold tracking-[0.12em] text-foreground">{displayPlate}</p>
            {plateState ? (
              <p className="mt-1 text-center text-[15px] text-[#A0B0BE]">{stateName}</p>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-center text-[13px] font-semibold text-destructive">Couldn't read the state off the plate — confirm it before continuing.</p>
                <StateSelect className="w-full" />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <StepHeading title="What did they do?" sub="Pick the behavior that fits best. You can skip this." />
            <div className="grid grid-cols-2 gap-1 rounded-full bg-[#0D1B26] border border-[#889AAA]/[0.16] p-1 mb-4">
              {(["bad", "good"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setBehaviorTab(tab); setInfraction(null); }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-bold transition-colors",
                    behaviorTab === tab
                      ? tab === "bad" ? "bg-primary text-[#0B1017]" : "bg-success text-[#0B1017]"
                      : "text-[#A0B0BE]",
                  )}
                >
                  {tab === "bad" ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
                  {tab === "bad" ? "Bad Driving" : "Good Driving"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {(behaviorTab === "bad" ? visibleBad : GOOD_BEHAVIORS).map(inf => <BehaviorRow key={inf.type} inf={inf} />)}
            </div>
            {behaviorTab === "bad" && (
              <button
                type="button"
                onClick={() => setShowAllInfractions(!showAllInfractions)}
                className="mt-3 flex w-full h-11 items-center justify-center gap-1.5 text-[14px] font-semibold text-primary"
              >
                {showAllInfractions ? "Show fewer" : `Show all ${BAD_INFRACTIONS.length} behaviors`}
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAllInfractions && "rotate-180")} />
              </button>
            )}
            {behaviorTab === "good" && (
              <p className="mt-3 text-center text-[12px] text-[#A0B0BE]">Good driving lowers a plate's risk score.</p>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <StepHeading title="Add Details" sub="Optional — anything that makes the report stronger." />
            <div className="relative">
              <Textarea
                id="report-comment"
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 500))}
                onBlur={autoTagFromComment}
                placeholder="What happened? (e.g. cut me off on Hwy 41, aggressive driving.)"
                className="min-h-[112px] resize-none rounded-[14px] bg-input border-[#889AAA]/[0.18] px-4 py-3 text-[15px] leading-snug placeholder:text-[#889AAA]/70"
                maxLength={500}
              />
              <div className="mt-1.5 flex items-center justify-between px-1 text-[12px] text-[#889AAA]">
                {aiTagging ? (
                  <span className="inline-flex items-center gap-1 text-primary"><Sparkles className="h-3 w-3 animate-pulse" /> Reading your note…</span>
                ) : <span />}
                <span className="font-mono tabular-nums">{comment.length}/500</span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <LocationBlock />
              {plateState === "KS" && (
                <DetailRow icon={<MapPin className="h-[18px] w-[18px]" />} label="Kansas county" tone="muted"
                  value={
                    <input
                      value={ksCounty}
                      onChange={e => setKsCounty(e.target.value.slice(0, 40))}
                      placeholder="County the plate was issued in"
                      className="w-full bg-transparent outline-none text-[15px] font-semibold text-foreground placeholder:text-[#889AAA]/70 placeholder:font-medium"
                    />
                  } />
              )}
              <DetailRow icon={<Calendar className="h-[18px] w-[18px]" />} label="Date & Time" value={formatWhen(dateTime)}
                trailing={
                  <label className="relative shrink-0 h-9 px-3 inline-flex items-center rounded-full border border-[#889AAA]/[0.25] text-[13px] font-semibold text-foreground press">
                    Change
                    <input
                      type="datetime-local"
                      aria-label="Date and time"
                      value={dateTime}
                      onChange={e => setDateTime(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                } />
              <DetailRow icon={<Car className="h-[18px] w-[18px]" />} label="Vehicle" onClick={() => setVehicleOpen(v => !v)}
                value={vehicleSummary || <span className="text-[#A0B0BE] font-medium">Optional</span>}
                trailing={<ChevronDown className={cn("h-[18px] w-[18px] shrink-0 text-[#889AAA] transition-transform", vehicleOpen && "rotate-180")} />}>
                {vehicleOpen && (
                  <div className="border-t border-[#889AAA]/[0.12] px-3.5 py-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={vehicleType} onValueChange={setVehicleType}>
                        <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="h-11 rounded-xl bg-input border-[#889AAA]/[0.18] text-[14px]"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={vehicleColor} onValueChange={setVehicleColor}>
                        <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="h-11 rounded-xl bg-input border-[#889AAA]/[0.18] text-[14px]"><SelectValue placeholder="Color" /></SelectTrigger>
                        <SelectContent>{VEHICLE_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="Make (e.g. Toyota)" maxLength={30}
                        className="h-11 rounded-xl bg-input border-[#889AAA]/[0.18] text-[14px]" />
                      <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Model (e.g. Camry)" maxLength={30}
                        className="h-11 rounded-xl bg-input border-[#889AAA]/[0.18] text-[14px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {VEHICLE_FEATURE_OPTIONS.map(feat => (
                        <label key={feat} className="flex items-center gap-2 text-[13px] font-medium cursor-pointer rounded-xl border border-[#889AAA]/[0.16] bg-input px-3 h-11">
                          <Checkbox checked={vehicleFeatures.includes(feat)} onCheckedChange={() => toggleFeature(feat)} />
                          <span className="truncate">{feat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </DetailRow>
              <DetailRow icon={<User className="h-[18px] w-[18px]" />} label="Driver"
                value={
                  <Select value={driverDescription} onValueChange={setDriverDescription}>
                    <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="h-8 -ml-3 border-0 bg-transparent px-3 text-[15px] font-semibold shadow-none focus:ring-0 [&>span]:truncate">
                      <SelectValue placeholder={<span className="text-[#A0B0BE] font-medium">Optional</span>} />
                    </SelectTrigger>
                    <SelectContent>{DRIVER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                }
                trailing={<span />} />
            </div>
          </div>
        );

      case 5: {
        const pts = formatPoints(selectedInfraction);
        const rows: { icon: React.ReactNode; label: string; value: React.ReactNode; step: number }[] = [
          {
            icon: <BehaviorIcon name={selectedInfraction?.icon ?? "AlertTriangle"} className="h-[18px] w-[18px]" />,
            label: "Behavior",
            value: selectedInfraction
              ? <span className="inline-flex items-center gap-2">{selectedInfraction.label}{pts && <span className={cn("font-mono text-[12px] font-semibold", pts.className)}>{pts.text}</span>}</span>
              : <span className="text-[#A0B0BE] font-medium">No behavior selected</span>,
            step: 3,
          },
          { icon: <MapPin className="h-[18px] w-[18px]" />, label: "Location", value: plateState === "KS" && ksCounty ? `${location} — ${ksCounty} County` : location || incidentState, step: 4 },
          { icon: <Calendar className="h-[18px] w-[18px]" />, label: "Date & Time", value: formatWhen(dateTime), step: 4 },
        ];
        if (vehicleSummary) rows.push({ icon: <Car className="h-[18px] w-[18px]" />, label: "Vehicle", value: vehicleSummary, step: 4 });
        if (vehicleFeatures.length) rows.push({ icon: <Icons.Wrench className="h-[18px] w-[18px]" />, label: "Features", value: vehicleFeatures.join(", "), step: 4 });
        if (driverDescription) rows.push({ icon: <User className="h-[18px] w-[18px]" />, label: "Driver", value: DRIVER_OPTIONS.find(o => o.value === driverDescription)?.label, step: 4 });
        if (comment.trim()) rows.push({ icon: <FileText className="h-[18px] w-[18px]" />, label: "Details", value: <span className="whitespace-normal line-clamp-3">{comment}</span>, step: 4 });
        return (
          <div>
            <StepHeading title="Review Your Report" sub="Make sure everything looks good." />
            <button type="button" onClick={() => go(2)} className="press mx-auto block">
              <LicensePlate plateNumber={displayPlate} state={plateState || undefined} size="md" />
            </button>
            <p className="mt-2 mb-4 text-center text-[13px] text-[#A0B0BE]">{stateName} · tap plate to edit</p>
            <div className="rounded-[14px] border border-[#889AAA]/[0.16] bg-[#0D1B26] divide-y divide-[#889AAA]/[0.12]">
              {rows.map(r => (
                <button key={r.label} type="button" onClick={() => go(r.step)} className="flex w-full items-center gap-3 px-3.5 min-h-[58px] py-2.5 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#122431] text-primary">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#889AAA]">{r.label}</p>
                    <div className="text-[15px] font-semibold leading-snug text-foreground truncate">{r.value}</div>
                  </div>
                  <Pencil className="h-4 w-4 shrink-0 text-[#889AAA]" />
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 6:
        return (
          <div className="flex flex-col items-center text-center pt-8">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-success bg-success/10 text-success"
            >
              <CheckCircle2 className="h-10 w-10" strokeWidth={2.25} />
            </motion.div>
            <h2 className="mt-6 text-[26px] font-bold tracking-[-0.01em]">Report Submitted</h2>
            <p className="mt-2 text-[15px] text-[#A0B0BE] max-w-[280px]">
              <span className="font-mono font-semibold text-foreground">{submitted?.plate}</span>
              {submitted?.label ? ` · ${submitted.label}` : ""}
            </p>
            <p className="mt-4 text-[13px] text-[#889AAA] inline-flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-primary" /> 1 coin spent · Thanks for keeping drivers accountable.</p>
          </div>
        );
    }
  };

  const renderFooter = () => {
    switch (step) {
      case 1:
        return <button type="button" className={primaryBtn} disabled={!canContinue()} onClick={() => go(2)}>Continue <ChevronRight className="h-5 w-5" /></button>;
      case 2:
        return (
          <div className="space-y-2">
            <button type="button" className={primaryBtn} disabled={!canContinue()} onClick={() => go(3)}>Looks Correct <ChevronRight className="h-5 w-5" /></button>
            <button type="button" className={secondaryBtn} onClick={() => go(1)}><Pencil className="h-4 w-4 text-[#A0B0BE]" /> Edit Plate</button>
          </div>
        );
      case 3:
        return <button type="button" className={primaryBtn} onClick={() => go(4)}>{infraction ? "Continue" : "Skip for now"} <ChevronRight className="h-5 w-5" /></button>;
      case 4:
        return (
          <div>
            <button type="button" className={primaryBtn} disabled={!canContinue()} onClick={() => go(5)}>Continue <ChevronRight className="h-5 w-5" /></button>
            {!hasVerifiedLocation && <p className="mt-2 text-center text-[12px] text-[#A0B0BE]">Location is required to continue.</p>}
          </div>
        );
      case 5:
        return (
          <div>
            <button type="button" className={primaryBtn} disabled={submitting} onClick={handleSubmit}>
              {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</> : <><Icons.Send className="h-5 w-5" /> Submit Report</>}
            </button>
            <p className="mt-2 text-center text-[12px] text-[#A0B0BE] inline-flex w-full items-center justify-center gap-1.5">
              <Coins className="h-3 w-3 text-primary" /> Costs 1 coin · Your name isn't shown on the report.
            </p>
          </div>
        );
      case 6:
        return (
          <div className="space-y-2">
            <button type="button" className={primaryBtn} onClick={viewPlate}><Search className="h-5 w-5" /> View This Plate</button>
            <button type="button" className={secondaryBtn} onClick={reportAnother}><Icons.Camera className="h-4 w-4 text-[#A0B0BE]" /> Report Another Plate</button>
            <button type="button" className={tertiaryBtn} onClick={closeFromSuccess}>Done</button>
          </div>
        );
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={cn(
          "inset-0 left-0 top-0 translate-x-0 translate-y-0 w-full max-w-none h-[100dvh] rounded-none border-0 p-0 gap-0 bg-[#07131C] flex flex-col overflow-hidden",
          "data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=closed]:slide-out-to-left-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[420px] sm:h-[min(860px,92vh)] sm:rounded-[28px] sm:border sm:border-[#889AAA]/[0.14]",
          "[&>button.absolute]:hidden",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Top bar */}
        <div className="pt-safe shrink-0">
          <div className="relative flex h-14 items-center justify-center px-4">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              aria-label="Close"
              className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full text-[#A0B0BE] hover:bg-[#122431] hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center leading-none">
              <DialogTitle className="text-[15px] font-extrabold tracking-[0.06em] text-foreground">
                PLATE <span className="text-primary">N'</span> STATE
              </DialogTitle>
              <DialogDescription className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[#889AAA]">
                Drivers accountable. Roads safer.
              </DialogDescription>
            </div>
            {step < 6 && (
              <span className="absolute right-4 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 h-6 text-[11px] font-bold text-primary">
                <Coins className="h-3 w-3" /> 1 coin
              </span>
            )}
          </div>
          {step < 6 && (
            <div className="px-6 pb-2" role="progressbar" aria-valuemin={1} aria-valuemax={PROGRESS_STEPS} aria-valuenow={step} aria-label={`Step ${step} of ${PROGRESS_STEPS}: ${STEP_NAMES[step - 1]}`}>
              <div className="flex items-center">
                {Array.from({ length: PROGRESS_STEPS }, (_, i) => i + 1).map(s => (
                  <div key={s} className="contents">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-200",
                        s < step ? "bg-primary" : s === step ? "bg-primary ring-4 ring-primary/25" : "bg-[#889AAA]/40",
                      )}
                    />
                    {s < PROGRESS_STEPS && (
                      <span className={cn("h-[2px] flex-1 transition-colors duration-200", s < step ? "bg-primary" : "bg-[#889AAA]/25")} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable step body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: 18 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 * direction }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <div className="shrink-0 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] bg-[#07131C] border-t border-[#889AAA]/[0.10]">
          {renderFooter()}
        </div>
      </DialogContent>
    </Dialog>
    <ClaimUpsellDialog open={showClaimUpsell} onOpenChange={setShowClaimUpsell} />
    </>
  );
};

export default ReportModal;
