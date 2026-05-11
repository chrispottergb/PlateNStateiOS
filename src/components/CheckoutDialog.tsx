import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Lock, CheckCircle2 } from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  priceId: string;
  plateNumber?: string;
  disputeId?: string;
  returnUrl?: string;
}

export function CheckoutDialog({ open, onClose, title, priceId, plateNumber, disputeId, returnUrl }: CheckoutDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Simulate processing latency
      await new Promise(r => setTimeout(r, 900));
      const body: Record<string, unknown> = { priceId };
      if (plateNumber) body.plateNumber = plateNumber;
      if (disputeId) body.disputeId = disputeId;
      const { data, error } = await supabase.functions.invoke("mock-checkout", { body });
      if (error || data?.error) throw new Error(error?.message || data?.error || "Checkout failed");
      setDone(true);
      toast({ title: "Payment successful (test)", description: "Your account has been updated." });
      setTimeout(() => {
        onClose();
        setDone(false);
        const url = returnUrl ?? `${window.location.origin}/claim?checkout=success&session_id=mock_${Date.now()}`;
        if (url.startsWith(window.location.origin)) {
          window.location.href = url;
        }
      }, 800);
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !processing && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            This is a sandbox checkout — no real card is charged.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Card</span>
            <span className="font-mono">•••• •••• •••• 4242</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <span className="font-mono">12/29</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">CVC</span>
            <span className="font-mono">•••</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
            <Lock className="h-3 w-3" />
            Test mode — secured by mock processor
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button onClick={handlePay} disabled={processing || done} className="min-w-[120px]">
            {done ? (
              <><CheckCircle2 className="h-4 w-4 mr-1" /> Paid</>
            ) : processing ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing…</>
            ) : (
              "Pay Now (Test)"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
