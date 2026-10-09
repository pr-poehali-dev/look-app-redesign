import { useCallback, useEffect, useState } from "react";

const KEY = "muted_authors";
const EVENT = "muted-authors-changed";

const read = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

export const useMutedAuthor = (handle: string) => {
  const [muted, setMuted] = useState(() => read().includes(handle));

  useEffect(() => {
    const sync = () => setMuted(read().includes(handle));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [handle]);

  const toggle = useCallback(() => {
    const list = read();
    const next = list.includes(handle) ? list.filter((h) => h !== handle) : [handle, ...list];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return next.includes(handle);
  }, [handle]);

  return { muted, toggle };
};
