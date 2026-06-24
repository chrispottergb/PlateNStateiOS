import { isNative } from "./native";

let Preferences: typeof import("@capacitor/preferences").Preferences | null =
  null;

async function getPrefs() {
  if (!Preferences) {
    const mod = await import("@capacitor/preferences");
    Preferences = mod.Preferences;
  }
  return Preferences;
}

export const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isNative) return localStorage.getItem(key);
    const prefs = await getPrefs();
    const { value } = await prefs.get({ key });
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) {
      localStorage.setItem(key, value);
      return;
    }
    const prefs = await getPrefs();
    await prefs.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    if (!isNative) {
      localStorage.removeItem(key);
      return;
    }
    const prefs = await getPrefs();
    await prefs.remove({ key });
  },
};
