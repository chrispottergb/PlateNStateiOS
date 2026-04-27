import { useCallback, useRef, useState, forwardRef, useImperativeHandle } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

/**
 * Invisible hCaptcha integration.
 *
 * Usage:
 *   const captcha = useCaptcha();
 *   ...
 *   <CaptchaWidget ref={captcha.ref} onVerify={captcha.onVerify} />
 *   ...
 *   const token = await captcha.execute();
 *   supabase.functions.invoke("scan-plate", { body: { ..., captcha_token: token } });
 *
 * If VITE_HCAPTCHA_SITE_KEY is unset, execute() resolves null and the widget
 * renders nothing — every edge function treats a missing secret as "skip".
 */

const SITE_KEY =
  (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined) ||
  "10f81642-efc0-4f90-b060-2c125fd6125a";

export const ENABLED = Boolean(SITE_KEY);

type ResolveFn = (token: string | null) => void;

export function useCaptcha() {
  const ref = useRef<HCaptcha | null>(null);
  const pendingRef = useRef<ResolveFn | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const onVerify = useCallback((token: string) => {
    setLastToken(token);
    pendingRef.current?.(token);
    pendingRef.current = null;
  }, []);

  const onExpire = useCallback(() => {
    setLastToken(null);
  }, []);

  const onError = useCallback(() => {
    pendingRef.current?.(null);
    pendingRef.current = null;
  }, []);

  const execute = useCallback((): Promise<string | null> => {
    if (!ENABLED) return Promise.resolve(null);
    if (!ref.current) return Promise.resolve(null);

    return new Promise<string | null>((resolve) => {
      pendingRef.current = resolve;
      try {
        ref.current?.execute();
      } catch {
        pendingRef.current = null;
        resolve(null);
      }
      // Safety timeout — if no callback in 20s, resolve null
      setTimeout(() => {
        if (pendingRef.current === resolve) {
          pendingRef.current = null;
          resolve(null);
        }
      }, 20_000);
    });
  }, []);

  return {
    ref,
    execute,
    token: lastToken,
    enabled: ENABLED,
    siteKey: SITE_KEY,
    onVerify,
    onExpire,
    onError,
  };
}

interface CaptchaWidgetProps {
  captcha: ReturnType<typeof useCaptcha>;
}

/**
 * Invisible hCaptcha widget. Mount once per form. Triggered via captcha.execute().
 */
export const CaptchaWidget = forwardRef<HCaptcha, CaptchaWidgetProps>(
  ({ captcha }, fwdRef) => {
    useImperativeHandle(fwdRef, () => captcha.ref.current as HCaptcha);
    if (!captcha.enabled) return null;
    return (
      <HCaptcha
        ref={captcha.ref}
        sitekey={captcha.siteKey!}
        size="invisible"
        onVerify={captcha.onVerify}
        onExpire={captcha.onExpire}
        onError={captcha.onError}
      />
    );
  }
);
CaptchaWidget.displayName = "CaptchaWidget";
