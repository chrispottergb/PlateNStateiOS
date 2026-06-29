import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Bell, EyeOff, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const DISMISS_KEY = "claim_upsell_dismissed";

export const claimUpsellDismissed = () =>
  typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shown right after a user files a report — the highest-intent moment to surface
 * "could someone report YOUR plate?" and convert them to a paid plate claim.
 */
const ClaimUpsellDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();

  const dismissForever = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 to-accent/10 p-6 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="mx-auto w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-3"
          >
            <Shield className="h-7 w-7" />
          </motion.div>
          <h2 className="text-lg font-extrabold leading-tight">
            Wait — could someone report <span className="text-primary">your</span> plate?
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            You just reported someone. Claim your own plate so you're never caught off guard.
          </p>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-3">
          <div className="flex items-start gap-3">
            <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm"><span className="font-semibold">Get alerted instantly</span> the moment your plate is reported.</p>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm"><span className="font-semibold">Dispute false reports</span> before they hurt your reputation.</p>
          </div>
          <div className="flex items-start gap-3">
            <EyeOff className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm"><span className="font-semibold">Go private</span> — hide from the Wall of Shame and insurance lookups.</p>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-1">From $4.99 — lifetime claim just $29.99</p>

          <Button
            className="w-full rounded-full h-11 gap-2 glow font-semibold"
            onClick={() => { onOpenChange(false); navigate("/claim"); }}
          >
            Claim My Plate <ArrowRight className="h-4 w-4" />
          </Button>
          <button
            onClick={dismissForever}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Not interested — don't show again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimUpsellDialog;
