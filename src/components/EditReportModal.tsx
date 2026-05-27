import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Clock, Loader2, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BAD_INFRACTIONS, GOOD_BEHAVIORS, INFRACTIONS } from "@/lib/data";
import { InfractionType } from "@/lib/types";
import { US_STATES } from "@/lib/usStates";
import { differenceInMinutes, formatDistanceToNow } from "date-fns";

const VEHICLE_TYPES = ["Sedan", "SUV", "Truck", "Van", "Minivan", "Coupe", "Convertible", "Hatchback", "Wagon", "Motorcycle", "Semi/Commercial"];
const VEHICLE_COLORS = ["Black", "White", "Silver/Gray", "Red", "Blue", "Green", "Yellow", "Orange", "Brown", "Gold", "Other"];
const VEHICLE_FEATURE_OPTIONS = [
  "Visible Damage", "Aftermarket Rims", "Lifted/Lowered",
  "Custom Paint/Wrap", "Tinted Windows", "Loud Exhaust", "Bumper Stickers",
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

export interface EditableReport {
  id: string;
  plate_number: string;
  state: string | null;
  infraction: string;
  comment: string | null;
  vehicle_type: string | null;
  vehicle_color: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_features: string[] | null;
  driver_gender: string | null;
  created_at: string;
  edited_at?: string | null;
}

interface EditReportModalProps {
  report: EditableReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: Partial<EditableReport>) => void;
}

const EDIT_WINDOW_HOURS = 24;

const formatPlate = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 10);

