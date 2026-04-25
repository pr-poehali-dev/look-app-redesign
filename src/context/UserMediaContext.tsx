import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UserVideo {
  id: number;
  url: string;
  type: "video" | "image";
  label: string;
}

interface UserMediaContextType {
  userVideos: UserVideo[];
  addMedia: (file: File) => Promise<void>;
  removeMedia: (id: number) => void;
  loading: boolean;
}

const UPLOAD_URL = "https://functions.poehali.dev/78967386-1bfb-4070-9bb3-549cc5c00de6";
const USER_VIDEOS_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const UserMediaContext = createContext<UserMediaContextType | null>(null);

export const UserMediaProvider = ({ userId, token, children }: { userId: string; token: string | null; children: ReactNode }) => {
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${USER_VIDEOS_URL}?user_id=${userId}`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.videos) setUserVideos(data.videos);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const addMedia = async (file: File) => {
    const type = file.type.startsWith("video") ? "video" : "image";
    const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
    const now = new Date();
    const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

    const blobUrl = URL.createObjectURL(file);
    const tempId = Date.now() + Math.random();
    setUserVideos(s => [{ id: tempId, url: blobUrl, type, label }, ...s]);

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
            category: type === "video" ? "humor" : "feed",
          }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.url) {
          setUserVideos(s => s.map(v => v.id === tempId ? { ...v, id: Number(data.id), url: data.url } : v));
        }
      } catch {
        // оставляем blob-версию
      }
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = (id: number) => {
    setUserVideos(s => s.filter(x => x.id !== id));
    fetch(USER_VIDEOS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: String(id), token, user_id: userId }),
    })
      .then(r => r.json())
      .then(raw => {
        const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        alert("DELETE response: " + JSON.stringify(d));
      })
      .catch(e => alert("removeMedia fetch error: " + e));
  };

  return (
    <UserMediaContext.Provider value={{ userVideos, addMedia, removeMedia, loading }}>
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