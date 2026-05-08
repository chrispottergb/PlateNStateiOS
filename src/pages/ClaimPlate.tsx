import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import PlateScanner from "@/components/PlateScanner";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Car, CheckCircle, Shield, Camera, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getStripeEnvironment } from "@/lib/stripe";
import { useHomeState } from "@/hooks/useHomeState";

type CheckoutTarget = {
  priceId: "plate_claim_one_time" | "plate_privacy_monthly" | "plate_total_block_monthly";
  plateNumber: string;
  title: string;
} | null;

const CLAIM_PRICE_USD = "$4.99";
const PRIVACY_PRICE_USD = "$7.99/mo";
const TOTAL_BLOCK_PRICE_USD = "$14.99/mo";

const ClaimPlate = () => {
  const { user } = useAuth();
  const [plateNumber, setPlateNumber] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutTarget>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const { homeState, setHomeState } = useHomeState();

  const { data: claimedPlates, refetch: refetchClaims } = useQuery({
    queryKey: ["my-claimed-plates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("claimed_plates")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: subs, refetch: refetchSubs } = useQuery({
    queryKey: ["my-plate-subs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", getStripeEnvironment())
        .in("status", ["active", "trialing", "past_due"]);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // After Stripe redirect back, refresh state and clear query
  useEffect(() => {
    if (params.get("checkout") === "success") {
      toast({ title: "Payment received", description: "Updating your account…" });
      setTimeout(async () => {
        const { data: refreshed } = await refetchClaims();
        await refetchSubs();
        // Set home state from most recently claimed plate if not already set
        if (!homeState && refreshed && refreshed.length > 0) {
          const newest = [...refreshed].sort((a, b) =>
            new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime()
          )[0];
          if (newest?.state) setHomeState(newest.state);
        }
      }, 1500);
      params.delete("checkout");
      params.delete("session_id");
      setParams(params, { replace: true });
    }
  }, [params, setParams, refetchClaims, refetchSubs, toast, homeState, setHomeState]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const tierForPlate = (plate: string): "total_block" | "privacy" | null => {
    const sub = subs?.find(s => s.plate_number === plate);
    if (!sub) return null;
    if (sub.price_id === "plate_total_block_monthly") return "total_block";
    if (sub.price_id === "plate_privacy_monthly") return "privacy";
    return null;
  };

  const handleScanResult = (plate: string) => {
    setPlateNumber(plate);
    setShowScanner(false);
  };

  const startClaim = async () => {
    const cleaned = plateNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 3) {
      toast({ title: "Enter a plate number first", variant: "destructive" });
      return;
    }
    setCheckout({
      priceId: "plate_claim_one_time",
      plateNumber: cleaned,
      title: `Claim ${cleaned} — ${CLAIM_PRICE_USD}`,
    });
  };

  const startBlacklist = (plate: string, tier: "privacy" | "total_block") => {
    setCheckout({
      priceId: tier === "privacy" ? "plate_privacy_monthly" : "plate_total_block_monthly",
      plateNumber: plate,
      title: tier === "privacy"
        ? `Privacy Shield for ${plate} — ${PRIVACY_PRICE_USD}`
        : `Total Block for ${plate} — ${TOTAL_BLOCK_PRICE_USD}`,
    });
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: `${window.location.origin}/claim`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Header />
      <div className="container max-w-2xl py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center gap-2 text-primary">
                <Car className="h-6 w-6" />
                <Shield className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Claim Your Plate</CardTitle>
              <CardDescription>
                Lock in your plate for life — {CLAIM_PRICE_USD} one-time. Get notified when it's reported and unlock optional Privacy tiers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showScanner ? (
                <div className="space-y-3">
                  <PlateScanner onResult={handleScanResult} />
                  <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)} className="w-full">
                    Cancel Scan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={plateNumber}
                      onChange={e => setPlateNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                      placeholder="ABC 1234"
                      className="font-mono text-lg tracking-wider"
                      maxLength={8}
                    />
                    <Button onClick={startClaim} disabled={plateNumber.trim().length < 3}>
                      <Lock className="h-4 w-4 mr-1" /> Claim {CLAIM_PRICE_USD}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowScanner(true)}>
                    <Camera className="h-4 w-4 mr-2" />
                    Scan Plate Instead
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {claimedPlates && claimedPlates.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Plates</h3>
              {subs && subs.length > 0 && (
                <Button variant="outline" size="sm" onClick={openBillingPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                  Manage Billing
                </Button>
              )}
            </div>

            {claimedPlates.map(plate => {
              const tier = tierForPlate(plate.plate_number);
              return (
                <Card key={plate.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-mono text-lg font-bold tracking-wider">
                          {plate.plate_number}
                        </span>
                        {!plate.paid && (
                          <span className="text-[10px] uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            Unpaid (legacy)
                          </span>
                        )}
                        {tier === "privacy" && (
                          <span className="text-[10px] uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Privacy Shield
                          </span>
                        )}
                        {tier === "total_block" && (
                          <span className="text-[10px] uppercase tracking-wider text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                            Total Block
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tier picker */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className={`rounded-lg border p-3 ${tier === "privacy" ? "border-blue-500 bg-blue-50/30" : "border-border"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">Privacy Shield</span>
                          <span className="ml-auto text-sm font-bold">{PRIVACY_PRICE_USD}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                          <li>• Hidden from Wall of Shame & Trending</li>
                          <li>• Plate masked publicly (ABC****)</li>
                          <li>• Reports still allowed</li>
                        </ul>
                        <Button
                          size="sm"
                          variant={tier === "privacy" ? "secondary" : "default"}
                          className="w-full"
                          disabled={tier === "privacy" || !plate.paid}
                          onClick={() => startBlacklist(plate.plate_number, "privacy")}
                        >
                          {tier === "privacy" ? "Active" : tier === "total_block" ? "Downgrade in Billing" : "Activate"}
                        </Button>
                      </div>

                      <div className={`rounded-lg border p-3 ${tier === "total_block" ? "border-violet-600 bg-violet-50/30" : "border-border"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <EyeOff className="h-4 w-4 text-violet-700" />
                          <span className="font-semibold text-sm">Total Block</span>
                          <span className="ml-auto text-sm font-bold">{TOTAL_BLOCK_PRICE_USD}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                          <li>• Everything in Privacy Shield</li>
                          <li>• Blocks new reports entirely</li>
                          <li>• Hidden from Insurance & LE lookups</li>
                        </ul>
                        <Button
                          size="sm"
                          variant={tier === "total_block" ? "secondary" : "default"}
                          className="w-full"
                          disabled={tier === "total_block" || !plate.paid}
                          onClick={() => startBlacklist(plate.plate_number, "total_block")}
                        >
                          {tier === "total_block" ? "Active" : "Activate"}
                        </Button>
                      </div>
                    </div>

                    {!plate.paid && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                        This plate was claimed before paid claims existed. Blacklist tiers require a paid claim — claim it again above to enable them.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}
      </div>

      {checkout && (
        <CheckoutDialog
          open={!!checkout}
          onClose={() => setCheckout(null)}
          title={checkout.title}
          priceId={checkout.priceId}
          plateNumber={checkout.plateNumber}
        />
      )}
    </div>
  );
};

export default ClaimPlate;
