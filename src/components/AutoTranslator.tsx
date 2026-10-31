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

type Rule = [RegExp, string, string];

const RULES: Rule[] = [
  [/^(\d+) (?:пост|поста|постов)$/, "$1 posts", "$1 个帖子"],
  [/^(\d+) полезных$/, "$1 helpful", "$1 条有用"],
  [/^полезных: (\d+)$/, "helpful: $1", "有用：$1"],
  [/^Комментарии: (\d+)$/, "Comments: $1", "评论：$1"],
  [/^Лучшее за неделю$/, "Best of the week", "本周最佳"],
  [/^Лучшее за месяц$/, "Best of the month", "本月最佳"],
  [/^Заблокировать (.+)\? Пользователь не сможет войти в приложение\.$/, "Block $1? The user will not be able to log in to the app.", "屏蔽 $1？该用户将无法登录应用。"],
  [/^Удалить (\d+) битых записей со ссылками на short-video\.ru\? Это действие необратимо\.$/, "Delete $1 broken records with links to short-video.ru? This cannot be undone.", "删除 $1 条指向 short-video.ru 的失效记录？此操作不可撤销。"],
  [/^Удалено: (\d+)$/, "Deleted: $1", "已删除：$1"],
  [/^Перенести (\d+) legacy-видео на наш CDN\? Будет идти в фоне партиями по 5 шт, неудачные пометятся как скрытые\.$/, "Move $1 legacy videos to our CDN? It runs in the background in batches of 5; failed ones will be marked hidden.", "将 $1 个旧视频迁移到我们的 CDN？将在后台每批 5 个进行，失败的会被标记为隐藏。"],
  [/^Удалить (\d+) записей навсегда\?$/, "Delete $1 records permanently?", "永久删除 $1 条记录？"],
  [/^Скрыть (\d+) записей\?$/, "Hide $1 records?", "隐藏 $1 条记录？"],
  [/^Показать (\d+) записей\?$/, "Show $1 records?", "显示 $1 条记录？"],
  [/^Найдено (\d+) legacy-записей$/, "Found $1 legacy records", "找到 $1 条旧记录"],
  [/^\(было (.+) ₽\)$/, "(was $1 ₽)", "（原价 $1 ₽）"],
  [/^·?\s*(\d+)\s*просмотр\S*$/, "· $1 views", "· $1 次浏览"],
  [/^·?\s*(\d+)\s*отз\.$/, "· $1 reviews", "· $1 条评价"],
  [/^(.+?) (назначил админом|снял админ-права с|удалил из группы|заблокировал|разблокировал|передал владельца|закрепил сообщение|открепил сообщение) ?(.*)$/, "$1 $2 $3", "$1 $2 $3"],
  [/^(\d+)\s*мин(?:\.|ут[ыу]?)?\s*назад$/, "$1 min ago", "$1 分钟前"],
  [/^(\d+)\s*(?:ч|час|часа|часов)\s*назад$/, "$1 h ago", "$1 小时前"],
  [/^(\d+)\s*(?:д|дн\.?|дня|дней|день)\s*назад$/, "$1 d ago", "$1 天前"],
  [/^(\d+)\s*мес(?:\.|яца|яцев)?\s*назад$/, "$1 mo ago", "$1 个月前"],
  [/^(\d+)\s*мин$/, "$1 min", "$1 分钟"],
  [/^(\d+)\s*ч$/, "$1 h", "$1 小时"],
  [/^(\d+)\s*д$/, "$1 d", "$1 天"],
  [/^(\d+)\s*с$/, "$1 s", "$1 秒"],
  [/^(\d+)\s*мин\s+(\d+)\s*с$/, "$1 min $2 s", "$1 分 $2 秒"],
  [/^(\d+)\s*подписчик\S*$/, "$1 followers", "$1 粉丝"],
  [/^(\d+)\s*(?:участник\S*|участн\.)$/, "$1 members", "$1 位成员"],
  [/^(\d+)\s*просмотр\S*$/, "$1 views", "$1 次浏览"],
  [/^(\d+)\s*комментари\S*$/, "$1 comments", "$1 条评论"],
  [/^(\d+)\s*лайк\S*$/, "$1 likes", "$1 赞"],
  [/^(\d+)\s*шаг\S*$/, "$1 steps", "$1 步"],
  [/^(\d+)\s*отз\.$/, "$1 reviews", "$1 条评价"],
  [/^(\d+)\s*(?:заявк\S*)$/, "$1 requests", "$1 条申请"],
  [/^(\d+)\s*элемент\S*$/, "$1 items", "$1 项"],
  [/^(\d+)\s*трансляци\S*\s+сейчас$/, "$1 live now", "$1 场直播进行中"],
  [/^Туториал · (\d+) шагов$/, "Tutorial · $1 steps", "教程 · $1 步"],
  [/^Серия · (.+)$/, "Series · $1", "系列 · $1"],
  [/^История (\d+)$/, "Story $1", "快拍 $1"],
  [/^Вариант (\d+)$/, "Option $1", "选项 $1"],
  [/^Показать ответы \((\d+)\)$/, "Show replies ($1)", "显示回复 ($1)"],
  [/^Все · (\d+)$/, "All · $1", "全部 · $1"],
  [/^Админы · (\d+)$/, "Admins · $1", "管理员 · $1"],
  [/^Бан · (\d+)$/, "Banned · $1", "封禁 · $1"],
  [/^Пригласить \((\d+)\)$/, "Invite ($1)", "邀请 ($1)"],
  [/^Приглашено: (\d+)$/, "Invited: $1", "已邀请：$1"],
  [/^Приглашение отправлено: (.+)$/, "Invitation sent: $1", "邀请已发送：$1"],
  [/^Сегодня, (.+)$/, "Today, $1", "今天 $1"],
  [/^Завтра, (.+)$/, "Tomorrow, $1", "明天 $1"],
  [/^вчера, (.+)$/, "yesterday, $1", "昨天 $1"],
  [/^Трансляция (.+)$/, "$1's stream", "$1 的直播"],
  [/^(.+) \(Вы\)$/, "$1 (You)", "$1（你）"],
  [/^Найди меня в Лоок: (@.+)$/, "Find me on Look: $1", "在 Look 找到我：$1"],
  [/^Удалить коллекцию «(.+)»\?$/, "Delete collection “$1”?", "删除收藏夹“$1”？"],
  [/^Удалить доску «(.+)»\?$/, "Delete board “$1”?", "删除灵感板“$1”？"],
  [/^Удалить канал «(.+)»\? Это нельзя отменить\.$/, "Delete channel “$1”? This cannot be undone.", "删除频道“$1”？此操作无法撤销。"],
  [/^Удалить сообщество «(.+)»\? Это действие нельзя отменить\.$/, "Delete community “$1”? This cannot be undone.", "删除社群“$1”？此操作无法撤销。"],
  [/^Присоединяйся к сообществу «(.+)»$/, "Join the community “$1”", "加入社群“$1”"],
  [/^«(.+)» — закрытое сообщество\. Подай заявку на вступление\.$/, "“$1” is a closed community. Apply to join.", "“$1”是封闭社群，请提交加入申请。"],
  [/^Удалить (.+) из канала\?$/, "Remove $1 from the channel?", "将 $1 移出频道？"],
  [/^Удалить (.+) из группы\?$/, "Remove $1 from the group?", "将 $1 移出群组？"],
  [/^Заблокировать (.+)\? Он не сможет подписаться снова\.$/, "Block $1? They will not be able to subscribe again.", "屏蔽 $1？对方将无法再次订阅。"],
  [/^Заблокировать (.+)\? Причина \(необязательно\):$/, "Block $1? Reason (optional):", "屏蔽 $1？原因（可选）："],
  [/^Разблокировать (.+)\?$/, "Unblock $1?", "取消屏蔽 $1？"],
  [/^Снять админ-права с (.+)\?$/, "Remove admin rights from $1?", "撤销 $1 的管理员权限？"],
  [/^Передать владельца группы пользователю (.+)\? Ты станешь обычным админом\.$/, "Transfer group ownership to $1? You will become a regular admin.", "将群主转让给 $1？你将成为普通管理员。"],
  [/^Больше не будем показывать (@.+)$/, "We will no longer show $1", "不再显示 $1"],
  [/^Уведомления от (@.+) включены$/, "Notifications from $1 turned on", "$1 的通知已开启"],
  [/^Уведомления от (@.+) выключены$/, "Notifications from $1 turned off", "$1 的通知已关闭"],
  [/^Пользователь (@.+) не зарегистрирован — написать ему нельзя\.$/, "User $1 is not registered — you cannot message them.", "用户 $1 未注册，无法发送消息。"],
  [/^Здравствуйте! Интересует товар «(.+)»$/, "Hello! I am interested in the product “$1”", "您好！我对商品“$1”感兴趣"],
  [/^Переходов на сайт: (\d+)$/, "Site clicks: $1", "网站点击：$1"],
  [/^· промо (.+)$/, "· promo $1", "· 优惠码 $1"],
  [/^(\d+) · (\d+) отз\.$/, "$1 · $2 reviews", "$1 · $2 条评价"],
  [/^Входящий видеозвонок$/, "Incoming video call", "视频来电"],
  [/^Входящий аудиозвонок$/, "Incoming audio call", "语音来电"],
];

