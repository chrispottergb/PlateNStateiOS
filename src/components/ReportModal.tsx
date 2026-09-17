import { useState, useCallback } from "react";
import { getPosition } from "@/lib/native";
import { Loader2, MapPin, Pencil, Car, Wrench, User, Zap, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import PlateScanner from "@/components/PlateScanner";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BAD_INFRACTIONS, GOOD_BEHAVIORS, INFRACTIONS } from "@/lib/data";
import { US_STATES, getStateByCode, stateNameToCode } from "@/lib/usStates";
import { InfractionType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CarFront, Gauge, CircleAlert, ParkingSquare, ArrowLeftRight, Smartphone, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCaptcha } from "@/hooks/useCaptcha";
import { useCredits } from "@/hooks/useCredits";
import { getClientIp } from "@/lib/clientIp";
import { useHomeState } from "@/hooks/useHomeState";
import { usePlateClaim } from "@/hooks/useClaimStatus";
import ClaimUpsellDialog, { claimUpsellDismissed } from "@/components/ClaimUpsellDialog";

const ICON_MAP_SM: Record<string, React.ReactNode> = {
  CarFront: <CarFront className="h-4 w-4" />,
  Gauge: <Gauge className="h-4 w-4" />,
  CircleAlert: <CircleAlert className="h-4 w-4" />,
  ParkingSquare: <ParkingSquare className="h-4 w-4" />,
  ArrowLeftRight: <ArrowLeftRight className="h-4 w-4" />,
  Smartphone: <Smartphone className="h-4 w-4" />,
};

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

