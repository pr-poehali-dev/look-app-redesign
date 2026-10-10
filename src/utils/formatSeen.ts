export const formatSeen = (sec?: number | null): string => {
  if (sec == null) return "был(а) давно";
  if (sec < 120) return "был(а) только что";
  const min = Math.floor(sec / 60);
  if (min < 60) {
    const m10 = min % 10, m100 = min % 100;
    const w = m10 === 1 && m100 !== 11 ? "минуту" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "минуты" : "минут";
    return `был(а) ${min} ${w} назад`;
  }
  const h = Math.floor(min / 60);
  if (h < 24) {
    const h10 = h % 10, h100 = h % 100;
    const w = h10 === 1 && h100 !== 11 ? "час" : h10 >= 2 && h10 <= 4 && (h100 < 12 || h100 > 14) ? "часа" : "часов";
    return `был(а) ${h} ${w} назад`;
  }
  const d = Math.floor(h / 24);
  if (d === 1) return "был(а) вчера";
  if (d < 7) return `был(а) ${d} дн. назад`;
  const dt = new Date(Date.now() - sec * 1000);
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const sameYear = dt.getFullYear() === new Date().getFullYear();
  return `был(а) ${dt.getDate()} ${months[dt.getMonth()]}${sameYear ? "" : " " + dt.getFullYear()}`;
};
