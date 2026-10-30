import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { clearInstallPrompt, getInstallPrompt, onInstallPromptChange } from "@/lib/installPrompt";

const DISMISS_KEY = "look_install_banner_dismissed";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isYandex = () => /YaBrowser|YaApp/i.test(navigator.userAgent);
const isMobile = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

const InstallAppBanner = () => {
  const [canInstall, setCanInstall] = useState(!!getInstallPrompt());
  const [visible, setVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isMobile() || isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;
    const off = onInstallPromptChange(() => setCanInstall(!!getInstallPrompt()));
    const t = setTimeout(() => setVisible(true), 3000);
    return () => { off(); clearTimeout(t); };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    const ev = getInstallPrompt();
    if (ev) {
      await ev.prompt();
      await ev.userChoice.catch(() => null);
      clearInstallPrompt();
      setVisible(false);
      return;
    }
    setShowHint(true);
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[150] mx-auto max-w-md rounded-2xl bg-white p-3 shadow-xl border border-gray-200">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="Лоок" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black">Установите Лоок</p>
          <p className="text-xs text-gray-500">Быстрый запуск и уведомления о звонках</p>
        </div>
        {!showHint && (
          <button onClick={install} className="px-3 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-medium">
            Установить
          </button>
        )}
        <button onClick={dismiss} className="p-1" aria-label="Закрыть">
          <Icon name="X" size={18} className="text-gray-400" />
        </button>
      </div>
      {showHint && (
        <p className="mt-2 text-xs text-gray-600">
          {isIos()
            ? "Нажмите «Поделиться» в Safari, затем «На экран Домой»."
            : isYandex() && !canInstall
              ? "Откройте меню браузера (три полоски) и выберите «Добавить ярлык на рабочий стол» или «Добавить на гл. экран»."
              : canInstall
              ? "Нажмите «Установить» ещё раз."
              : "Откройте меню браузера ⋮ и выберите «Установить приложение» или «Добавить на главный экран»."}
        </p>
      )}
    </div>
  );
};

export default InstallAppBanner;
