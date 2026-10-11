import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const OfflineBanner = () => {
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const off = () => setOffline(true);
    const on = () => setOffline(false);
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 text-black text-xs font-medium py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
      <Icon name="WifiOff" size={14} />
      Нет соединения. Ждём сеть, всё продолжится автоматически
    </div>
  );
};

export default OfflineBanner;
