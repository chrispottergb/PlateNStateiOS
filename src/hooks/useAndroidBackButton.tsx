import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

type BackHandler = () => boolean | Promise<boolean>;
const handlers: BackHandler[] = [];

/**
 * Register a handler that runs on Android hardware back press.
 * Return `true` from the handler if it consumed the event (e.g. closed a modal).
 * Returns an unregister fn — call it on cleanup.
 */
export const registerBackHandler = (fn: BackHandler) => {
  handlers.unshift(fn); // most recently registered runs first
  return () => {
    const idx = handlers.indexOf(fn);
    if (idx >= 0) handlers.splice(idx, 1);
  };
};

/** Global Android back-button wiring. Mount once inside the Router. */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      return;
    }

    let remove: (() => void) | undefined;

    (async () => {
      const sub = await App.addListener("backButton", async () => {
        // 1) Let any registered overlay handler consume the event first.
        for (const h of [...handlers]) {
          try {
            const consumed = await h();
            if (consumed) return;
          } catch {
            // ignore individual handler errors
          }
        }

        // 2) Navigate back if we have in-app history.
        const atRoot = location.pathname === "/";
        if (!atRoot && window.history.length > 1) {
          navigate(-1);
          return;
        }

        // 3) At root — minimize instead of force-closing.
        try {
          await App.minimizeApp();
        } catch {
          // minimizeApp is Android-only and should always exist there; ignore otherwise.
        }
      });
      remove = () => sub.remove();
    })();

    return () => {
      remove?.();
    };
  }, [navigate, location.pathname]);
};
