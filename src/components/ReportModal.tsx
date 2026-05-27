import { useState, useCallback } from "react";
import { getPosition } from "@/lib/native";
import { Loader2, MapPin, Pencil, Car, Wrench, User, Zap, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import PlateScanner from "@/components/PlateScanner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TOTAL_STEPS = 6;

const ReportModal = ({ trigger, initialPlate = "", initialComment = "", open: controlledOpen, onOpenChange: controlledOnOpenChange }: ReportModalProps) => {
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
  const [step, setStep] = useState(1);
  const [plateNumber, setPlateNumber] = useState(initialPlate);
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
  const [plateState, setPlateState] = useState<string>(homeState || "WI");
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
      const { error } = await supabase.rpc("spend_credit_on_report", {
        p_plate_number: plateNumber,
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
      } as any);
      if (error) {
        if (error.message.includes("Insufficient credits")) {
          toast.error("Not enough coins!", { description: "You've used all your monthly coins. Credits refresh on the 1st." });
        } else if (error.message.includes("DUPLICATE_REPORT")) {
          toast.error("Already reported", { description: "You've already reported this plate in the last 24 hours. Try again tomorrow." });
        } else if (error.message.includes("RATE_LIMITED")) {
          toast.error("Too many requests, slow down", { description: "Please wait a moment before submitting again." });
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
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Allow up to 10 chars
  const formatPlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 10);

  const canSubmitQuick = plateNumber.trim().length >= 4;

  const canProceed = () => {
    if (step === 1) return plateNumber.trim().length >= 4;
    if (step === 2) return true;
    if (step === 3) return true; // infraction optional
    if (step === 4) return location.trim().length > 0;
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
        <div className="grid grid-cols-2 gap-1.5">
          {visibleBad.map(inf => (
            <button
              key={inf.type}
              type="button"
              onClick={() => setInfraction(inf.type)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-all ${
                infraction === inf.type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              {ICON_MAP_SM[inf.icon] ?? <AlertTriangle className="h-4 w-4" />}
              <span className="font-medium truncate">{inf.label}</span>
            </button>
          ))}
        </div>
        {variant === "quick" && (
          <button
            type="button"
            onClick={() => setShowAllInfractions(!showAllInfractions)}
            className="text-xs text-primary hover:underline mt-2"
          >
            {showAllInfractions ? "Show less" : `More infractions (${BAD_INFRACTIONS.length - QUICK_BAD.length}+)…`}
          </button>
        )}
      </TabsContent>
      <TabsContent value="good" className="mt-0">
        <div className="grid grid-cols-2 gap-1.5">
          {GOOD_BEHAVIORS.map(inf => (
            <button
              key={inf.type}
              type="button"
              onClick={() => setInfraction(inf.type)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-all ${
                infraction === inf.type
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                  : "border-border/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span className="font-medium truncate">{inf.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 italic">
          Good behavior reports lower a plate's score. Show 'em some love.
        </p>
      </TabsContent>
    </Tabs>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md glass-strong rounded-xl border-border/50 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "quick" ? (
              <Zap className="h-5 w-5 text-primary" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {mode === "quick" ? "Quick Report" : "Report a Driver"}
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> 1 coin
            </span>
          </DialogTitle>
        </DialogHeader>

        <button
          onClick={() => { setMode(mode === "quick" ? "detailed" : "quick"); setStep(1); }}
          className="text-xs text-primary hover:underline text-left -mt-2 mb-1"
        >
          {mode === "quick"
            ? "Have more details? Switch to Detailed Report →"
            : "⚡ Just need the basics? Quick Report"}
        </button>

        {/* ===== QUICK MODE ===== */}
        {mode === "quick" && (
          <div className="space-y-4">
            {/* Plate input + state */}
            <div>
              <Label htmlFor="quick-plate" className="text-sm font-medium">License Plate & State</Label>
              <PlateScanner onResult={(plate) => setPlateNumber(plate.slice(0, 10))} />
              <div className="mt-1.5 grid grid-cols-[1fr_90px] gap-2">
                <Input
                  id="quick-plate"
                  value={plateNumber}
                  onChange={e => setPlateNumber(formatPlate(e.target.value))}
                  placeholder="ABC 1234"
                  className="font-mono text-xl tracking-widest text-center rounded-lg h-12"
                  maxLength={10}
                />
                <Select value={plateState} onValueChange={setPlateState}>
                  <SelectTrigger className="rounded-lg h-12"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {US_STATES.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Or scan/upload a photo above · <span className="italic">Plate state — your GPS location stays as the incident location.</span>
              </p>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium">Location</Label>
              {autoDetectedLocation && !manualOverride ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium flex-1">{autoDetectedLocation}</span>
                  <button
                    onClick={() => setManualOverride(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              ) : geocoding ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting…
                </div>
              ) : (
                <div className="mt-1.5 grid grid-cols-[90px_1fr] gap-2">
                  <Select value={incidentState} onValueChange={(v) => {
                    setIncidentState(v);
                    if (autoDetectedLocation && v === detectedStateCode) {
                      setLocation(autoDetectedLocation);
                    } else {
                      setLocation("");
                    }
                  }}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {US_STATES.map(s => (
                        <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select city (optional)" /></SelectTrigger>
                    <SelectContent>
                      {autoDetectedLocation && incidentState === detectedStateCode && !getStateByCode(incidentState).cities.some(c => `${c}, ${incidentState}` === autoDetectedLocation) && (
                        <SelectItem value={autoDetectedLocation}>📍 {autoDetectedLocation}</SelectItem>
                      )}
                      {getStateByCode(incidentState).cities.map(city => (
                        <SelectItem key={city} value={`${city}, ${incidentState}`}>
                          {autoDetectedLocation === `${city}, ${incidentState}` ? "📍 " : ""}{city}, {incidentState}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {plateState === "KS" && (
                <div className="mt-2">
                  <Input
                    value={ksCounty}
                    onChange={e => setKsCounty(e.target.value.slice(0, 40))}
                    placeholder="County the plate was issued in (optional)"
                    className="rounded-lg text-sm h-9"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                    Kansas vanity plates are issued per county — include the county the plate was issued in.
                  </p>
                </div>
              )}
            </div>

            {/* Submit button — above optional fields */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmitQuick || submitting}
              className="w-full rounded-lg h-12 text-base glow"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Submit Quick Report <Coins className="h-3.5 w-3.5 ml-1" /> 1</>
              )}
            </Button>

            {/* Optional details divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">optional details</span>
              </div>
            </div>

            {/* Behavior tabs */}
            <div>
              <Label className="text-sm font-medium">What did they do? <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <div className="mt-1.5">
                {renderBehaviorTabs("quick")}
              </div>
            </div>

            {/* Optional note */}
            <div>
              <Label htmlFor="quick-comment" className="text-sm font-medium flex items-center gap-2">
                Note <span className="text-xs text-muted-foreground font-normal">(optional)</span>
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
                placeholder="Add details about what happened…"
                className="mt-1.5 rounded-lg min-h-[72px] resize-none"
                maxLength={500}
              />
            </div>
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
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      s <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}
              </p>
            </div>

            {/* Step 1: Plate + State */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="plate" className="text-sm font-medium">License Plate & State</Label>
                  <PlateScanner onResult={(plate, scannedState) => {
                    setPlateNumber(plate.slice(0, 10));
                    if (scannedState && US_STATES.some(s => s.code === scannedState)) {
                      setPlateState(scannedState);
                    }
                  }} />
                  <div className="mt-1.5 grid grid-cols-[1fr_90px] gap-2">
                    <Input
                      id="plate"
                      value={plateNumber}
                      onChange={e => setPlateNumber(formatPlate(e.target.value))}
                      placeholder="ABC 1234"
                      className="font-mono text-lg tracking-wider text-center rounded-lg"
                      maxLength={10}
                    />
                    <Select value={plateState} onValueChange={setPlateState}>
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="mt-1 rounded-lg text-xs h-9">
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
                      <SelectTrigger className="mt-1 rounded-lg text-xs h-9">
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
                        className="flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-border/50 px-2.5 py-2 hover:bg-muted/40 transition-colors"
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
                  <Label className="text-sm font-medium">Location</Label>
                  {autoDetectedLocation && !manualOverride ? (
                    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium flex-1">{autoDetectedLocation}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setManualOverride(true)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-full"
                        type="button"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </div>
                  ) : geocoding ? (
                    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Detecting your location…
                    </div>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-[90px_1fr] gap-2">
                      <Select value={incidentState} onValueChange={(v) => {
                        setIncidentState(v);
                        if (autoDetectedLocation && v === detectedStateCode) {
                          setLocation(autoDetectedLocation);
                        } else {
                          setLocation("");
                        }
                      }}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {US_STATES.map(s => (
                            <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select city" /></SelectTrigger>
                        <SelectContent>
                          {autoDetectedLocation && incidentState === detectedStateCode && !getStateByCode(incidentState).cities.some(c => `${c}, ${incidentState}` === autoDetectedLocation) && (
                            <SelectItem value={autoDetectedLocation}>📍 {autoDetectedLocation}</SelectItem>
                          )}
                          {getStateByCode(incidentState).cities.map(city => (
                            <SelectItem key={city} value={`${city}, ${incidentState}`}>
                              {autoDetectedLocation === `${city}, ${incidentState}` ? "📍 " : ""}{city}, {incidentState}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {plateState === "KS" && (
                    <div className="mt-2">
                      <Input
                        value={ksCounty}
                        onChange={e => setKsCounty(e.target.value.slice(0, 40))}
                        placeholder="County the plate was issued in (optional)"
                        className="rounded-lg text-sm h-9"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        Kansas vanity plates are issued per county — include the county the plate was issued in.
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-xl glass p-3 flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium">📍 GPS Location</p>
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
                    <Button variant="outline" size="sm" onClick={detectLocation} type="button" className="rounded-full">
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
                    <SelectTrigger className="mt-1 rounded-lg h-10 text-sm">
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
              <div className="space-y-3 rounded-xl glass p-4">
                <h4 className="font-medium text-sm">Review Your Report</h4>
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
                <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="rounded-full">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : <div />}
              {step < TOTAL_STEPS ? (
                <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="rounded-full">
                  {step === 2 || step === 3 || step === 5 ? "Skip / " : ""}Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="rounded-full glow">
                  <Check className="h-4 w-4 mr-1" /> {submitting ? "Submitting…" : "Submit Report"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
