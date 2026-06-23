import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";
import { isNative } from "@/lib/native";

const API_BASE = "https://platenstate-scan-api.vercel.app";

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
  const { toast } = useToast();

  const handlePay = async () => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const email = session?.user?.email;

      const finalReturnUrl = returnUrl || `${window.location.origin}/claim`;

      const resp = await fetch(`${API_BASE}/api/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          plateNumber: plateNumber || undefined,
          disputeId: disputeId || undefined,
          userId: userId || undefined,
          email: email || undefined,
          returnUrl: finalReturnUrl,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Checkout failed");

      if (data.url) {
        if (isNative) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url });
        } else {
          window.location.href = data.url;
        }
        onClose();
      }
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
            You'll be redirected to Stripe's secure checkout to complete payment.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
          <p>Payments are processed securely by Stripe. Your card details never touch our servers.</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button onClick={handlePay} disabled={processing} className="min-w-[140px] gap-2">
            {processing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</>
            ) : (
              <><ExternalLink className="h-4 w-4" /> Proceed to Checkout</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
