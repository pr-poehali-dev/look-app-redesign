import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "following_handles_v1";
const EVENT_NAME = "following-change";

const readAll = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeAll = (list: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
};

export const useFollowing = (handle: string) => {
  const [following, setFollowing] = useState<boolean>(() => readAll().includes(handle));

  useEffect(() => {
    const sync = () => setFollowing(readAll().includes(handle));
    sync();
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [handle]);

  const toggle = useCallback(() => {
    const list = readAll();
    if (list.includes(handle)) {
      writeAll(list.filter(h => h !== handle));
    } else {
      writeAll([handle, ...list]);
    }
  }, [handle]);

  const follow = useCallback(() => {
    const list = readAll();
    if (!list.includes(handle)) writeAll([handle, ...list]);
  }, [handle]);

  const unfollow = useCallback(() => {
    writeAll(readAll().filter(h => h !== handle));
  }, [handle]);

  return { following, toggle, follow, unfollow };
};

export const useFollowingList = (): string[] => {
  const [list, setList] = useState<string[]>(readAll);
  useEffect(() => {
    const sync = () => setList(readAll());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
};
