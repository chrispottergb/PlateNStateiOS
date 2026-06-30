import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";

// FREE removal path for the subject of a report (Google Play UGC policy requires
// affected users to be able to request takedown WITHOUT paying). This is distinct
// from the paid "verified dispute" flow. It records into the EXISTING report_flags
// table with an OWNER_REMOVAL_REQUEST reason prefix so it routes to moderators.
// No plate-claim or payment gate — only the same sign-in that flagging already needs.
const OWNER_REMOVAL_PREFIX = "OWNER_REMOVAL_REQUEST:";

interface OwnerRemovalRequestProps {
  reportId: string;
  // Optional custom trigger; defaults to a subtle text-style button.
  trigger?: (open: () => void) => React.ReactNode;
}

const OwnerRemovalRequest = ({ reportId, trigger }: OwnerRemovalRequestProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sign in to request removal"); setSubmitting(false); return; }
    const detail = reason.trim();
    const { error } = await supabase.from("report_flags").insert({
      report_id: reportId,
      user_id: user.id,
      reason: `${OWNER_REMOVAL_PREFIX} ${detail || "(no reason given)"}`.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "You already submitted a removal request for this report"
          : "Failed to submit removal request"
      );
      return;
    }
    setDone(true);
    setOpen(false);
    toast.success("Removal request sent to our moderators");
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          type="button"
          disabled={done}
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1 transition-colors ${done ? "text-emerald-400" : "text-muted-foreground hover:text-foreground underline underline-offset-2"}`}
        >
          <ShieldOff className="h-3 w-3" />
          {done ? "Removal requested" : "This is my plate — request removal (free)"}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request removal — free</DialogTitle>
            <DialogDescription>
              If you are the subject of this report, you can ask our moderators to
              review and remove it at no cost. This is separate from the paid
              "verified dispute" — no payment or plate claim is required.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tell us why this should be removed (optional)"
            maxLength={500}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting ? "Submitting..." : "Request Removal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OwnerRemovalRequest;
