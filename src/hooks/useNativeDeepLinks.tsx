import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNative } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";

/**
 * Forwards URLs opened from outside the app (email links, Android App Links,
 * iOS Universal Links, custom schemes) into React Router so deep paths like
 * `/reset-password?code=...` actually render inside the Capacitor WebView
 * instead of leaving the user on a blank screen.
 */
export const useNativeDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");

        const closeBrowser = async () => {
          try { const { Browser } = await import("@capacitor/browser"); await Browser.close(); } catch {}
        };

        const handle = async (rawUrl: string) => {
          if (!rawUrl) return;
          try {
            // Custom scheme URLs (com.plateandstate.platenstate://callback#...)
            // can't be parsed by new URL() — extract hash/query manually
            const hashIdx = rawUrl.indexOf("#");
            const qIdx = rawUrl.indexOf("?");
            const hash = hashIdx >= 0 ? rawUrl.slice(hashIdx + 1) : "";
            const query = qIdx >= 0 ? rawUrl.slice(qIdx + 1, hashIdx >= 0 ? hashIdx : undefined) : "";

            const hashParams = new URLSearchParams(hash);
            const queryParams = new URLSearchParams(query);

            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              await closeBrowser();
              navigate("/", { replace: true });
              return;
            }

            // Checkout bounce-back: com.plateandstate.platenstate://return?to=<encoded path>
            // (sent by platenstate.com/checkout-return after Stripe payment)
            const returnTo = queryParams.get("to");
            if (returnTo && rawUrl.includes("://return")) {
              await closeBrowser();
              navigate(decodeURIComponent(returnTo), { replace: true });
              return;
            }

            const code = queryParams.get("code") || hashParams.get("code");
            if (code) {
              await supabase.auth.exchangeCodeForSession(code).catch(() => {});
              await closeBrowser();
              navigate("/", { replace: true });
              return;
            }

            // Fall back to standard URL parsing for http(s) deep links
            const u = new URL(rawUrl);
            const path = u.pathname || "/";
            const target = `${path}${u.search || ""}${u.hash || ""}`;

            if (target && target !== window.location.pathname + window.location.search + window.location.hash) {
              navigate(target, { replace: true });
            }
          } catch {
            // Custom-scheme URLs that aren't valid http(s) — try a loose parse.
            const idx = rawUrl.indexOf("/reset-password");
            if (idx >= 0) navigate(rawUrl.slice(idx), { replace: true });
          }
        };

        const listener = await App.addListener("appUrlOpen", (event) => {
          handle(event?.url ?? "");
        });
        if (cancelled) listener.remove();
        else sub = listener;

        // If the app was cold-started from a URL, route to it now.
        try {
          const launch = await App.getLaunchUrl();
          if (launch?.url) handle(launch.url);
        } catch { /* ignore */ }
      } catch {
        /* @capacitor/app missing — no-op */
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [navigate]);
};
