import { useEffect, useRef, useState } from "react";

interface StickyImageProps {
  src: string;
  alt?: string;
  className?: string;
  eager?: boolean;
}

const StickyImage = ({ src, alt, className, eager = false }: StickyImageProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager);

  useEffect(() => {
    if (near) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    let root: Element | null = el.parentElement;
    while (root && root !== document.body) {
      const oy = getComputedStyle(root).overflowY;
      if ((oy === "scroll" || oy === "auto") && root.scrollHeight > root.clientHeight) break;
      root = root.parentElement;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
      },
      { root: root && root !== document.body ? root : null, rootMargin: "200% 0px 200% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return (
    <div ref={wrapRef} className="w-full h-full flex items-center justify-center">
      {near && <img src={src} alt={alt} decoding="sync" loading="eager" className={className} />}
    </div>
  );
};

export default StickyImage;
