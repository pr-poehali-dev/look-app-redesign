import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface UnreadContextValue {
  totalUnread: number;
  refresh: () => void;
}

const UnreadContext = createContext<UnreadContextValue>({ totalUnread: 0, refresh: () => {} });

export const UnreadProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = () => {
    if (!user) { setTotalUnread(0); return; }
    fetch(`${CHAT_API}?module=chat&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        const total = (data.chats || []).reduce((sum: number, c: { unread?: number }) => sum + (c.unread || 0), 0);
        setTotalUnread(total);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) { setTotalUnread(0); return; }
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);

  return (
    <UnreadContext.Provider value={{ totalUnread, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => useContext(UnreadContext);

export default UnreadProvider;
