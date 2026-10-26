import { useEffect } from "react";
import i18n from "@/i18n";

type Dict = Record<string, string>;

const CYR = /[А-Яа-яЁё]/;
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "TEXTAREA", "CODE", "PRE"]);

let dict: Dict = {};
let active = "ru";
let observer: MutationObserver | null = null;

const loaders: Record<string, () => Promise<{ default: Dict }>> = {
  en: () => import("@/i18n/dict/en.json"),
  zh: () => import("@/i18n/dict/zh.json"),
};

type Rule = [RegExp, Record<string, (m: RegExpMatchArray) => string>];

const RULES: Rule[] = [
  [/^(\d+)\s*мин(?:\.|ут[ыу]?)?\s*назад$/, { en: (m) => `${m[1]} min ago`, zh: (m) => `${m[1]} 分钟前` }],
  [/^(\d+)\s*(?:ч|час|часа|часов)\s*назад$/, { en: (m) => `${m[1]} h ago`, zh: (m) => `${m[1]} 小时前` }],
  [/^(\d+)\s*(?:д|дн\.?|дня|дней|день)\s*назад$/, { en: (m) => `${m[1]} d ago`, zh: (m) => `${m[1]} 天前` }],
  [/^(\d+)\s*мес(?:\.|яца|яцев)?\s*назад$/, { en: (m) => `${m[1]} mo ago`, zh: (m) => `${m[1]} 个月前` }],
  [/^(\d+)\s*(?:подписчик\S*)$/, { en: (m) => `${m[1]} followers`, zh: (m) => `${m[1]} 粉丝` }],
  [/^(\d+)\s*(?:участник\S*|участн\.)$/, { en: (m) => `${m[1]} members`, zh: (m) => `${m[1]} 位成员` }],
  [/^(\d+)\s*(?:просмотр\S*)$/, { en: (m) => `${m[1]} views`, zh: (m) => `${m[1]} 次浏览` }],
  [/^(\d+)\s*(?:комментари\S*)$/, { en: (m) => `${m[1]} comments`, zh: (m) => `${m[1]} 条评论` }],
  [/^(\d+)\s*(?:лайк\S*)$/, { en: (m) => `${m[1]} likes`, zh: (m) => `${m[1]} 赞` }],
];

const lookup = (raw: string): string | null => {
  const t = raw.trim();
  if (!t) return null;
  const hit = dict[t];
  if (hit) return raw.replace(t, hit);
  for (const [re, out] of RULES) {
    const m = t.match(re);
    if (m && out[active]) return raw.replace(t, out[active](m));
  }
  return null;
};

const translateTextNode = (node: Text) => {
  const v = node.nodeValue;
  if (!v || !CYR.test(v)) return;
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest("[data-no-translate]")) return;
  const res = lookup(v);
  if (res && res !== v) node.nodeValue = res;
};

const translateAttrs = (el: Element) => {
  if (el.closest("[data-no-translate]")) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && CYR.test(v)) {
      const res = lookup(v);
      if (res && res !== v) el.setAttribute(a, res);
    }
  }
};

const translateTree = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName)) return;
  translateAttrs(el);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) translateTextNode(n as Text);
    else translateAttrs(n as Element);
  }
};

const startObserver = () => {
  observer?.disconnect();
  observer = new MutationObserver((mutations) => {
    if (active === "ru") return;
    for (const m of mutations) {
      if (m.type === "childList") m.addedNodes.forEach((n) => translateTree(n));
      else if (m.type === "characterData") translateTextNode(m.target as Text);
      else if (m.type === "attributes") translateAttrs(m.target as Element);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
};

const apply = async (code: string) => {
  active = code;
  observer?.disconnect();
  observer = null;
  if (!loaders[code]) {
    if (sessionStorage.getItem("had_translation") === "1") {
      sessionStorage.removeItem("had_translation");
      window.location.reload();
    }
    return;
  }
  sessionStorage.setItem("had_translation", "1");
  const mod = await loaders[code]();
  dict = mod.default;
  translateTree(document.body);
  startObserver();
};

export const AutoTranslator = () => {
  useEffect(() => {
    let stored = "ru";
    try { stored = localStorage.getItem("app_lang") || "ru"; } catch { /* ignore */ }
    if (loaders[stored]) apply(stored);

    const onChange = (e: Event) => {
      const code = (e as CustomEvent<string>).detail || "ru";
      try { localStorage.setItem("app_lang", code); } catch { /* ignore */ }
      i18n.changeLanguage(code);
      apply(code);
    };
    window.addEventListener("app-lang-change", onChange);
    return () => window.removeEventListener("app-lang-change", onChange);
  }, []);
  return null;
};

export default AutoTranslator;
