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
      if (el.dataset.lookOpened === "1") return;
      e.preventDefault();
      openInBrowser(el.href);
    },
    true
  );
};

export const openInBrowser = (url: string) => {
  let u: URL;
  try { u = new URL(url, window.location.href); } catch { return; }
  const a = document.createElement("a");
  a.href = u.href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.dataset.lookOpened = "1";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 0);
};
