import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

const SENTRY_DSN =
  (import.meta.env.VITE_SENTRY_DSN as string | undefined) ||
  "https://1d165f2133f4bf6041e6f57df4d5e85a@o4511284186251264.ingest.us.sentry.io/4511284289536000";
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.1,
    // Only propagate trace headers to our own Supabase project — not third-party CDNs
    tracePropagationTargets: [/^https:\/\/diaydeyqbcseufpbwpki\.supabase\.co/],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [
      "AuthApiError",
      "AuthSessionMissingError",
      "Invalid Refresh Token",
      "Refresh Token Not Found",
      "Auth session missing",
    ],
    beforeSend(event, hint) {
      const err = hint?.originalException as any;
      const name = err?.name || "";
      const code = err?.code || "";
      const msg = String(err?.message || event.message || "");
      if (
        code === "refresh_token_not_found" ||
        name === "AuthSessionMissingError" ||
        (name === "AuthApiError" && /Refresh Token/i.test(msg)) ||
        /Invalid Refresh Token|Refresh Token Not Found|Auth session missing/i.test(msg)
      ) {
        return null;
      }
      return event;
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
