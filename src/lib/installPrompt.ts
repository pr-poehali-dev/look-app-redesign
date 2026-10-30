export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export const initInstallPrompt = () => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
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
