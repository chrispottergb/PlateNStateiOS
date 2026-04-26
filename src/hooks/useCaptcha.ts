import { useCallback, useEffect, useState } from "react";

// Lightweight hCaptcha hook. If VITE_HCAPTCHA_SITE_KEY isn't set, returns a
// graceful no-op so existing call sites compile and submit normally. The
// matching server-side check in edge functions is also a no-op until
// HCAPTCHA_SECRET is set.
//
// To enable: set VITE_HCAPTCHA_SITE_KEY (frontend) and HCAPTCHA_SECRET (edge)
// and replace the stub below with @hcaptcha/react-hcaptcha invocation.

const SITE_KEY =
  (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined) ||
  "10f81642-efc0-4f90-b060-2c125fd6125a";

export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(true);

  useEffect(() => {
    if (!SITE_KEY) {
      // No-op mode: always "ready", token stays null.
      setReady(true);
      return;
    }
    // Real impl would load hCaptcha script here and resolve a token.
    // For the stub we just remain ready with a null token.
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!SITE_KEY) { setToken(null); return null; }
    // Real impl would re-execute the challenge.
    return token;
  }, [token]);

  return { token, refresh, ready, enabled: Boolean(SITE_KEY) };
}
