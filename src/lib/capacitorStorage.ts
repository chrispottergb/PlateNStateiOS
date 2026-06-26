import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// On a Capacitor iOS/Android WKWebView, localStorage is NOT durable — the OS can
// evict it under storage pressure or across app updates, which silently logs users
// out. On native we back the Supabase session with @capacitor/preferences (durable
// native storage) instead. On web we keep using localStorage.
const isNative = Capacitor.isNativePlatform();

// Supabase's storage interface is synchronous, but Preferences is async. We mirror
// native storage into this in-memory cache at boot (see hydrateFromNativeStorage,
// which main.tsx awaits before rendering) so synchronous reads work, and write
// through to Preferences on every change.
const cache = new Map<string, string>();

export async function hydrateFromNativeStorage(): Promise<void> {
  if (!isNative) return;
  try {
    // Load everything already persisted in native storage into the cache.
    const { keys } = await Preferences.keys();
    await Promise.all(
      keys.map(async (key) => {
        const { value } = await Preferences.get({ key });
        if (value != null) cache.set(key, value);
      }),
    );

    // One-time migration: move any existing session from the old localStorage
    // backing into Preferences so users who are already logged in stay logged in.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || cache.has(key)) continue;
      const value = localStorage.getItem(key);
      if (value == null) continue;
      cache.set(key, value);
      void Preferences.set({ key, value });
    }
  } catch {
    // If native storage is unavailable, fall back to localStorage-only behavior.
  }
}

export const capacitorStorage = {
  getItem(key: string): string | null {
    if (isNative) return cache.has(key) ? cache.get(key)! : null;
    return localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    if (isNative) {
      cache.set(key, value);
      void Preferences.set({ key, value }); // durable write-through
      return;
    }
    localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (isNative) {
      cache.delete(key);
      void Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  },
};