const EditReportModal = ({ report, open, onOpenChange, onSaved }: EditReportModalProps) => {
  const [plateNumber, setPlateNumber] = useState("");
  const [plateState, setPlateState] = useState("WI");
  const [infraction, setInfraction] = useState<InfractionType | null>(null);
  const [behaviorTab, setBehaviorTab] = useState<"bad" | "good">("bad");
  const [comment, setComment] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>([]);
  const [driverDescription, setDriverDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed form when report changes
  useEffect(() => {
    if (!report) return;
    setPlateNumber(report.plate_number);
    setPlateState(report.state || "WI");
    const inf = report.infraction as InfractionType;
    setInfraction(inf === "unspecified" ? null : inf);
    const goodType = GOOD_BEHAVIORS.find(b => b.type === inf);
    setBehaviorTab(goodType ? "good" : "bad");
    setComment(report.comment || "");
    setVehicleType(report.vehicle_type || "");
    setVehicleColor(report.vehicle_color || "");
    setVehicleMake(report.vehicle_make || "");
    setVehicleModel(report.vehicle_model || "");
    setVehicleFeatures(report.vehicle_features || []);
    setDriverDescription(report.driver_gender || "");
  }, [report]);

  if (!report) return null;

  const createdAt = new Date(report.created_at);
  const minutesLeft = EDIT_WINDOW_HOURS * 60 - differenceInMinutes(new Date(), createdAt);
  const windowExpired = minutesLeft <= 0;

  const toggleFeature = (feat: string) =>
    setVehicleFeatures(prev =>
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    );

  const handleSave = async () => {
    if (windowExpired) return;
    if (plateNumber.trim().length < 2) {
      toast.error("Plate number too short");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("edit_own_report", {
        p_report_id: report.id,
        p_plate_number: plateNumber,
        p_state: plateState,
        p_infraction: infraction ?? "unspecified",
        p_comment: comment,
        p_vehicle_type: vehicleType,
        p_vehicle_color: vehicleColor,
        p_vehicle_make: vehicleMake,
        p_vehicle_model: vehicleModel,
        p_vehicle_features: vehicleFeatures,
        p_driver_gender: driverDescription,
      } as any);

      if (error) {
        if (error.message.includes("EDIT_WINDOW_EXPIRED")) {
          toast.error("Edit window closed", { description: "Reports can only be edited within 24 hours of submission." });
        } else if (error.message.includes("NOT_YOUR_REPORT")) {
          toast.error("Not your report");
        } else {
          toast.error("Failed to save", { description: error.message });
        }
        return;
      }

      onSaved({
        plate_number: plateNumber.toUpperCase().trim(),
        state: plateState,
        infraction: infraction ?? "unspecified",
        comment: comment || null,
        vehicle_type: vehicleType || null,
        vehicle_color: vehicleColor || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_features: vehicleFeatures,
        driver_gender: driverDescription || null,
        edited_at: new Date().toISOString(),
      });
      toast.success("Report updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Something went wrong", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const windowLabel = windowExpired
    ? "Edit window closed"
    : minutesLeft < 60
    ? `${minutesLeft}m left to edit`
    : `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left to edit`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-strong rounded-xl border-border/50 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Edit Report
            <Badge
              variant="outline"
              className={`ml-auto text-[10px] rounded-full flex items-center gap-1 ${
                windowExpired
                  ? "border-destructive/40 text-destructive"
                  : minutesLeft < 60
                  ? "border-amber-500/40 text-amber-500"
                  : "border-primary/40 text-primary"
              }`}
            >
              <Clock className="h-2.5 w-2.5" />
              {windowLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {windowExpired ? (
          <div className="py-6 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Edit window has closed</p>
            <p className="text-xs text-muted-foreground">
              Reports can only be corrected within {EDIT_WINDOW_HOURS} hours of filing.
              This report was filed {formatDistanceToNow(createdAt, { addSuffix: true })}.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Plate + state */}
            <div>
              <Label className="text-sm font-medium">License Plate & State</Label>
              <div className="mt-1.5 grid grid-cols-[1fr_90px] gap-2">
                <Input
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
            </div>

            {/* Behavior */}
            <div>
              <Label className="text-sm font-medium">
                What did they do? <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="mt-1.5">
                <Tabs value={behaviorTab} onValueChange={v => { setBehaviorTab(v as "bad" | "good"); setInfraction(null); }}>
                  <TabsList className="w-full grid grid-cols-2 mb-2">
                    <TabsTrigger value="bad" className="gap-1.5 text-xs">
                      <ThumbsDown className="h-3.5 w-3.5" /> Bad Behavior
                    </TabsTrigger>
                    <TabsTrigger value="good" className="gap-1.5 text-xs">
                      <ThumbsUp className="h-3.5 w-3.5" /> Good Behavior
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="bad" className="mt-0">
                    <div className="grid grid-cols-2 gap-1.5">
                      {BAD_INFRACTIONS.map(inf => (
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
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium truncate">{inf.label}</span>
                        </button>
                      ))}
                    </div>
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
                          <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium truncate">{inf.label}</span>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Vehicle */}
            <div>
              <Label className="text-sm font-medium">
                Vehicle <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="rounded-lg text-xs h-9"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={vehicleColor} onValueChange={setVehicleColor}>
                  <SelectTrigger className="rounded-lg text-xs h-9"><SelectValue placeholder="Color" /></SelectTrigger>
                  <SelectContent>{VEHICLE_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input
                  value={vehicleMake}
                  onChange={e => setVehicleMake(e.target.value)}
                  placeholder="Make (e.g. Toyota)"
                  className="rounded-lg text-xs h-9"
                  maxLength={30}
                />
                <Input
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  placeholder="Model (e.g. Camry)"
                  className="rounded-lg text-xs h-9"
                  maxLength={30}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {VEHICLE_FEATURE_OPTIONS.map(feat => (
                  <label
                    key={feat}
                    className="flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-border/50 px-2.5 py-1.5 hover:bg-muted/40 transition-colors"
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

            {/* Driver + comment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Driver & Notes <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select value={driverDescription} onValueChange={setDriverDescription}>
                <SelectTrigger className="rounded-lg h-9 text-sm">
                  <SelectValue placeholder="Driver description" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 500))}
                placeholder="Add or correct details about what happened…"
                className="rounded-lg min-h-[72px] resize-none text-sm"
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">{comment.length}/500</p>
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              Location, date, and incident state cannot be changed after submission.
            </p>

            <Button
              onClick={handleSave}
              disabled={saving || plateNumber.trim().length < 2}
              className="w-full rounded-lg h-11 glow"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditReportModal;
