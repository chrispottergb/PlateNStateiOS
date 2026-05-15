import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } },
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json();
      if (data.success) setState("done");
      else if (data.reason === "already_unsubscribed") setState("already");
      else {
        setErrorMsg(data.error || "Could not unsubscribe.");
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Email preferences</h1>

        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking your link…</p>
          </div>
        )}

        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              Click below to unsubscribe from Plate N' State emails.
            </p>
            <Button onClick={confirm} className="rounded-full w-full">
              Confirm Unsubscribe
            </Button>
          </>
        )}

        {state === "submitting" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Unsubscribing…</p>
          </div>
        )}

        {state === "done" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">You've been unsubscribed.</p>
            <p className="text-sm text-muted-foreground">
              You won't receive any more emails from us.
            </p>
          </div>
        )}

        {state === "already" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Already unsubscribed</p>
            <p className="text-sm text-muted-foreground">
              This email is no longer on our list.
            </p>
          </div>
        )}

        {(state === "invalid" || state === "error") && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium">Link invalid or expired</p>
            <p className="text-sm text-muted-foreground">
              {errorMsg || "Please use the unsubscribe link from a recent email."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
