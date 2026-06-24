import { isNative } from "./native";

// Hybrid storage: localStorage for synchronous Supabase reads,
// Capacitor Preferences for durable native persistence across app kills.
// On startup, we hydrate localStorage from Preferences so sessions survive restarts.

const SUPABASE_KEY = "sb-qcnhusvxygyczbnmbyvd-auth-token";

async function persistToNative(key: string, value: string | null) {
  if (!isNative) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (value === null) {
      await Preferences.remove({ key });
    } else {
      await Preferences.set({ key, value });
    }
  } catch {
    // Native storage unavailable — localStorage is still the fallback
  }
}

export async function hydrateFromNativeStorage() {
  if (!isNative) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: SUPABASE_KEY });
    if (value && !localStorage.getItem(SUPABASE_KEY)) {
      localStorage.setItem(SUPABASE_KEY, value);
    }
  } catch {
    // First launch or Preferences unavailable — nothing to hydrate
  }
}

export const capacitorStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    persistToNative(key, value);
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
    persistToNative(key, null);
  },
};
