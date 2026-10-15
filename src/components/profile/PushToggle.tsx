import { useEffect, useState } from "react";
import { toast } from "sonner";

interface OneSignalApi {
  Notifications: { permission: boolean; requestPermission: () => Promise<void> };
  User: { PushSubscription: { optedIn?: boolean; optIn: () => Promise<void>; optOut: () => Promise<void> } };
}

const run = (fn: (os: OneSignalApi) => Promise<void>) => {
  const w = window as unknown as { OneSignalDeferred?: Array<(os: OneSignalApi) => Promise<void>> };
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(fn);
};

const PushToggle = () => {
  const supported = typeof Notification !== "undefined";
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(supported && Notification.permission === "denied");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    run(async (os) => {
      setOn(!!os.Notifications.permission && !!os.User.PushSubscription.optedIn);
    });
  }, [supported]);

  if (!supported) return null;

  const toggle = () => {
    if (busy) return;
    if (denied) {
      toast.error("Уведомления заблокированы в настройках браузера. Разрешите их для этого сайта");
      return;
    }
    setBusy(true);
    run(async (os) => {
      try {
        if (on) {
          await os.User.PushSubscription.optOut();
          setOn(false);
        } else {
          if (!os.Notifications.permission) await os.Notifications.requestPermission();
          if (Notification.permission === "denied") {
            setDenied(true);
            toast.error("Уведомления заблокированы в настройках браузера");
          } else if (os.Notifications.permission) {
            await os.User.PushSubscription.optIn();
            setOn(true);
          }
        }
      } catch {
        toast.error("Не удалось изменить настройку уведомлений");
      }
      setBusy(false);
    });
  };

  return (
    <div className="flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100">
      <div className="flex-1">
        <p className="text-black text-base md:text-sm">Push-уведомления</p>
        <p className="text-gray-400 text-xs">{denied ? "Заблокированы в браузере" : "Сообщения и новости даже при закрытом сайте"}</p>
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
