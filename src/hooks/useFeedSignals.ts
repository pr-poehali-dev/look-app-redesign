import { useCallback, useEffect, useState } from "react";
import { getGuestId } from "@/lib/guestId";

const SIGNALS_URL = "https://functions.poehali.dev/25a02f3d-0647-4142-999d-f84cb6302dd5";
const STORAGE_KEY = "hidden_authors_v1";
const EVENT_NAME = "hidden-authors-change";

const getUserId = (): string => {
  try {
    return localStorage.getItem("user_id") || getGuestId();
  } catch {
    return getGuestId();
  }
};

const readLocal = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocal = (list: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch { /* ignore */ }
};

export const trackVideoView = (opts: { videoId: number; watchSeconds: number; duration: number; completed?: boolean; repeatCount?: number }) => {
  const userId = getUserId();
  if (!opts.videoId || opts.watchSeconds < 0.5) return;
  fetch(SIGNALS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({
      action: "view",
      video_id: opts.videoId,
      watch_seconds: opts.watchSeconds,
      duration: opts.duration,
      completed: !!opts.completed,
      repeat_count: opts.repeatCount || 0,
    }),
  }).catch(() => { /* ignore */ });
};

export const markNotInterested = (videoId: number) => {
  const userId = getUserId();
  if (!videoId) return Promise.resolve();
  return fetch(SIGNALS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ action: "not_interested", video_id: videoId }),
  }).catch(() => { /* ignore */ });
};

export const hideAuthor = (handle: string) => {
  const userId = getUserId();
  const norm = (handle || "").trim().replace(/^@/, "").toLowerCase();
  if (!norm) return Promise.resolve();
  writeLocal([...new Set([...readLocal(), norm])]);
  return fetch(SIGNALS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ action: "hide_author", handle: norm }),
  }).catch(() => { /* ignore */ });
};

export const unhideAuthor = (handle: string) => {
  const userId = getUserId();
  const norm = (handle || "").trim().replace(/^@/, "").toLowerCase();
  if (!norm) return Promise.resolve();
  writeLocal(readLocal().filter(h => h !== norm));
  return fetch(SIGNALS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ action: "unhide_author", handle: norm }),
  }).catch(() => { /* ignore */ });
};

export const useHiddenAuthors = (): string[] => {
  const [list, setList] = useState<string[]>(readLocal);

  useEffect(() => {
    const sync = () => setList(readLocal());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return list;
};
