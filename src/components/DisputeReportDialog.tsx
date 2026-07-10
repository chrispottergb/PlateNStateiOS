import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckoutDialog } from "./CheckoutDialog";
import { purchasesEnabled } from "@/lib/native";

interface DisputeReportDialogProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  plateNumber: string;
}

const REASONS = [
  { value: "not_my_vehicle", label: "Not my vehicle" },
  { value: "inaccurate_details", label: "Inaccurate details" },
  { value: "duplicate", label: "Duplicate report" },
  { value: "harassment_or_abuse", label: "Harassment or abuse" },
  { value: "other", label: "Other" },
];

export function DisputeReportDialog({ open, onClose, reportId, plateNumber }: DisputeReportDialogProps) {
  const [eligibility, setEligibility] = useState<{ can_dispute: boolean; is_free?: boolean; price_cents?: number; reason?: string } | null>(null);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDisputeId, setPendingDisputeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setNote("");
    setPendingDisputeId(null);
    (async () => {
      const { data, error } = await supabase.rpc("dispute_eligibility", { p_report_id: reportId });
      if (error) {
        toast.error("Could not load dispute eligibility");
        return;
      }
      setEligibility(data as any);
    })();
  }, [open, reportId]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_dispute", {
      p_report_id: reportId,
      p_reason: reason,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { dispute_id: string; requires_payment: boolean };
    if (result.requires_payment) {
      setPendingDisputeId(result.dispute_id);
    } else {
      toast.success("Dispute submitted — our team will review it shortly.");
      onClose();
    }
  };

  if (pendingDisputeId) {
    // Apple 3.1.1: no external payment on iOS. Free disputes work everywhere;
    // a fee-based dispute stays saved server-side but can't be paid here.
    if (!purchasesEnabled) {
      return (
        <Dialog open={true} onOpenChange={(v) => { if (!v) { setPendingDisputeId(null); onClose(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dispute saved</DialogTitle>
              <DialogDescription>
                This dispute requires a review fee, which isn't available in this version of the app.
                Your dispute has been saved to your account.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }
    return (
      <CheckoutDialog
        open={true}
        onClose={() => {
          setPendingDisputeId(null);
          onClose();
        }}
        title="Pay $5.99 to submit dispute"
        priceId="report_dispute_fee"
        disputeId={pendingDisputeId}
        returnUrl={`${window.location.origin}/profile?dispute=submitted&session_id={CHECKOUT_SESSION_ID}`}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dispute this report</DialogTitle>
          <DialogDescription>
            Plate <span className="font-mono font-bold">{plateNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {!eligibility && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {eligibility && !eligibility.can_dispute && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {eligibility.reason === "already_disputed" && "You have already disputed this report."}
              {eligibility.reason === "not_owner" && "Only the verified plate owner can dispute reports on this plate."}
              {eligibility.reason === "not_authenticated" && "Please sign in first."}
              {eligibility.reason === "report_not_found" && "Report not found."}
            </AlertDescription>
          </Alert>
        )}

        {eligibility?.can_dispute && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {eligibility.is_free ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">First dispute — free</Badge>
              ) : (
                <Badge variant="secondary">$5.99 review fee</Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Optional note ({280 - note.length} left)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 280))}
                placeholder="Briefly explain why this post should be removed."
                rows={3}
              />
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Do not include personal information (name, address, license, insurance, VIN).
                  We never store any personal data about plate owners.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !reason}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {eligibility.is_free ? "Submit free dispute" : "Continue to payment"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
