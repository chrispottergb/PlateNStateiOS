import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Lock, ArrowRight, CheckCircle } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import authBg from "@/assets/auth-bg.jpg";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const enableRecovery = () => {
      if (cancelled) return;
      setIsRecovery(true);
      setChecking(false);
    };
    const finishChecking = () => { if (!cancelled) setChecking(false); };

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const queryParams = url.searchParams;

        if (hashParams.get("type") === "recovery") {
          enableRecovery();
          return;
        }

        const tokenHash = queryParams.get("token_hash");
        const type = queryParams.get("type");
        if (tokenHash && type === "recovery") {
          try {
            const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
            if (!error) { enableRecovery(); return; }
            toast({ title: "Reset link expired", description: "Request a new password reset email.", variant: "destructive" });
          } catch {
            toast({ title: "Reset link error", description: "Please request a new password reset email.", variant: "destructive" });
          }
          finishChecking();
          return;
        }

        // PKCE flow — explicitly exchange the code instead of relying on a timeout
        const code = queryParams.get("code");
        if (code) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) { enableRecovery(); return; }
          } catch { /* fall through to getSession check */ }
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) { enableRecovery(); return; }
        } catch { /* ignore */ }
        finishChecking();
      } catch {
        finishChecking();
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        enableRecovery();
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/auth"), 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="absolute inset-0">
        <img src={authBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10 px-4">
        <div className="text-center mb-8">
          <img src={logoIcon} alt="Plate N' State" className="h-14 w-14 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold">Reset Password</h1>
          <p className="text-xs text-muted-foreground mt-1">Enter your new password below</p>
        </div>

        <div className="glass-card p-6 glow-lg">
          {success ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <p className="text-sm font-medium">Password updated successfully!</p>
              <p className="text-xs text-muted-foreground">Redirecting to sign in…</p>
            </div>
          ) : checking ? (
            <div className="text-center py-6 space-y-2">
              <div className="inline-block h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Verifying reset link…</p>
            </div>
          ) : !isRecovery ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Invalid or expired reset link. Please request a new one.</p>
              <Button className="mt-4 rounded-full" onClick={() => navigate("/auth")}>Back to Sign In</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  minLength={6}
                  className="pl-10 rounded-xl h-11"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="pl-10 rounded-xl h-11"
                />
              </div>
              <Button type="submit" className="w-full rounded-full glow h-11 text-sm font-semibold gap-2" disabled={loading}>
                {loading ? "Updating..." : "Set New Password"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
