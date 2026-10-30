import { createFileRoute } from "@tanstack/react-router";

// Вложенные пути админки рендерит родительский маршрут (/Olesya_Pavel_Nastya).
export const Route = createFileRoute("/Olesya_Pavel_Nastya/$")({
  ssr: false,
  component: () => null,
});
