import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const NOTIFICATIONS_URL = "https://functions.poehali.dev/8ae7d03e-5a18-4ff2-87f1-69f512fbacc3";

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  is_read: boolean;
  created_at?: string | null;
}

const parseBody = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

/** Счётчик непрочитанных уведомлений — лёгкий поллинг для колокольчика в шапке/профиле. */
export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    if (!user?.id) { setCount(0); return; }
    fetch(`${NOTIFICATIONS_URL}?action=unread_count`, { headers: { "X-User-Id": user.id } })
      .then(parseBody)
      .then((data) => setCount(data.count || 0))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) { setCount(0); return; }
    refresh();
    intervalRef.current = setInterval(refresh, 20000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user?.id, refresh]);

  return { count, refresh };
};

/** Список уведомлений пользователя + отметка прочитанными. */
export const useNotificationsList = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!user?.id) { setNotifications([]); return; }
    setLoading(true);
    fetch(`${NOTIFICATIONS_URL}?action=list`, { headers: { "X-User-Id": user.id } })
      .then(parseBody)
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const markRead = useCallback(async (id: number) => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await fetch(`${NOTIFICATIONS_URL}?action=mark_read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await fetch(`${NOTIFICATIONS_URL}?action=mark_all_read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
    }).catch(() => {});
  }, [user?.id]);

  return { notifications, loading, refresh, markRead, markAllRead };
};
