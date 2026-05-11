import { useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

const GT_LANG_MAP: Record<string, string> = {
  ru: "ru",
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  zh: "zh-CN",
};

const setGoogleTranslateCookie = (lang: string) => {
  const value = `/ru/${lang}`;
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  const opts = `expires=${expires.toUTCString()};path=/`;
  document.cookie = `googtrans=${value};${opts}`;
  const host = window.location.hostname;
  if (host && host !== "localhost") {
    document.cookie = `googtrans=${value};${opts};domain=${host}`;
    const parts = host.split(".");
    if (parts.length >= 2) {
      const root = parts.slice(-2).join(".");
      document.cookie = `googtrans=${value};${opts};domain=.${root}`;
    }
  }
};

const removeGoogleTranslateCookie = () => {
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  document.cookie = `googtrans=;${expired}`;
  const host = window.location.hostname;
  if (host && host !== "localhost") {
    document.cookie = `googtrans=;${expired};domain=${host}`;
    const parts = host.split(".");
    if (parts.length >= 2) {
      const root = parts.slice(-2).join(".");
      document.cookie = `googtrans=;${expired};domain=.${root}`;
    }
  }
};

const loadGoogleTranslate = () => {
  if (!document.getElementById("google_translate_element")) {
    const div = document.createElement("div");
    div.id = "google_translate_element";
    div.style.display = "none";
    document.body.appendChild(div);
  }

  if (document.getElementById("google-translate-script")) return;

  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return;
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "ru",
        includedLanguages: "en,de,fr,es,zh-CN,ru",
        autoDisplay: false,
        layout: 0,
      },
      "google_translate_element"
    );
  };

  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
};

const hideGoogleUI = () => {
  if (document.getElementById("gt-style")) return;
  const style = document.createElement("style");
  style.id = "gt-style";
  style.textContent = `
    .goog-te-banner-frame, .skiptranslate, #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
    body { top: 0 !important; position: static !important; }
    .goog-tooltip, .goog-tooltip:hover { display: none !important; }
    .goog-text-highlight { background: none !important; box-shadow: none !important; }
    #google_translate_element { display: none !important; }
    iframe.goog-te-menu-frame { display: none !important; }
    font[style] { background: transparent !important; box-shadow: none !important; }
  `;
  document.head.appendChild(style);
};

const applyLanguage = (code: string) => {
  const gtLang = GT_LANG_MAP[code] || "ru";
  if (gtLang === "ru") {
    removeGoogleTranslateCookie();
  } else {
    setGoogleTranslateCookie(gtLang);
  }
  setTimeout(() => window.location.reload(), 50);
};

export const AutoTranslator = () => {
  useEffect(() => {
    hideGoogleUI();

    const stored = localStorage.getItem("app_lang") || "ru";
    const gtLang = GT_LANG_MAP[stored] || "ru";

    if (gtLang !== "ru") {
      setGoogleTranslateCookie(gtLang);
      loadGoogleTranslate();
    }

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail || "ru";
      applyLanguage(detail);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "app_lang") {
        applyLanguage(e.newValue || "ru");
      }
    };

    window.addEventListener("app-lang-change", handleCustom);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("app-lang-change", handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
};

export default AutoTranslator;