const TOTAL_STEPS = 6;

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
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [showClaimUpsell, setShowClaimUpsell] = useState(false);
  const [step, setStep] = useState(1);
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
  const [manualOverride, setManualOverride] = useState(false);
  // Plate's home state (where the plate is registered) — defaults to user's home_state
  const [plateState, setPlateState] = useState<string>(initialState !== undefined ? initialState : (homeState || "WI"));
  // Small stacked characters to the LEFT of the main plate (e.g. Illinois "FP").
  const [stackedPrefix, setStackedPrefix] = useState<string>(initialStacked);
  // Incident state (where the report happened) — set by GPS reverse-geocode
  const [incidentState, setIncidentState] = useState<string>(homeState || "WI");
  const [detectedStateCode, setDetectedStateCode] = useState<string | null>(null);
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [showAllInfractions, setShowAllInfractions] = useState(false);
  const [aiTagging, setAiTagging] = useState(false);

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
    setStep(1);
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
    setDetectedStateCode(null);
    setManualOverride(false);
    setPlateState(homeState || "WI");
    setStackedPrefix("");
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
    if (!v) { reset(); setMode("quick"); }
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
      if (code) {
        setIncidentState(code);
        setDetectedStateCode(code);
      }
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
      toast({ title: "Confirm the plate's state", description: "The scanner couldn't read it — pick the state so the report lands on the right vehicle.", variant: "destructive" });
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
      // Infraction is now OPTIONAL — use sentinel when missing
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
      toast.success("Report submitted! 🪙 1 coin spent", {
        description: inf
          ? `${plateNumber} reported for ${inf.label}`
          : `${plateNumber} report filed`,
      });
      refetchCredits(); // keep header coin count in sync
      reset();
      setOpen(false);
      // High-intent moment: nudge the reporter to claim their own plate (unless
      // dismissed, or the plate just reported is already claimed).
      if (!claimUpsellDismissed() && reportedPlateClaim === "unclaimed") {
        setTimeout(() => setShowClaimUpsell(true), 600);
      }
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Allow up to 10 chars
  const formatPlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 10);

  const hasVerifiedLocation = latitude !== null && longitude !== null && !!autoDetectedLocation && !!incidentState;
  const canSubmitQuick = plateNumber.trim().length >= 4 && hasVerifiedLocation && !!plateState;

  const canProceed = () => {
    if (step === 1) return plateNumber.trim().length >= 4;
    if (step === 2) return true;
    if (step === 3) return true; // infraction optional
    if (step === 4) return hasVerifiedLocation;
    if (step === 5) return true;
    return true;
  };

  const stepLabels = ["Plate", "Vehicle", "Behavior", "Location", "Driver", "Review"];

  const visibleBad = showAllInfractions ? BAD_INFRACTIONS : BAD_INFRACTIONS.filter(i => QUICK_BAD.includes(i.type));

  const renderBehaviorTabs = (variant: "quick" | "detailed") => (
    <Tabs value={behaviorTab} onValueChange={(v) => { setBehaviorTab(v as "bad" | "good"); setInfraction(null); }}>
      <TabsList className="w-full grid grid-cols-2 mb-2">
        <TabsTrigger value="bad" className="gap-1.5 text-xs"><ThumbsDown className="h-3.5 w-3.5" /> Bad Behavior</TabsTrigger>
        <TabsTrigger value="good" className="gap-1.5 text-xs"><ThumbsUp className="h-3.5 w-3.5" /> Good Behavior</TabsTrigger>
      </TabsList>
      <TabsContent value="bad" className="mt-0">
        <div className="grid grid-cols-3 gap-2">
          {visibleBad.map(inf => (
            <button
              key={inf.type}
              type="button"
              onClick={() => setInfraction(inf.type)}
              aria-pressed={infraction === inf.type}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 min-h-[76px] text-[11px] font-semibold leading-tight text-center transition-colors duration-150 press [&_svg]:h-5 [&_svg]:w-5 ${
                infraction === inf.type
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-input hover:border-muted-foreground/40 text-muted-foreground"
              }`}
            >
              <span className={infraction === inf.type ? "text-primary" : "text-foreground/80"}>
                {ICON_MAP_SM[inf.icon] ?? <AlertTriangle className="h-4 w-4" />}
              </span>
              <span className="line-clamp-2">{inf.label}</span>
            </button>
          ))}
        </div>
        {variant === "quick" && (
          <button
            type="button"
            onClick={() => setShowAllInfractions(!showAllInfractions)}
            className="text-xs font-semibold text-primary hover:underline mt-2.5"
          >
            {showAllInfractions ? "Show less" : `More infractions (${BAD_INFRACTIONS.length - QUICK_BAD.length}+)…`}
          </button>
        )}
      </TabsContent>
      <TabsContent value="good" className="mt-0">
        <div className="grid grid-cols-3 gap-2">
          {GOOD_BEHAVIORS.map(inf => (
            <button
              key={inf.type}
              type="button"
              onClick={() => setInfraction(inf.type)}
              aria-pressed={infraction === inf.type}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 min-h-[76px] text-[11px] font-semibold leading-tight text-center transition-colors duration-150 press ${
                infraction === inf.type
                  ? "border-success bg-success/10 text-foreground"
                  : "border-border bg-input hover:border-muted-foreground/40 text-muted-foreground"
              }`}
            >
              <ThumbsUp className={`h-5 w-5 ${infraction === inf.type ? "text-success" : "text-foreground/80"}`} />
              <span className="line-clamp-2">{inf.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Good behavior reports lower a plate's score. Show 'em some love.
        </p>
      </TabsContent>
    </Tabs>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[88vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            {mode === "quick" ? (
              <Zap className="h-5 w-5 text-primary" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-primary" />
            )}
            {mode === "quick" ? "Quick Report" : "Report a Driver"}
            <span className="ml-auto flex items-center gap-1 rounded-md border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              <Coins className="h-3 w-3" /> 1 coin
            </span>
          </DialogTitle>
          <DialogDescription className="text-left">Help keep our roads safe. Your report makes a difference.</DialogDescription>
        </DialogHeader>

        <button
          onClick={() => { setMode(mode === "quick" ? "detailed" : "quick"); setStep(1); }}
          className="text-xs font-semibold text-primary hover:underline text-left -mt-1"
        >
          {mode === "quick"
            ? "Have more details? Switch to Detailed Report →"
            : "Just need the basics? Quick Report"}
        </button>

        {/* ===== QUICK MODE ===== */}
        {mode === "quick" && (
          <div className="space-y-5">
            {/* Plate input + state */}
            <section className="rounded-xl border border-primary/25 bg-card p-3 space-y-2">
              <Label htmlFor="quick-plate" className="text-sm font-semibold">License Plate & State</Label>
              <PlateScanner onResult={(plate, scannedState, gps, stacked) => {
                    setPlateNumber(plate.slice(0, 10));
                    setStackedPrefix(stacked || "");
                    if (scannedState && US_STATES.some(s => s.code === scannedState)) {
                      setPlateState(scannedState);
                    } else {
                      // OCR couldn't read the state — force the user to pick it.
                      // Silently defaulting to home/GPS state can pin a report on
                      // the SAME plate number registered in a DIFFERENT state.
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
                  }} />
              <div className="mt-1.5 grid grid-cols-[36px_1fr_90px] gap-2">
                {/* Stacked-prefix box (e.g. Illinois "FP") — chars sit stacked on a real plate */}
                <Input
                  aria-label="Stacked prefix"
                  value={stackedPrefix}
                  onChange={e => setStackedPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2))}
                  placeholder="FP"
                  className="font-mono text-sm font-bold text-center rounded-lg h-12 px-0 [writing-mode:vertical-rl]"
                  maxLength={2}
                />
                <Input
                  id="quick-plate"
                  value={plateNumber}
                  onChange={e => setPlateNumber(formatPlate(e.target.value))}
                  placeholder="ABC 1234"
                  className="font-mono text-xl tracking-widest text-center rounded-lg h-12"
                  maxLength={10}
                />
                <Select value={plateState} onValueChange={setPlateState}>
                  <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className={`rounded-lg h-12 ${!plateState ? "border-destructive ring-2 ring-destructive/30" : ""}`}>
                    <SelectValue placeholder="State?" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {US_STATES.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!plateState ? (
                <p className="text-xs text-destructive font-semibold mt-1">
                  Couldn't read the state off the plate — confirm it before submitting. Same plate number, different state = different (innocent) driver.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Or scan/upload a photo above · Plate state — your GPS location stays as the incident location.
                </p>
              )}
            </section>

            {/* Behavior tabs */}
            <section>
              <Label className="text-[15px] font-bold">What did they do? <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="mt-2">
                {renderBehaviorTabs("quick")}
              </div>
            </section>

            {/* Optional note */}
            <section>
              <Label htmlFor="quick-comment" className="text-[15px] font-bold flex items-center gap-2">
                Add Details <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                {aiTagging && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-primary">
                    <Sparkles className="h-3 w-3 animate-pulse" /> AI is reading your note…
                  </span>
                )}
              </Label>
              <Textarea
                id="quick-comment"
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 500))}
                onBlur={autoTagFromComment}
                placeholder="Tell us what happened…"
                className="mt-2 min-h-[80px] resize-none"
                maxLength={500}
              />
            </section>

            {/* Location — locked to GPS to prevent fraudulent reports */}
            <section>
              <Label className="text-[15px] font-bold">Incident Location</Label>
              {geocoding || geoStatus === "loading" ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting your location…
                </div>
              ) : autoDetectedLocation && latitude !== null && longitude !== null ? (
                <>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-input px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"><MapPin className="h-4 w-4" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">Location</p>
                      <p className="text-sm font-medium truncate">{autoDetectedLocation}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-primary font-bold">Locked</span>
                  </div>
                  <div className="map-dark"><LocationMiniMap latitude={latitude} longitude={longitude} label={autoDetectedLocation} height={110} /></div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Locked to your GPS to prevent fraudulent reports.
                  </p>
                </>
              ) : (
                <div className="mt-2 rounded-xl border border-destructive/40 bg-destructive/[0.08] px-3 py-3">
                  <p className="text-sm font-semibold text-destructive">Location required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable location access — reports must be filed from where the incident happened.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={detectLocation}
                    className="mt-2 h-8 text-xs"
                  >
                    <MapPin className="h-3 w-3 mr-1" /> Retry location
                  </Button>
                </div>
              )}
              {plateState === "KS" && (
                <div className="mt-2">
                  <Input
                    value={ksCounty}
                    onChange={e => setKsCounty(e.target.value.slice(0, 40))}
                    placeholder="County the plate was issued in (optional)"
                    className="text-sm h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Kansas vanity plates are issued per county — include the county the plate was issued in.
                  </p>
                </div>
              )}
            </section>

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!canSubmitQuick || submitting}
              className="w-full h-14 text-[17px] rounded-[14px] sticky bottom-0"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Submit Quick Report <Coins className="h-3.5 w-3.5 ml-1" /> 1</>
              )}
            </Button>
          </div>
        )}

        {/* ===== DETAILED MODE ===== */}
        {mode === "detailed" && (
          <>
            {/* Progress */}
            <div className="space-y-1.5 mb-4">
              <div className="flex gap-1">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                      s <= step ? "bg-primary" : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground text-center">
                Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}
              </p>
            </div>

            {/* Step 1: Plate + State */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="plate" className="text-sm font-medium">License Plate & State</Label>
                  <PlateScanner onResult={(plate, scannedState, gps, stacked) => {
                    setPlateNumber(plate.slice(0, 10));
                    setStackedPrefix(stacked || "");
                    if (scannedState && US_STATES.some(s => s.code === scannedState)) {
                      setPlateState(scannedState);
                    } else {
                      setPlateState(""); // force manual state confirmation (see quick mode)
                    }
                    if (gps && latitude === null) {
                      setLatitude(gps.latitude);
                      setLongitude(gps.longitude);
                      setGeoStatus("done");
                      reverseGeocode(gps.latitude, gps.longitude);
                    } else if (latitude === null) {
                      detectLocation();
                    }
                  }} />
                  <div className="mt-1.5 grid grid-cols-[32px_1fr_90px] gap-2">
                    {/* Stacked-prefix box (e.g. Illinois "FP") */}
                    <Input
                      aria-label="Stacked prefix"
                      value={stackedPrefix}
                      onChange={e => setStackedPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2))}
                      placeholder="FP"
                      className="font-mono text-sm font-bold text-center rounded-lg px-0 [writing-mode:vertical-rl]"
                      maxLength={2}
                    />
                    <Input
                      id="plate"
                      value={plateNumber}
                      onChange={e => setPlateNumber(formatPlate(e.target.value))}
                      placeholder="ABC 1234"
                      className="font-mono text-lg tracking-wider text-center rounded-lg"
                      maxLength={10}
                    />
                    <Select value={plateState} onValueChange={setPlateState}>
                      <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className={`rounded-lg ${!plateState ? "border-destructive ring-2 ring-destructive/40" : ""}`}>
                        <SelectValue placeholder="State?" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {US_STATES.map(s => (
                          <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Scan a plate or type it manually (up to 10 chars)</p>
                </div>
              </div>
            )}

            {/* Step 2: Vehicle */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Car className="h-4 w-4 text-primary" />
                  Vehicle Description
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Vehicle Type</Label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="mt-1 rounded-lg text-xs h-9">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <Select value={vehicleColor} onValueChange={setVehicleColor}>
                      <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="mt-1 rounded-lg text-xs h-9">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_COLORS.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Make</Label>
                    <Input
                      value={vehicleMake}
                      onChange={e => setVehicleMake(e.target.value)}
                      placeholder="e.g. Toyota"
                      className="mt-1 rounded-lg text-xs h-9"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    <Input
                      value={vehicleModel}
                      onChange={e => setVehicleModel(e.target.value)}
                      placeholder="e.g. Camry"
                      className="mt-1 rounded-lg text-xs h-9"
                      maxLength={30}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1.5">
                    <Wrench className="h-3 w-3" /> Noticeable Features
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {VEHICLE_FEATURE_OPTIONS.map(feat => (
                      <label
                        key={feat}
                        className="flex items-center gap-2 text-xs cursor-pointer rounded-xl border border-border bg-input px-3 py-2.5 hover:border-muted-foreground/40 transition-colors duration-150"
                      >
                        <Checkbox
                          checked={vehicleFeatures.includes(feat)}
                          onCheckedChange={() => toggleFeature(feat)}
                        />
                        <span>{feat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Behavior */}
            {step === 3 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">What did they do? <span className="text-xs text-muted-foreground font-normal">(optional — skip to file an anonymous sighting)</span></Label>
                {renderBehaviorTabs("detailed")}
              </div>
            )}

            {/* Step 4: Location */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Incident Location</Label>
                  {geocoding || geoStatus === "loading" ? (
                    <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting your location…
                    </div>
                  ) : autoDetectedLocation && latitude !== null && longitude !== null ? (
                    <>
                      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.08] px-3 py-2.5">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium flex-1">{autoDetectedLocation}</span>
                        <span className="text-[10px] uppercase tracking-wide text-primary font-bold">Locked</span>
                      </div>
                      <LocationMiniMap latitude={latitude} longitude={longitude} label={autoDetectedLocation} height={160} />
                      <p className="text-xs text-muted-foreground mt-1">
                        Locked to your GPS to prevent fraudulent reports.
                      </p>
                    </>
                  ) : (
                    <div className="mt-1.5 rounded-xl border border-destructive/40 bg-destructive/[0.08] px-3 py-2.5">
                      <p className="text-sm font-semibold text-destructive">Location required</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enable location access — reports must be filed from where the incident happened.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={detectLocation}
                        className="mt-2 h-8 text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" /> Retry location
                      </Button>
                    </div>
                  )}
                  {plateState === "KS" && (
                    <div className="mt-2">
                      <Input
                        value={ksCounty}
                        onChange={e => setKsCounty(e.target.value.slice(0, 40))}
                        placeholder="County the plate was issued in (optional)"
                        className="text-sm h-10"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Kansas vanity plates are issued per county — include the county the plate was issued in.
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-xl glass p-3 flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> GPS Location</p>
                    {geoStatus === "loading" && <p className="text-xs text-muted-foreground">Detecting…</p>}
                    {geoStatus === "done" && (
                      <p className="text-xs text-primary">
                        Located ({latitude?.toFixed(4)}, {longitude?.toFixed(4)})
                      </p>
                    )}
                    {geoStatus === "denied" && <p className="text-xs text-destructive">Permission denied</p>}
                    {geoStatus === "idle" && <p className="text-xs text-muted-foreground">Not detected</p>}
                  </div>
                  {(geoStatus === "denied" || geoStatus === "idle") && (
                    <Button variant="outline" size="sm" onClick={detectLocation} type="button">
                      Detect
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                    className="mt-1.5 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Driver Description */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" />
                  Driver Description & Comments
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </div>
                <div>
                  <Label className="text-xs">Driver</Label>
                  <Select value={driverDescription} onValueChange={setDriverDescription}>
                    <SelectTrigger onPointerDown={(e) => e.stopPropagation()} className="mt-1 rounded-lg h-10 text-sm">
                      <SelectValue placeholder="Choose driver description" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRIVER_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-2">
                    Additional Comments
                    {aiTagging && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-primary">
                        <Sparkles className="h-3 w-3 animate-pulse" /> AI is reading your note…
                      </span>
                    )}
                  </Label>
                  <Textarea
                    value={comment}
                    onChange={e => setComment(e.target.value.slice(0, 280))}
                    onBlur={autoTagFromComment}
                    placeholder="Any additional details about the incident..."
                    className="mt-1.5 rounded-lg text-sm min-h-[80px]"
                    maxLength={280}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">{comment.length}/280</p>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {step === 6 && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
                <h4 className="font-semibold text-sm">Review Your Report</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plate</span>
                    <span className="font-mono font-bold">{plateNumber} <span className="text-xs text-muted-foreground">({plateState})</span></span>
                  </div>
                  {(vehicleType || vehicleColor || vehicleMake || vehicleModel) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle</span>
                      <span className="text-right text-xs">
                        {[vehicleColor, vehicleType, vehicleMake, vehicleModel].filter(Boolean).join(" ")}
                      </span>
                    </div>
                  )}
                  {vehicleFeatures.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Features</span>
                      <span className="text-right text-xs">{vehicleFeatures.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Behavior</span>
                    <span className="font-medium">
                      {infraction
                        ? INFRACTIONS.find(i => i.type === infraction)?.label
                        : <span className="italic text-muted-foreground">Anonymous sighting</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span>{plateState === "KS" && ksCounty ? `${location} — ${ksCounty} County` : location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">When</span>
                    <span>{new Date(dateTime).toLocaleString()}</span>
                  </div>
                  {driverDescription && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver</span>
                      <span>{DRIVER_OPTIONS.find(o => o.value === driverDescription)?.label}</span>
                    </div>
                  )}
                  {comment && (
                    <div className="pt-1 border-t border-border/30">
                      <span className="text-muted-foreground text-xs">Comment:</span>
                      <p className="text-xs mt-0.5">{comment}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : <div />}
              {step < TOTAL_STEPS ? (
                <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="h-10 px-4">
                  {step === 2 || step === 3 || step === 5 ? "Skip / " : ""}Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="h-10 px-4">
                  <Check className="h-4 w-4 mr-1" /> {submitting ? "Submitting…" : "Submit Report"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    <ClaimUpsellDialog open={showClaimUpsell} onOpenChange={setShowClaimUpsell} />
    </>
  );
};

export default ReportModal;
