import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clearInstallPrompt, getInstallPrompt, onInstallPromptChange } from "@/lib/installPrompt";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const InstallAppRow = () => {
  const [, setTick] = useState(0);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => onInstallPromptChange(() => setTick((n) => n + 1)), []);

  if (installed) return null;

  const install = async () => {
    const ev = getInstallPrompt();
    if (ev) {
      await ev.prompt();
      const choice = await ev.userChoice.catch(() => null);
      clearInstallPrompt();
      if (choice?.outcome === "accepted") setInstalled(true);
      return;
    }
    toast.info(
      isIos()
        ? "Нажмите «Поделиться» в Safari, затем «На экран Домой»"
        : "Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран»"
    );
  };

  return (
    <div className="flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100">
      <div className="flex-1">
        <p className="text-black text-base md:text-sm">Установить приложение</p>
        <p className="text-gray-400 text-xs">Быстрый запуск и звонки при закрытом сайте</p>
      </div>
      <button onClick={install} className="px-3 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium">
        Установить
      </button>
    </div>
  );
};

export default InstallAppRow;
