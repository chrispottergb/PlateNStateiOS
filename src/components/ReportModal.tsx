import { useState, useCallback } from "react";
import { getPosition } from "@/lib/native";
import { Loader2, MapPin, Pencil, Car, Palette, Wrench, User, Zap } from "lucide-react";
import PlateScanner from "@/components/PlateScanner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { INFRACTIONS } from "@/lib/data";
import { US_STATES, getStateByCode, stateNameToCode } from "@/lib/usStates";
import { InfractionType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CarFront, Gauge, CircleAlert, ParkingSquare, ArrowLeftRight, Smartphone, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCaptcha } from "@/hooks/useCaptcha";
import { getClientIp } from "@/lib/clientIp";

const ICON_MAP: Record<string, React.ReactNode> = {
  CarFront: <CarFront className="h-6 w-6" />,
  Gauge: <Gauge className="h-6 w-6" />,
  CircleAlert: <CircleAlert className="h-6 w-6" />,
  ParkingSquare: <ParkingSquare className="h-6 w-6" />,
  ArrowLeftRight: <ArrowLeftRight className="h-6 w-6" />,
  Smartphone: <Smartphone className="h-6 w-6" />,
};

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

const QUICK_INFRACTIONS: InfractionType[] = [
  "tailgating",
  "speeding",
  "ran_red_light",
  "no_turn_signal",
  "distracted_driving",
  "road_rage",
  "bad_parking",
  "suspicious_vehicle",
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
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "denied">("idle");
  const [geocoding, setGeocoding] = useState(false);
  const [autoDetectedLocation, setAutoDetectedLocation] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [stateCode, setStateCode] = useState<string>("WI");
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [showAllInfractions, setShowAllInfractions] = useState(false);

  // Vehicle fields
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>([]);

  // Driver fields
  const [driverGenderFemale, setDriverGenderFemale] = useState(false);
  const [comment, setComment] = useState("");

  const reset = () => {
    setStep(1);
    setPlateNumber(initialPlate);
    setInfraction(null);
    setLocation("");
    setLatitude(null);
    setLongitude(null);
    setGeoStatus("idle");
    setGeocoding(false);
    setAutoDetectedLocation(null);
    setManualOverride(false);
    setStateCode("WI");
    setDateTime(new Date().toISOString().slice(0, 16));
    setVehicleType("");
    setVehicleColor("");
    setVehicleMake("");
    setVehicleModel("");
    setVehicleFeatures([]);
    setDriverGenderFemale(false);
    setComment("");
    setShowAllInfractions(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (v && !user) {
      toast.error("Sign in required", { description: "You need an account to report plates." });
      navigate("/auth");
      return;
    }
    setOpen(v);
    if (v) detectLocation();
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
      if (code) setStateCode(code);
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

  const captcha = useCaptcha();
  const handleSubmit = async () => {
    if (!user || !infraction) return;
    setSubmitting(true);
    try {
      const ip = await getClientIp();
      // captcha.token is null when no site key configured (graceful no-op)
      void captcha.token;
      const { error } = await supabase.rpc("spend_credit_on_report", {
        p_plate_number: plateNumber,
        p_infraction: infraction,
        p_location: location,
        p_latitude: latitude,
        p_longitude: longitude,
        p_vehicle_type: vehicleType || null,
        p_vehicle_color: vehicleColor || null,
        p_vehicle_make: vehicleMake || null,
        p_vehicle_model: vehicleModel || null,
        p_vehicle_features: vehicleFeatures.length > 0 ? vehicleFeatures : [],
        p_driver_gender: null, // restricted — not sent from client
        p_comment: comment || null,
        p_state: stateCode,
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
      toast.success("Report submitted! 🪙 1 coin spent", {
        description: `${plateNumber} reported for ${INFRACTIONS.find(i => i.type === infraction)?.label}`,
      });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formatPlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 8);

  const canSubmitQuick = plateNumber.trim().length >= 4 && infraction !== null && location.trim().length > 0;

  const canProceed = () => {
    if (step === 1) return plateNumber.trim().length >= 4;
    if (step === 2) return true;
    if (step === 3) return infraction !== null;
    if (step === 4) return location.trim().length > 0;
    if (step === 5) return true;
    return true;
  };

  const stepLabels = ["Plate", "Vehicle", "Infraction", "Location", "Driver", "Review"];

  const quickInfractionList = showAllInfractions ? INFRACTIONS : INFRACTIONS.filter(i => QUICK_INFRACTIONS.includes(i.type));

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
            {mode === "quick" ? "Quick Report" : "Report a Bad Driver"}
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> 1 coin
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <button
          onClick={() => { setMode(mode === "quick" ? "detailed" : "quick"); setStep(1); }}
          className="text-xs text-primary hover:underline text-left -mt-2 mb-1"
        >
          {mode === "quick"
            ? "Need to add details? Switch to Detailed Report →"
            : "⚡ Just need the basics? Quick Report"}
        </button>

        {/* ===== QUICK MODE ===== */}
        {mode === "quick" && (
          <div className="space-y-4">
            {/* Plate input */}
            <div>
              <Label htmlFor="quick-plate" className="text-sm font-medium">License Plate</Label>
              <PlateScanner onResult={(plate, state) => {
                setPlateNumber(plate);
              }} />
              <Input
                id="quick-plate"
                value={plateNumber}
                onChange={e => setPlateNumber(formatPlate(e.target.value))}
                placeholder="ABC 1234"
                className="mt-1.5 font-mono text-xl tracking-widest text-center rounded-lg h-12"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">Or scan/upload a photo above</p>
            </div>

            {/* Infraction chips */}
            <div>
              <Label className="text-sm font-medium">What did they do?</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {quickInfractionList.map(inf => (
                  <button
                    key={inf.type}
                    onClick={() => setInfraction(inf.type)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-all ${
                      infraction === inf.type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {ICON_MAP_SM[inf.icon]}
                    <span className="font-medium truncate">{inf.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAllInfractions(!showAllInfractions)}
                className="text-xs text-primary hover:underline mt-1.5"
              >
                {showAllInfractions ? "Show less" : `More infractions (${INFRACTIONS.length - QUICK_INFRACTIONS.length}+)…`}
              </button>
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
                <div className="mt-1.5 grid grid-cols-[110px_1fr] gap-2">
                  <Select value={stateCode} onValueChange={(v) => { setStateCode(v); setLocation(""); }}>
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
                      {getStateByCode(stateCode).cities.map(city => (
                        <SelectItem key={city} value={`${city}, ${stateCode}`}>{city}, {stateCode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Submit */}
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

            {/* Step 1: Plate */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="plate" className="text-sm font-medium">License Plate Number</Label>
                  <PlateScanner onResult={(plate, state) => {
                    setPlateNumber(plate);
                  }} />
                  <Input
                    id="plate"
                    value={plateNumber}
                    onChange={e => setPlateNumber(formatPlate(e.target.value))}
                    placeholder="ABC 1234"
                    className="mt-1.5 font-mono text-lg tracking-wider text-center rounded-lg"
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Scan a plate or type it manually</p>
                </div>
              </div>
            )}

            {/* Step 2: Vehicle Description */}
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

            {/* Step 3: Infraction */}
            {step === 3 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">What did they do?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INFRACTIONS.map(inf => (
                    <button
                      key={inf.type}
                      onClick={() => setInfraction(inf.type)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition-all ${
                        infraction === inf.type
                          ? "border-primary bg-primary/10 text-primary glow"
                          : "border-border/50 hover:border-primary/30 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {ICON_MAP[inf.icon]}
                      <span className="font-medium text-xs">{inf.label}</span>
                      <span className="text-[10px] text-muted-foreground">+{inf.points} pts</span>
                    </button>
                  ))}
                </div>
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
                    <div className="mt-1.5 grid grid-cols-[110px_1fr] gap-2">
                      <Select value={stateCode} onValueChange={(v) => { setStateCode(v); setLocation(""); }}>
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
                          {getStateByCode(stateCode).cities.map(city => (
                            <SelectItem key={city} value={`${city}, ${stateCode}`}>{city}, {stateCode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                <label className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-3 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={driverGenderFemale}
                    onCheckedChange={(checked) => setDriverGenderFemale(checked === true)}
                  />
                  <span className="text-sm">Female driver</span>
                </label>
                <div>
                  <Label className="text-xs">Additional Comments</Label>
                  <Textarea
                    value={comment}
                    onChange={e => setComment(e.target.value.slice(0, 280))}
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
                    <span className="font-mono font-bold">{plateNumber}</span>
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
                    <span className="text-muted-foreground">Infraction</span>
                    <span className="font-medium">{INFRACTIONS.find(i => i.type === infraction)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span>{location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">When</span>
                    <span>{new Date(dateTime).toLocaleString()}</span>
                  </div>
                  {driverGenderFemale && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Driver</span>
                      <span>Female</span>
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
                  {step === 2 || step === 5 ? "Skip / " : ""}Next <ArrowRight className="h-4 w-4 ml-1" />
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
