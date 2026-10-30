import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPushSubscription, isPushSupported, subscribeToCallPush, unsubscribeFromPush } from "@/lib/pushSubscribe";

const PushToggle = () => {
  const { user } = useAuth();
  const supported = isPushSupported();
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(supported && Notification.permission === "denied");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    hasPushSubscription().then(setOn).catch(() => {});
  }, [supported]);

  if (!supported || !user) return null;

  const toggle = async () => {
    if (busy) return;
    if (denied) {
      toast.error("Уведомления выключены в телефоне. Откройте Настройки телефона → Приложения → этот сайт или браузер → Уведомления и включите их", { duration: 9000 });
      return;
    }
    setBusy(true);
    try {
      if (on) {
        await unsubscribeFromPush(String(user.id));
        setOn(false);
      } else {
        await subscribeToCallPush(String(user.id), user.name);
        if (Notification.permission === "denied") {
          setDenied(true);
          toast.error("Уведомления заблокированы в настройках браузера");
        } else {
          setOn(await hasPushSubscription());
        }
      }
    } catch {
      toast.error("Не удалось изменить настройку уведомлений");
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100">
      <div className="flex-1">
        <p className="text-black text-base md:text-sm">Push-уведомления</p>
        <p className="text-gray-400 text-xs">{denied ? "Выключены в настройках телефона. Нажмите, чтобы узнать, как включить" : "Сообщения и новости даже при закрытом сайте"}</p>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`relative w-12 h-6 md:w-10 md:h-5 rounded-full transition-colors duration-200 ${on ? "bg-[#8b5cf6]" : "bg-gray-300"} ${busy ? "opacity-60" : ""}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 md:w-4 md:h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-6 md:translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
};

export default PushToggle;
