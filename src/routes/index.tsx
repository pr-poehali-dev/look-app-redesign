import { createFileRoute } from "@tanstack/react-router";
import { ClientApp } from "@/components/app/SeoFallback";

export const Route = createFileRoute("/")({
  component: ClientApp,
});
