import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface UserVideo {
  id: number;
  url: string;
  type: "video" | "image";
  label: string;
}

interface UserMediaContextType {
  userVideos: UserVideo[];
  addMedia: (file: File) => void;
  removeMedia: (id: number) => void;
}

const STORAGE_KEY = "user_media_v1";

const loadFromStorage = (): UserVideo[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (videos: UserVideo[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  } catch {
    // localStorage может быть переполнен — молча игнорируем
  }
};

const UserMediaContext = createContext<UserMediaContextType | null>(null);

export const UserMediaProvider = ({ children }: { children: ReactNode }) => {
  const [userVideos, setUserVideos] = useState<UserVideo[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(userVideos);
  }, [userVideos]);

  const addMedia = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string; // base64 data URL
      const type = file.type.startsWith("video") ? "video" : "image";
      const now = new Date();
      const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      setUserVideos(s => [{ id: Date.now() + Math.random(), url, type, label }, ...s]);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = (id: number) => {
    setUserVideos(s => s.filter(x => x.id !== id));
  };

  return (
    <UserMediaContext.Provider value={{ userVideos, addMedia, removeMedia }}>
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
