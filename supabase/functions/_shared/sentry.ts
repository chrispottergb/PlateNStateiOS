// Edge Sentry stub. Activates only when SENTRY_DSN is set.
// Uses dynamic import so cold-start cost is zero in the unconfigured state.

let captured: ((err: unknown) => void) | null = null;

export async function initSentry() {
  if (captured) return;
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) {
    captured = () => {}; // permanent no-op
    return;
  }
  try {
    // @ts-ignore esm.sh dynamic import
    const Sentry = await import("https://esm.sh/@sentry/deno@8.40.0");
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    captured = (err: unknown) => Sentry.captureException(err);
  } catch (e) {
    console.warn("[sentry] failed to init, skipping", e);
    captured = () => {};
  }
}

export async function captureException(err: unknown) {
  await initSentry();
  captured?.(err);
}

// Lightweight hCaptcha verifier. If HCAPTCHA_SECRET is unset, returns true
// (skip) and logs a warning — letting the app ship before keys are issued.
export async function verifyCaptcha(token: string | null | undefined): Promise<boolean> {
  const secret = Deno.env.get("HCAPTCHA_SECRET");
  if (!secret) {
    console.warn("[captcha] HCAPTCHA_SECRET not set — skipping verification");
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const r = await fetch("https://hcaptcha.com/siteverify", { method: "POST", body });
    const j = await r.json();
    return Boolean(j?.success);
  } catch (e) {
    console.error("[captcha] verify failed", e);
    return false;
  }
}

// Pull first IP from x-forwarded-for, with cf-connecting-ip fallback.
export function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip") || null;
}
