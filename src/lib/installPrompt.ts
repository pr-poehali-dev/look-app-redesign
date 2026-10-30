export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALLED_KEY = "look_app_installed";

export const isRunningStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

export const markInstalled = () => {
  try { localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* ignore */ }
};

export const isAppInstalled = () => {
  if (isRunningStandalone()) {
    markInstalled();
    return true;
  }
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export const initInstallPrompt = () => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  if (isRunningStandalone()) markInstalled();
  window.addEventListener("appinstalled", () => {
    markInstalled();
    deferred = null;
    listeners.forEach((fn) => fn());
  });
};

export const getInstallPrompt = () => deferred;

export const clearInstallPrompt = () => {
  deferred = null;
  listeners.forEach((fn) => fn());
};

export const onInstallPromptChange = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
