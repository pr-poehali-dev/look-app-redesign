import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UserVideo {
  id: number;
  url: string;
  thumb?: string;
  thumbnail?: string;
  type: "video" | "image";
  label: string;
  description?: string;
  hashtags?: string;
  author?: string;
  handle?: string;
  category?: string;
  likes?: string;
  comments?: string;
  shares?: string;
}

export interface UploadOptions {
  description?: string;
  hashtags?: string;
  category?: string;
}

interface UserMediaContextType {
  userVideos: UserVideo[];
  addMedia: (file: File, opts?: UploadOptions) => Promise<void>;
  removeMedia: (id: number) => void;
  refreshMedia: () => Promise<void>;
  loading: boolean;
  removedIds: Set<number>;
  mediaVersion: number;
}

const UPLOAD_URL = "https://functions.poehali.dev/78967386-1bfb-4070-9bb3-549cc5c00de6";
const USER_VIDEOS_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const UserMediaContext = createContext<UserMediaContextType | null>(null);

export const UserMediaProvider = ({ userId, token, children }: { userId: string; token: string | null; children: ReactNode }) => {
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [mediaVersion, setMediaVersion] = useState(0);

  const refreshMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${USER_VIDEOS_URL}?user_id=${userId}`);
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.videos) {
        setUserVideos(data.videos);
        setMediaVersion(v => v + 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    refreshMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const addMedia = async (file: File, opts?: UploadOptions) => {
    const type = file.type.startsWith("video") ? "video" : "image";
    const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const now = new Date();
    const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    const description = opts?.description || "";
    const hashtags = opts?.hashtags || "";
    const category = opts?.category || (type === "video" ? "humor" : "feed");

    const blobUrl = URL.createObjectURL(file);
    const tempId = Date.now() + Math.random();
    setUserVideos(s => [{ id: tempId, url: blobUrl, type, label, description, hashtags, category }, ...s]);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64,
            type: file.type,
            ext,
            user_id: userId,
            category,
            description,
            hashtags,
          }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.url) {
          setUserVideos(s => s.map(v => v.id === tempId ? { ...v, id: Number(data.id), url: data.url, description, hashtags, category } : v));
          setMediaVersion(v => v + 1);
        }
      } catch {
        // оставляем blob-версию
      }
    };
    reader.readAsDataURL(file);
    setMediaVersion(v => v + 1);
  };

  const removeMedia = (id: number) => {
    setUserVideos(s => s.filter(x => x.id !== id));
    setRemovedIds(s => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
    setMediaVersion(v => v + 1);
    fetch(USER_VIDEOS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: String(id), token, user_id: userId }),
    })
      .then(r => r.json())
      .catch(() => {});
  };

  return (
    <UserMediaContext.Provider value={{ userVideos, addMedia, removeMedia, refreshMedia, loading, removedIds, mediaVersion }}>
      {children}
    </UserMediaContext.Provider>
  );
};

export const useUserMedia = () => {
  const ctx = useContext(UserMediaContext);
  if (!ctx) throw new Error("useUserMedia must be used within UserMediaProvider");
  return ctx;
};

export default UserMediaContext;