import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCaptcha, CaptchaWidget } from "@/hooks/useCaptcha";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Shield, CheckCircle2, Skull, Briefcase } from "lucide-react";
import { isNative } from "@/lib/native";
import logoIcon from "@/assets/logo-icon.png";
import authBg from "@/assets/auth-bg.jpg";

// On native (Capacitor) window.location.origin is http://localhost, which Supabase
// rejects as a redirect URL and which won't reopen the app from an email link.
// Fall back to the published web URL so confirmation links still work.
const REDIRECT_ORIGIN = isNative
  ? "https://platenstate.com"
  : window.location.origin;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [portalMode, setPortalMode] = useState<"consumer" | "enterprise">("consumer");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const captcha = useCaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Run captcha challenge (resolves null if not enabled)
      const captchaToken = await captcha.execute();
      if (captcha.enabled && !captchaToken) {
        throw new Error("Captcha verification failed. Please try again.");
      }
      if (isSignUp) {
        if (!acceptedTerms) {
          throw new Error("You must accept the Terms of Service and Privacy Policy to sign up.");
        }
        if (displayName.trim().length < 2) {
          throw new Error("Please choose a display name (at least 2 characters).");
        }
        if (password.length < 10 || !/\d/.test(password)) {
          throw new Error("Password must be at least 10 characters and include a number.");
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: {
              display_name: displayName.trim(),
              terms_accepted_at: new Date().toISOString(),
              terms_version: "2026-05-11",
              portal_mode: portalMode,
            },
            emailRedirectTo: REDIRECT_ORIGIN,
            captchaToken: captchaToken ?? undefined,
          },
        });
        if (error) throw error;
        // Persist to profile (will run after profile row exists; if no session yet, will sync on first login)
        if (signUpData.user) {
          await supabase
            .from("profiles")
            .update({ terms_accepted_at: new Date().toISOString(), terms_version: "2026-05-11", portal_mode: portalMode })
            .eq("user_id", signUpData.user.id);
          // Fire welcome email (non-blocking, silently skip on failure)
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "welcome",
              recipientEmail: email,
              idempotencyKey: `welcome-${signUpData.user.id}`,
              templateData: { name: displayName || undefined },
            },
          }).catch(() => {});
        }
        toast({ title: "Welcome to the Patrol!", description: "Your account is ready." });
        navigate(portalMode === "enterprise" ? "/business" : "/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email, password,
          options: { captchaToken: captchaToken ?? undefined },
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={authBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10 px-4"
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <img src={logoIcon} alt="Plate N' State" className="h-14 w-14 mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold">Plate N' State</h1>
          <p className="text-xs text-muted-foreground italic mt-1">Because honking isn't enough™</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-6 glow-lg">
          {/* Tabs */}
          <div className="flex rounded-full bg-muted/50 p-1 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${!isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${isSignUp ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full h-11 text-sm font-medium gap-2 mb-4"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (isNative) {
                  const state = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
                  const params = new URLSearchParams({
                    provider: "google",
                    redirect_uri: `${REDIRECT_ORIGIN}/auth`,
                    state,
                  });
                  const { Browser } = await import("@capacitor/browser");
                  await Browser.open({ url: `https://platenstate.com/~oauth/initiate?${params.toString()}` });
                  return;
                }

                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${REDIRECT_ORIGIN}/` },
                });
                if (error) throw error;
              } catch (error: any) {
                toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
              } finally {
                setLoading(false);
              }
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full h-11 text-sm font-medium gap-2 mb-4"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (isNative) {
                  const state = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
                  const params = new URLSearchParams({
                    provider: "apple",
                    redirect_uri: `${REDIRECT_ORIGIN}/auth`,
                    state,
                  });
                  const { Browser } = await import("@capacitor/browser");
                  await Browser.open({ url: `https://platenstate.com/~oauth/initiate?${params.toString()}` });
                  return;
                }

                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "apple",
                  options: { redirectTo: `${REDIRECT_ORIGIN}/` },
                });
                if (error) throw error;
              } catch (error: any) {
                const raw = (error?.message || error?.error_description || String(error || "")).toLowerCase();
                let title = "Apple sign-in failed";
                let description = error?.message || "Something went wrong. Please try again.";

                if (raw.includes("redirect") || raw.includes("redirect_uri") || raw.includes("invalid_request")) {
                  title = "Redirect not configured";
                  description = "This domain isn't approved for Apple sign-in yet. Try again from platenstate.com, or contact support if the issue persists.";
                } else if (
                  raw.includes("access_denied") ||
                  raw.includes("user_cancelled") ||
                  raw.includes("user canceled") ||
                  raw.includes("user cancelled") ||
                  raw.includes("denied") ||
                  raw.includes("popup_closed") ||
                  raw.includes("canceled")
                ) {
                  title = "Sign-in cancelled";
                  description = "You closed the Apple sign-in window or didn't grant access. Tap Continue with Apple to try again.";
                } else if (
                  raw.includes("expired") ||
                  raw.includes("invalid_grant") ||
                  raw.includes("token") ||
                  raw.includes("session") ||
                  raw.includes("jwt")
                ) {
                  title = "Session expired";
                  description = "Your Apple sign-in session timed out. Please tap Continue with Apple again to start a fresh login.";
                } else if (raw.includes("network") || raw.includes("fetch") || raw.includes("failed to send")) {
                  title = "Connection problem";
                  description = "We couldn't reach Apple. Check your internet connection and try again.";
                }

                toast({ title, description, variant: "destructive" });
              } finally {
                setLoading(false);
              }
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <CaptchaWidget captcha={captcha} />
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">I'm signing up as</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPortalMode("consumer")}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        portalMode === "consumer"
                          ? "border-primary bg-primary/10 shadow-[inset_0_0_12px_-4px_hsl(var(--glow-primary)/0.4)]"
                          : "border-border/60 bg-muted/20 hover:border-border"
                      }`}
                    >
                      <Skull className={`h-4 w-4 mb-1.5 ${portalMode === "consumer" ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="text-xs font-bold">A-Hole Patrol</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Report drivers, earn XP</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPortalMode("enterprise")}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        portalMode === "enterprise"
                          ? "border-accent bg-accent/10 shadow-[inset_0_0_12px_-4px_hsl(var(--glow-primary)/0.4)]"
                          : "border-border/60 bg-muted/20 hover:border-border"
                      }`}
                    >
                      <Briefcase className={`h-4 w-4 mb-1.5 ${portalMode === "enterprise" ? "text-accent" : "text-muted-foreground"}`} />
                      <div className="text-xs font-bold">Business & Enterprise</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Fleet, insurance, agencies</div>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Display name (username)"
                    required
                    minLength={2}
                    maxLength={40}
                    className="pl-10 rounded-xl h-11"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="pl-10 rounded-xl h-11"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="pl-10 rounded-xl h-11"
              />
            </div>

            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={async () => {
                    if (!email) {
                      toast({ title: "Enter your email first", description: "We need your email to send a reset link.", variant: "destructive" });
                      return;
                    }
                    try {
                      // Always send reset emails to the production custom domain so links
                      // don't break across preview/native/staging origins.
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: "https://platenstate.com/reset-password",
                      });
                      if (error) throw error;
                      toast({ title: "Check your email", description: "We sent you a password reset link." });
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {isSignUp && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Quick summary:</span> reports you submit are public,
                  must be based on what you saw firsthand, and you waive liability for how the community uses them.
                  Don't harass anyone. We'll anonymize your reporter ID after 30 days.
                </p>
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <span>
                    I have read and agree to the{" "}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">full Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</Link>,
                    including the release of liability.
                  </span>
                </label>
                {acceptedTerms && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Thanks — consent recorded for version 2026-05-11.
                  </motion.div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full rounded-full glow h-11 text-sm font-semibold gap-2" disabled={loading || (isSignUp && !acceptedTerms)}>
              {loading ? "Please wait..." : isSignUp ? "Join the Patrol" : "Enter the Patrol"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            {isSignUp ? "Already in the neighborhood?" : "New to the neighborhood?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? "Sign in" : "Join the Snitches"}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Auth;
