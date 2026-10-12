import { useState } from "react";
import { Reader } from "@/components/profile/ArticlesScreen";

const readId = (): number | null => {
  const v = new URLSearchParams(window.location.search).get("article");
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const ArticleDeepLink = () => {
  const [id, setId] = useState<number | null>(readId);
  if (id === null) return null;
  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("article");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setId(null);
  };
  return (
    <div className="fixed inset-0 z-[200] bg-white">
      <Reader id={id} onBack={close} onEdit={close} />
    </div>
  );
};

export default ArticleDeepLink;
