import { isNative } from "./native";

// Hybrid storage: localStorage for synchronous Supabase reads,
// Capacitor Preferences for durable native persistence across app kills.
// On startup, we hydrate localStorage from Preferences so sessions survive restarts.

const PERSIST_PREFIX = "sb-";
const INDEX_KEY = "__persisted_keys";

async function persistToNative(key: string, value: string | null) {
  if (!isNative || !key.startsWith(PERSIST_PREFIX)) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    if (value === null) {
      await Preferences.remove({ key });
    } else {
      await Preferences.set({ key, value });
    }
    // Track which keys we've persisted so hydrate can restore them all
    const { value: idx } = await Preferences.get({ key: INDEX_KEY });
    const keys: string[] = idx ? JSON.parse(idx) : [];
    if (value === null) {
      const filtered = keys.filter(k => k !== key);
      await Preferences.set({ key: INDEX_KEY, value: JSON.stringify(filtered) });
    } else if (!keys.includes(key)) {
      keys.push(key);
      await Preferences.set({ key: INDEX_KEY, value: JSON.stringify(keys) });
    }
  } catch {
    // Native storage unavailable
  }
}

export async function hydrateFromNativeStorage() {
  if (!isNative) return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value: idx } = await Preferences.get({ key: INDEX_KEY });
    const keys: string[] = idx ? JSON.parse(idx) : [];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        const { value } = await Preferences.get({ key });
        if (value) localStorage.setItem(key, value);
      }
    }
  } catch {
    // First launch or Preferences unavailable
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
