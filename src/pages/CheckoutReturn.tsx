import { useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Smartphone } from "lucide-react";

/**
 * Public (no-auth) landing page for Stripe checkout redirects coming from the
 * NATIVE app. The Capacitor WebView's origin is https://localhost, which
 * Chrome Custom Tabs can't render — so create-checkout rewrites those return
 * URLs to https://platenstate.com/checkout-return?to=<original-path>. This
 * page then deep-links back into the app via the custom scheme.
 */
const APP_SCHEME = "com.plateandstate.platenstate";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const cancelled = params.get("checkout") === "cancelled";

  const deepLink = useMemo(() => {
    // Rebuild the in-app target: original path (?to=) plus everything Stripe
    // appended (checkout, session_id, dispute, ...).
    const to = params.get("to") || "/claim";
    const passthrough = new URLSearchParams();
    params.forEach((v, k) => { if (k !== "to") passthrough.set(k, v); });
    const sep = to.includes("?") ? "&" : "?";
    const target = passthrough.toString() ? `${to}${sep}${passthrough.toString()}` : to;
    return `${APP_SCHEME}://return?to=${encodeURIComponent(target)}`;
  }, [params]);

  // Auto-attempt the bounce back into the app (needs no gesture on most
  // Android versions; the button below covers the ones where it does).
  useEffect(() => {
    const t = setTimeout(() => { window.location.href = deepLink; }, 600);
    return () => clearTimeout(t);
  }, [deepLink]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        {cancelled ? (
          <>
            <XCircle className="h-14 w-14 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-extrabold">Checkout Cancelled</h1>
            <p className="text-sm text-muted-foreground">
              No charge was made. Head back to the app to try again — or don't, we're not your accountant.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />
            <h1 className="text-2xl font-extrabold">Payment Complete 🎉</h1>
            <p className="text-sm text-muted-foreground">
              You're all set. Tap below to jump back into the app — your purchase is already being applied.
            </p>
          </>
        )}
        <Button asChild size="lg" className="rounded-full w-full gap-2 glow">
          <a href={deepLink}><Smartphone className="h-4 w-4" /> Return to Plate N&apos; State</a>
        </Button>
        <p className="text-xs text-muted-foreground">
          App didn't open? Just switch back to it manually — everything synced the moment you paid.
        </p>
        <Link to="/" className="text-xs text-muted-foreground underline block">Continue on the website instead</Link>
      </div>
    </div>
  );
};

export default CheckoutReturn;
