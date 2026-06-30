import { DEFAULT_SETTINGS, type GameSettings } from "@/types/game";

// Placeholder service. Replace with persistent storage / API later.
const STORAGE_KEY = "psc:settings";

export const settingsService = {
  load(): GameSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  save(settings: GameSettings) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },
};
