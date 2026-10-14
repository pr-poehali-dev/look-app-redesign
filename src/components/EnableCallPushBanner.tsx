import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { subscribeToCallPush } from "@/lib/pushSubscribe";

interface Props {
  userId: string;
  userName: string;
}

const DISMISS_KEY = "look_push_banner_dismissed";

const EnableCallPushBanner = ({ userId, userName }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      subscribeToCallPush(userId, userName).catch(() => {});
      return;
    }
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [userId, userName]);

  if (!visible) return null;

  const enable = async () => {
    setVisible(false);
    await subscribeToCallPush(userId, userName).catch(() => {});
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed top-3 left-3 right-3 z-[200] mx-auto max-w-md rounded-2xl bg-white p-3 shadow-xl border border-gray-200 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#8b5cf6] flex items-center justify-center flex-shrink-0">
        <Icon name="PhoneIncoming" size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black">Уведомления о звонках</p>
        <p className="text-xs text-gray-500">Чтобы слышать звонок, когда приложение закрыто</p>
      </div>
      <button onClick={enable} className="px-3 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium">
        Включить
      </button>
      <button onClick={dismiss} className="p-1" aria-label="Закрыть">
        <Icon name="X" size={18} className="text-gray-400" />
      </button>
    </div>
  );
};

export default EnableCallPushBanner;