const fill = (tpl: string, m: RegExpMatchArray) => tpl.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? "");

function lookup(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const hit = dict[t] || dict[t.replace(/\u2011/g, "-")];
  if (hit) return raw.replace(t, hit);
  if (t.includes(" · ")) {
    const parts = t.split(" · ");
    let changed = false;
    const out = parts.map((part) => {
      const r = lookup(part);
      if (r && r !== part) { changed = true; return r; }
      return part;
    });
    if (changed) return raw.replace(t, out.join(" · "));
  }
  const tag = t.match(/^(\+?\s*)#(\S+)$/);
  if (tag && dict[tag[2]]) return raw.replace(t, `${tag[1]}#${dict[tag[2]].replace(/\s+/g, "")}`);
  for (const [re, en, zh] of RULES) {
    const m = t.match(re);
    if (m) return raw.replace(t, fill(active === "zh" ? zh : en, m));
  }
  return null;
}

const applyToNode = (node: Text, raw: string): boolean => {
  const res = lookup(raw);
  if (res && res !== raw) {
    node.nodeValue = res;
    return true;
  }
  return false;
};

const translateTextNode = (node: Text) => {
  const v = node.nodeValue;
  if (!v || !CYR.test(v)) return;
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest("[data-no-translate]")) return;
  if (applyToNode(node, v)) return;
  const kids = Array.from(parent.childNodes);
  if (kids.length > 1 && kids.every((k) => k.nodeType === Node.TEXT_NODE)) {
    const texts = kids as Text[];
    const joined = texts.map((k) => k.nodeValue || "").join("");
    const res = lookup(joined);
    if (res && res !== joined) {
      texts[0].nodeValue = res;
      for (let i = 1; i < texts.length; i++) texts[i].nodeValue = "";
    }
  }
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

const translateMessage = (msg: unknown): unknown => {
  if (active === "ru" || typeof msg !== "string" || !CYR.test(msg)) return msg;
  const whole = lookup(msg);
  if (whole) return whole;
  return msg
    .split(/(\n|(?<=[.!?])\s+)/)
    .map((part) => (CYR.test(part) ? lookup(part) || part : part))
    .join("");
};

let dialogsPatched = false;
const patchDialogs = () => {
  if (dialogsPatched) return;
  dialogsPatched = true;
  const a = window.alert.bind(window);
  const c = window.confirm.bind(window);
  const p = window.prompt.bind(window);
  window.alert = (m?: unknown) => a(translateMessage(m) as string);
  window.confirm = (m?: string) => c(translateMessage(m) as string);
  window.prompt = (m?: string, d?: string) => p(translateMessage(m) as string, d);
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
    patchDialogs();
    let stored = "ru";
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (q && (q === "ru" || loaders[q])) localStorage.setItem("app_lang", q);
      stored = localStorage.getItem("app_lang") || "ru";
    } catch { /* ignore */ }
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
