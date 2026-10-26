import i18n from "@/i18n";

const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

const plural = (n: number, one: string, few: string, many: string) => {
  const n10 = n % 10, n100 = n % 100;
  return n10 === 1 && n100 !== 11 ? one : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? few : many;
};

export const formatSeen = (sec?: number | null): string => {
  const lang = (i18n.language || "ru").slice(0, 2);
  if (lang === "en") {
    if (sec == null) return "last seen long ago";
    if (sec < 120) return "last seen just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `last seen ${min} min ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `last seen ${h} h ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return "last seen yesterday";
    if (d < 7) return `last seen ${d} d ago`;
    const dt = new Date(Date.now() - sec * 1000);
    return `last seen ${dt.toLocaleDateString("en-US", { day: "numeric", month: "long", ...(dt.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }) })}`;
  }
  if (lang === "zh") {
    if (sec == null) return "很久之前在线";
    if (sec < 120) return "刚刚在线";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} 分钟前在线`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} 小时前在线`;
    const d = Math.floor(h / 24);
    if (d === 1) return "昨天在线";
    if (d < 7) return `${d} 天前在线`;
    const dt = new Date(Date.now() - sec * 1000);
    return `${dt.getMonth() + 1}月${dt.getDate()}日在线`;
  }
  if (sec == null) return "был(а) давно";
  if (sec < 120) return "был(а) только что";
  const min = Math.floor(sec / 60);
  if (min < 60) return `был(а) ${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `был(а) ${h} ${plural(h, "час", "часа", "часов")} назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return "был(а) вчера";
  if (d < 7) return `был(а) ${d} дн. назад`;
  const dt = new Date(Date.now() - sec * 1000);
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  return `был(а) ${dt.getDate()} ${MONTHS_RU[dt.getMonth()]}${sameYear ? "" : " " + dt.getFullYear()}`;
};
