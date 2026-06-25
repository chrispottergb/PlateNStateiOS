import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TERMS_VERSION = "2026-05-14";
const TERMS_ACCEPTED_KEY = "terms_accepted";

const TermsGate = () => {
  const { user, loading, termsAcceptedAt } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pathname === "/reset-password") { setOpen(false); return; }
    if (loading || !user) return;
    // Already accepted in this session or a previous one
    if (termsAcceptedAt || localStorage.getItem(TERMS_ACCEPTED_KEY)) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [user, loading, termsAcceptedAt, pathname]);

  const accept = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION })
      .eq("user_id", user.id);
    setSaving(false);
    if (!error) {
      localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Updated Terms & Privacy</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              Before continuing, please review and accept our{" "}
              <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>,{" "}
              <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>, and{" "}
              <Link to="/csae-policy" target="_blank" className="text-primary hover:underline">CSAE Policy</Link>.
            </span>
            <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span>I have read and agree to the Terms of Service, Privacy Policy, and CSAE Policy.</span>
            </label>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction disabled={!checked || saving} onClick={accept}>
            {saving ? "Saving..." : "Accept & Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TermsGate;
