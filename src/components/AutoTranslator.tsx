import { useEffect } from "react";

const SUPPORTED = new Set(["en", "de", "fr", "es", "zh"]);
const CACHE_KEY = "mm_translate_cache_v1";

type Cache = Record<string, Record<string, string>>;

const loadCache = (): Cache => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveCache = (cache: Cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
};

const cache: Cache = loadCache();
let saveTimer: number | null = null;
const scheduleSave = () => {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveCache(cache), 500);
};

const TARGET_LANG_MAP: Record<string, string> = {
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  zh: "zh-CN",
};

const translateText = async (text: string, target: string): Promise<string> => {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (!cache[target]) cache[target] = {};
  if (cache[target][trimmed]) return text.replace(trimmed, cache[target][trimmed]);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=ru|${TARGET_LANG_MAP[target] || target}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText as string | undefined;
    if (translated && typeof translated === "string") {
      cache[target][trimmed] = translated;
      scheduleSave();
      return text.replace(trimmed, translated);
    }
  } catch {
    // ignore network errors
  }
  return text;
};

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "INPUT", "TEXTAREA", "CODE", "PRE",
]);

const collectTextNodes = (root: Node): Text[] => {
  const result: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-no-translate]")) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue?.trim();
      if (!text) return NodeFilter.FILTER_REJECT;
      if (!/[А-Яа-яЁё]/.test(text)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) result.push(n as Text);
  return result;
};

let activeLang = "ru";
let translating = false;

const translateNode = async (node: Text, target: string) => {
  const original = node.nodeValue;
  if (!original) return;
  const trimmed = original.trim();
  if (!trimmed) return;
  if (cache[target]?.[trimmed]) {
    node.nodeValue = original.replace(trimmed, cache[target][trimmed]);
    return;
  }
  const result = await translateText(original, target);
  if (result !== original && node.nodeValue === original) {
    node.nodeValue = result;
  }
};

const translatePage = async (target: string) => {
  if (target === "ru" || translating) return;
  translating = true;
  try {
    const nodes = collectTextNodes(document.body);
    const batchSize = 6;
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      await Promise.all(batch.map((n) => translateNode(n, target)));
    }
  } finally {
    translating = false;
  }
};

const setupObserver = (target: string) => {
  const observer = new MutationObserver((mutations) => {
    if (activeLang === "ru") return;
    const newNodes: Text[] = [];
    for (const m of mutations) {
      m.addedNodes.forEach((added) => {
        if (added.nodeType === Node.TEXT_NODE) {
          const text = (added as Text).nodeValue?.trim();
          if (text && /[А-Яа-яЁё]/.test(text)) newNodes.push(added as Text);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          newNodes.push(...collectTextNodes(added));
        }
      });
      if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
        const t = (m.target as Text).nodeValue?.trim();
        if (t && /[А-Яа-яЁё]/.test(t)) newNodes.push(m.target as Text);
      }
    }
    if (newNodes.length === 0) return;
    (async () => {
      const batchSize = 6;
      for (let i = 0; i < newNodes.length; i += batchSize) {
        const batch = newNodes.slice(i, i + batchSize);
        await Promise.all(batch.map((n) => translateNode(n, target)));
      }
    })();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return observer;
};

let currentObserver: MutationObserver | null = null;

const applyLanguage = async (code: string) => {
  activeLang = code;
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
  }

  if (code === "ru" || !SUPPORTED.has(code)) {
    if (sessionStorage.getItem("had_translation") === "1") {
      sessionStorage.removeItem("had_translation");
      window.location.reload();
    }
    return;
  }

  sessionStorage.setItem("had_translation", "1");
  await translatePage(code);
  currentObserver = setupObserver(code);
};

export const AutoTranslator = () => {
  useEffect(() => {
    const stored = localStorage.getItem("app_lang") || "ru";
    if (stored !== "ru" && SUPPORTED.has(stored)) {
      applyLanguage(stored);
    }

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail || "ru";
      try {
        localStorage.setItem("app_lang", detail);
      } catch {
        // ignore
      }
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
