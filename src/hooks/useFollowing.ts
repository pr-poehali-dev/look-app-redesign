import { useCallback, useEffect, useState } from "react";

const FOLLOWS_URL = "https://functions.poehali.dev/791bdb8d-0cb7-40b2-8a0c-e4a84b213fbc";
const STORAGE_KEY = "following_handles_v1";
const EVENT_NAME = "following-change";

let cache: string[] = [];
let loaded = false;
let loadingPromise: Promise<void> | null = null;

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
  } catch { /* ignore */ }
};

const getUserId = (): string | null => {
  try {
    return localStorage.getItem("user_id");
  } catch {
    return null;
  }
};

const normHandle = (h: string): string => (h || "").trim().replace(/^@/, "").toLowerCase();

const getMyHandle = (): string => {
  try {
    return normHandle(localStorage.getItem("user_handle") || "");
  } catch {
    return "";
  }
};

const emit = () => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

const setCache = (list: string[]) => {
  cache = list;
  writeLocal(list);
  emit();
};

const ensureLoaded = (): Promise<void> => {
  if (loaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  cache = readLocal();
  const userId = getUserId();
  if (!userId) {
    loaded = true;
    return Promise.resolve();
  }
  loadingPromise = fetch(`${FOLLOWS_URL}?action=list_following`, {
    headers: { "X-User-Id": userId },
  })
    .then(r => r.json())
    .then(raw => {
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (Array.isArray(data.handles)) setCache(data.handles);
    })
    .catch(() => { /* keep local */ })
    .finally(() => { loaded = true; loadingPromise = null; });
  return loadingPromise;
};

const apiFollow = (handle: string) => {
  const userId = getUserId();
  if (!userId) return Promise.resolve();
  return fetch(FOLLOWS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ action: "follow", handle }),
  }).catch(() => {});
};

const apiUnfollow = (handle: string) => {
  const userId = getUserId();
  if (!userId) return Promise.resolve();
  return fetch(FOLLOWS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ action: "unfollow", handle }),
  }).catch(() => {});
};

export const useFollowing = (handle: string) => {
  const isSelf = normHandle(handle) !== "" && normHandle(handle) === getMyHandle();
  const [following, setFollowing] = useState<boolean>(() => cache.includes(handle) || readLocal().includes(handle));

  useEffect(() => {
    ensureLoaded().then(() => setFollowing(cache.includes(handle)));
    const sync = () => setFollowing(cache.includes(handle));
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [handle]);

  const follow = useCallback(() => {
    if (isSelf) return;
    if (cache.includes(handle)) return;
    setCache([handle, ...cache]);
    apiFollow(handle);
  }, [handle, isSelf]);

  const unfollow = useCallback(() => {
    if (!cache.includes(handle)) return;
    setCache(cache.filter(h => h !== handle));
    apiUnfollow(handle);
  }, [handle]);

  const toggle = useCallback(() => {
    if (isSelf) return;
    if (cache.includes(handle)) unfollow();
    else follow();
  }, [handle, isSelf, follow, unfollow]);

  return { following, toggle, follow, unfollow, isSelf };
};

export const useFollowingList = (): string[] => {
  const [list, setList] = useState<string[]>(() => (cache.length ? cache : readLocal()));

  useEffect(() => {
    ensureLoaded().then(() => setList([...cache]));
    const sync = () => setList([...cache]);
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return list;
};

export const useFollowerCount = (handle: string): number => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    const fetchCount = () => {
      const userId = getUserId();
      fetch(`${FOLLOWS_URL}?action=counts&handle=${encodeURIComponent(handle)}`, {
        headers: userId ? { "X-User-Id": userId } : {},
      })
        .then(r => r.json())
        .then(raw => {
          const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          if (!cancelled && typeof data.followers === "number") setCount(data.followers);
        })
        .catch(() => {});
    };
    fetchCount();
    const onChange = () => fetchCount();
    window.addEventListener(EVENT_NAME, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, onChange);
    };
  }, [handle]);
  return count;
};