import { createContext, useContext, useState, ReactNode } from "react";

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

const UserMediaContext = createContext<UserMediaContextType | null>(null);

export const UserMediaProvider = ({ children }: { children: ReactNode }) => {
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);

  const addMedia = (file: File) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    const now = new Date();
    const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setUserVideos(s => [{ id: Date.now() + Math.random(), url, type, label }, ...s]);
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
