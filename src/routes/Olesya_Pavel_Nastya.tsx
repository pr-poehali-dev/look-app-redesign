import { createFileRoute } from "@tanstack/react-router";
import { ClientApp } from "@/components/app/SeoFallback";

// Админка: вход хранится в localStorage — только браузерный рендер.
export const Route = createFileRoute("/Olesya_Pavel_Nastya")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: ClientApp,
});
