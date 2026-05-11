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
    const root = host.split(".").slice(-2).join(".");
    if (root && root !== host) {
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
    const root = host.split(".").slice(-2).join(".");
    if (root && root !== host) {
      document.cookie = `googtrans=;${expired};domain=.${root}`;
    }
  }
};

const loadGoogleTranslate = () => {
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
    body { top: 0 !important; }
    .goog-tooltip, .goog-tooltip:hover { display: none !important; }
    .goog-text-highlight { background: none !important; box-shadow: none !important; }
    #google_translate_element { display: none !important; }
  `;
  document.head.appendChild(style);
};

export const AutoTranslator = () => {
  useEffect(() => {
    hideGoogleUI();

    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }

    const stored = localStorage.getItem("app_lang");
    const lang = stored && GT_LANG_MAP[stored] ? GT_LANG_MAP[stored] : null;

    if (lang && lang !== "ru") {
      setGoogleTranslateCookie(lang);
      loadGoogleTranslate();
    } else {
      removeGoogleTranslateCookie();
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "app_lang") {
        const next = e.newValue && GT_LANG_MAP[e.newValue] ? GT_LANG_MAP[e.newValue] : "ru";
        if (next === "ru") {
          removeGoogleTranslateCookie();
        } else {
          setGoogleTranslateCookie(next);
        }
        window.location.reload();
      }
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      const next = detail && GT_LANG_MAP[detail] ? GT_LANG_MAP[detail] : "ru";
      if (next === "ru") {
        removeGoogleTranslateCookie();
      } else {
        setGoogleTranslateCookie(next);
      }
      window.location.reload();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("app-lang-change", handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("app-lang-change", handleCustom);
    };
  }, []);

  return null;
};

export default AutoTranslator;