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
      const el = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!el || !el.href || !isExternal(el)) return;
      e.preventDefault();
      window.open(el.href, "_blank", "noopener,noreferrer");
    },
    true
  );
};
