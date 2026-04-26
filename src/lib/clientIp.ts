// Best-effort client IP discovery for per-IP rate limiting.
// Falls back to null silently — server still applies the per-user limit.
let cached: string | null | undefined = undefined;

export async function getClientIp(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (!res.ok) { cached = null; return null; }
    const data = await res.json();
    cached = (data?.ip as string) || null;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}
