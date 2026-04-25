import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useMemo } from "react";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  priceId: string;
  plateNumber: string;
}

export function CheckoutDialog({ open, onClose, title, priceId, plateNumber }: CheckoutDialogProps) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const returnUrl = `${window.location.origin}/claim?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, plateNumber, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || data?.error || "Failed to start checkout");
    }
    return data.clientSecret;
  }, [priceId, plateNumber]);

  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <div id="checkout" className="min-h-[400px]">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
