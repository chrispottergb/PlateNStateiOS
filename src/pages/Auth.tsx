import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCaptcha, CaptchaWidget } from "@/hooks/useCaptcha";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Shield } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import authBg from "@/assets/auth-bg.jpg";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
        if (password.length < 10 || !/\d/.test(password)) {
          throw new Error("Password must be at least 10 characters and include a number.");
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: displayName || "Driver" },
            emailRedirectTo: window.location.origin,
            captchaToken: captchaToken ?? undefined,
          },
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "We sent you a verification link to confirm your account." });
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
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) throw result.error;
                if (result.redirected) return;
                navigate("/");
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

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <CaptchaWidget captcha={captcha} />
            {isSignUp && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="pl-10 rounded-xl h-11"
                />
              </div>
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
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
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
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</Link>.
                </span>
              </label>
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

        {/* Enterprise Link */}
        <div className="text-center mt-6">
          <Link to="/business" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 justify-center">
            <Shield className="h-3 w-3" /> Enterprise? Use the Business Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
