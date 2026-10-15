const PREFIX = "fc1_";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const readFeedCache = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, d } = JSON.parse(raw);
    if (Date.now() - t > MAX_AGE_MS) return null;
    return d as T;
  } catch {
    return null;
  }
};

export const writeFeedCache = (key: string, data: unknown) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), d: data }));
  } catch {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }
};
