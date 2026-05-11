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

let gtReady = false;
let gtReadyPromise: Promise<void> | null = null;

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

const ensureGoogleTranslate = (): Promise<void> => {
  if (gtReady) return Promise.resolve();
  if (gtReadyPromise) return gtReadyPromise;

  gtReadyPromise = new Promise<void>((resolve) => {
    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }

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

      const waitForSelect = () => {
        const select = document.querySelector<HTMLSelectElement>(
          ".goog-te-combo"
        );
        if (select) {
          gtReady = true;
          resolve();
        } else {
          setTimeout(waitForSelect, 100);
        }
      };
      waitForSelect();
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return gtReadyPromise;
};

const applyLanguage = async (code: string) => {
  const gtLang = GT_LANG_MAP[code] || "ru";

  if (gtLang === "ru") {
    removeGoogleTranslateCookie();
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select) {
      select.value = "";
      select.dispatchEvent(new Event("change"));
    }
    return;
  }

  setGoogleTranslateCookie(gtLang);
  await ensureGoogleTranslate();

  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (select) {
    select.value = gtLang;
    select.dispatchEvent(new Event("change"));
  }
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
    iframe.goog-te-menu-frame { display: none !important; }
  `;
  document.head.appendChild(style);
};

export const AutoTranslator = () => {
  useEffect(() => {
    hideGoogleUI();

    const stored = localStorage.getItem("app_lang") || "ru";
    if (stored !== "ru") {
      applyLanguage(stored);
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
