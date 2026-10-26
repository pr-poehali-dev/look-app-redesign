import { useEffect } from "react";
import i18n from "@/i18n";

export const AutoTranslator = () => {
  useEffect(() => {
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail || "ru";
      try {
        localStorage.setItem("app_lang", detail);
      } catch {
        // ignore
      }
      i18n.changeLanguage(detail);
    };

    window.addEventListener("app-lang-change", handleCustom);
    return () => window.removeEventListener("app-lang-change", handleCustom);
  }, []);

  return null;
};

export default AutoTranslator;
