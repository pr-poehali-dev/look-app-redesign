const isPhone = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

const isExternal = (a: HTMLAnchorElement) => {
  if (!/^https?:$/.test(a.protocol)) return false;
  if (a.hasAttribute('download')) return false;
  return a.host !== window.location.host;
};

export const initExternalLinks = () => {
  if (typeof document === "undefined") return;
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented) return;
      if (!isPhone()) return;
      const el = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!el || !el.href || !isExternal(el)) return;
      e.preventDefault();
      openInBrowser(el.href);
    },
    true
  );
};

export const openInBrowser = (url: string) => {
  let u: URL;
  try { u = new URL(url, window.location.href); } catch { return; }
  if (/Android/i.test(navigator.userAgent) && /^https?:$/.test(u.protocol)) {
    const fallback = encodeURIComponent(u.href);
    window.location.href = `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(":", "")};action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`;
    return;
  }
  window.open(u.href, "_blank", "noopener,noreferrer");
};
