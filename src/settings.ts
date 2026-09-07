import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  autoUnlock: true,
  ocrEnabled: false,
  ocrLanguage: "eng",
  saveHistory: false,
  theme: "system"
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(stored.settings ?? {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export function applyTheme(theme: Settings["theme"]): void {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", dark);
}