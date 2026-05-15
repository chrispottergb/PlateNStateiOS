import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNative } from "@/lib/native";

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

        const handle = (rawUrl: string) => {
          if (!rawUrl) return;
          try {
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
