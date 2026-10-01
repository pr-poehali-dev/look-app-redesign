import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGuestId } from "@/lib/guestId";

const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

const syncSaveToServer = (type: string, id: number | string, userId: string, saved: boolean) => {
  fetch(`${COMMENTS_URL}?action=saves`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ target_type: type, target_id: String(id), saved }),
  }).catch(() => {});
};

export type SavedItemType = "post" | "video";

export interface SavedItem {
  type: SavedItemType;
  id: number | string;
  image: string;
  title?: string;
  handle?: string;
  views?: number;
  savedAt: number;
  folder?: string;
}

export const DEFAULT_FOLDER = "Общее";
const STORAGE_KEY = "saved_items_v1";
const FOLDERS_KEY = "saved_folders_v1";
const EVENT_NAME = "saved-items-change";

const readFolders = (): string[] => {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFolders = (folders: string[]) => {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
};

const readAll = (): SavedItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (items: SavedItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
};

const keyOf = (type: SavedItemType, id: number | string) => `${type}:${id}`;

export const isSavedNow = (type: SavedItemType, id: number | string) => {
  return readAll().some(it => keyOf(it.type, it.id) === keyOf(type, id));
};

export const useSavedItem = (type: SavedItemType, id: number | string, payload: Omit<SavedItem, "type" | "id" | "savedAt">) => {
  const { user } = useAuth();
  const [saved, setSaved] = useState<boolean>(() => isSavedNow(type, id));

  useEffect(() => {
    const sync = () => setSaved(isSavedNow(type, id));
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [type, id]);

  const toggle = useCallback(() => {
    const all = readAll();
    const k = keyOf(type, id);
    const exists = all.find(it => keyOf(it.type, it.id) === k);
    const userId = user?.id || getGuestId();
    if (exists) {
      writeAll(all.filter(it => keyOf(it.type, it.id) !== k));
      syncSaveToServer(type, id, userId, false);
    } else {
      writeAll([{ type, id, savedAt: Date.now(), ...payload }, ...all]);
      syncSaveToServer(type, id, userId, true);
    }
  }, [type, id, payload, user?.id]);

  return { saved, toggle };
};

export const useSavedList = (): SavedItem[] => {
  const [items, setItems] = useState<SavedItem[]>(readAll);

  useEffect(() => {
    const sync = () => setItems(readAll());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return items;
};

export const useSavedFolders = () => {
  const [folders, setFolders] = useState<string[]>(readFolders);
  const [items, setItems] = useState<SavedItem[]>(readAll);

  useEffect(() => {
    const sync = () => { setFolders(readFolders()); setItems(readAll()); };
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const createFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const all = readFolders();
    if (all.includes(trimmed)) return;
    writeFolders([...all, trimmed]);
  }, []);

  const deleteFolder = useCallback((name: string) => {
    if (name === DEFAULT_FOLDER) return;
    writeFolders(readFolders().filter(f => f !== name));
    const allItems = readAll().map(it => it.folder === name ? { ...it, folder: DEFAULT_FOLDER } : it);
    writeAll(allItems);
  }, []);

  const moveToFolder = useCallback((type: SavedItemType, id: number | string, folder: string) => {
    const k = keyOf(type, id);
    const all = readAll().map(it => keyOf(it.type, it.id) === k ? { ...it, folder } : it);
    writeAll(all);
  }, []);

  const allFolders = [DEFAULT_FOLDER, ...folders.filter(f => f !== DEFAULT_FOLDER)];
  const itemsByFolder = (folder: string) => items.filter(it => (it.folder || DEFAULT_FOLDER) === folder);

  return { folders: allFolders, items, createFolder, deleteFolder, moveToFolder, itemsByFolder };
};