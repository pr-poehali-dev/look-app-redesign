import { useEffect } from "react";

export const useNotifySound = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    const audio = new Audio("/sfx/ding.mp3");
    audio.preload = "auto";
    audio.volume = 1;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "notify_sound") return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [enabled]);
};
