import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INFRACTIONS, WISCONSIN_CITIES } from "@/lib/data";
import { InfractionType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CarFront, Gauge, CircleAlert, ParkingSquare, ArrowLeftRight, Smartphone, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ICON_MAP: Record<string, React.ReactNode> = {
  CarFront: <CarFront className="h-6 w-6" />,
  Gauge: <Gauge className="h-6 w-6" />,
  CircleAlert: <CircleAlert className="h-6 w-6" />,
  ParkingSquare: <ParkingSquare className="h-6 w-6" />,
  ArrowLeftRight: <ArrowLeftRight className="h-6 w-6" />,
  Smartphone: <Smartphone className="h-6 w-6" />,
};

interface ReportModalProps {
  trigger: React.ReactNode;
  initialPlate?: string;
}

const ReportModal = ({ trigger, initialPlate = "" }: ReportModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [plateNumber, setPlateNumber] = useState(initialPlate);
  const [infraction, setInfraction] = useState<InfractionType | null>(null);
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "denied">("idle");
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });

  const reset = () => {
    setStep(1);
    setPlateNumber(initialPlate);
    setInfraction(null);
    setLocation("");
    setLatitude(null);
    setLongitude(null);
    setGeoStatus("idle");
    setDateTime(new Date().toISOString().slice(0, 16));
  };

  const handleOpenChange = (v: boolean) => {
    if (v && !user) {
      toast.error("Sign in required", { description: "You need an account to report plates." });
      navigate("/auth");
      return;
    }
    setOpen(v);
    if (v) {
      // Auto-detect GPS on open
      detectLocation();
    }
    if (!v) reset();
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGeoStatus("done");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    if (!user || !infraction) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("spend_credit_on_report", {
        p_plate_number: plateNumber,
        p_infraction: infraction,
        p_location: location,
        p_latitude: latitude,
        p_longitude: longitude,
      } as any);
      if (error) {
        if (error.message.includes("Insufficient credits")) {
          toast.error("Not enough coins!", { description: "You've used all your monthly coins. Credits refresh on the 1st." });
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

  const formatPlate = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 8);
  };

  const canProceed = () => {
    if (step === 1) return plateNumber.trim().length >= 4;
    if (step === 2) return infraction !== null;
    if (step === 3) return location.trim().length > 0;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report a Bad Driver
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> 1 coin
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="plate" className="text-sm font-medium">License Plate Number</Label>
              <Input
                id="plate"
                value={plateNumber}
                onChange={e => setPlateNumber(formatPlate(e.target.value))}
                placeholder="ABC 1234"
                className="mt-1.5 font-mono text-lg tracking-wider text-center"
                maxLength={8}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1.5">Enter a license plate number</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">What did they do?</Label>
            <div className="grid grid-cols-2 gap-2">
              {INFRACTIONS.map(inf => (
                <button
                  key={inf.type}
                  onClick={() => setInfraction(inf.type)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-all ${
                    infraction === inf.type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted text-muted-foreground"
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

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {WISCONSIN_CITIES.map(city => (
                    <SelectItem key={city} value={`${city}, WI`}>{city}, WI</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3 flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">📍 GPS Location</p>
                {geoStatus === "loading" && <p className="text-xs text-muted-foreground">Detecting…</p>}
                {geoStatus === "done" && (
                  <p className="text-xs text-emerald-600">
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
                className="mt-1.5"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 rounded-lg bg-muted p-4">
            <h4 className="font-medium text-sm">Review Your Report</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plate</span>
                <span className="font-mono font-bold">{plateNumber}</span>
              </div>
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
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <div />}
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-primary">
              <Check className="h-4 w-4 mr-1" /> {submitting ? "Submitting…" : "Submit Report"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
