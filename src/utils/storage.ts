import { AndonCall, AndonLine, SoundConfig, AppTheme, AppLanguage } from "../types";
import { INITIAL_CALLS, INITIAL_LINES, DEFAULT_SOUND_CONFIG } from "./initialData";

const STORAGE_KEYS = {
  CALLS: "andon_smart_factory_calls_v1",
  LINES: "andon_smart_factory_lines_v1",
  SOUND_CONFIG: "andon_smart_factory_sound_v1",
  THEME: "andon_smart_factory_theme_v1",
  LANGUAGE: "andon_smart_factory_language_v1",
};

export function loadSavedTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === "dark" || saved === "light") return saved;
  } catch (e) {
    console.error("Failed to load theme:", e);
  }
  return "light"; // Default is Premium Light Theme
}

export function saveThemeToStorage(theme: AppTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {
    console.error("Failed to save theme:", e);
  }
}

export function loadSavedLanguage(): AppLanguage {
  if (typeof window === "undefined") return "id";
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved === "id" || saved === "en") return saved;
  } catch (e) {
    console.error("Failed to load language:", e);
  }
  return "id"; // Default is Bahasa Indonesia
}

export function saveLanguageToStorage(lang: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (e) {
    console.error("Failed to save language:", e);
  }
}

export function loadSavedCalls(): AndonCall[] {
  if (typeof window === "undefined") return INITIAL_CALLS;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CALLS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load calls:", e);
  }
  return INITIAL_CALLS;
}

export function saveCallsToStorage(calls: AndonCall[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(calls));
  } catch (e) {
    console.error("Failed to save calls:", e);
  }
}

export function loadSavedLines(): AndonLine[] {
  if (typeof window === "undefined") return INITIAL_LINES;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LINES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load lines:", e);
  }
  return INITIAL_LINES;
}

export function saveLinesToStorage(lines: AndonLine[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
  } catch (e) {
    console.error("Failed to save lines:", e);
  }
}

export function loadSoundConfig(): SoundConfig {
  if (typeof window === "undefined") return DEFAULT_SOUND_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_CONFIG);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load sound config:", e);
  }
  return DEFAULT_SOUND_CONFIG;
}

export function saveSoundConfig(config: SoundConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SOUND_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save sound config:", e);
  }
}

// Helpers
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function generateTicketNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `AND-${year}${month}${day}-${randomSuffix}`;
}
