import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const TRANSLATE_URL = "https://functions.poehali.dev/1675f17c-e150-4351-b62e-2a47fdbd2324";

interface Props {
  text: string;
  children: (shown: string) => ReactNode;
  className?: string;
}

const TranslateText = ({ text, children, className = "text-white/40 text-xs font-semibold" }: Props) => {
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (showing) { setShowing(false); return; }
    if (translated !== null) { setShowing(true); return; }
    setLoading(true);
    try {
      const res = await fetch(TRANSLATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.text) { setTranslated(data.text); setShowing(true); }
      else toast.error("Не удалось перевести");
    } catch {
      toast.error("Не удалось перевести");
    }
    setLoading(false);
  };

  return (
    <>
      {children(showing && translated !== null ? translated : text)}
      {text.trim().length > 1 && (
        <button type="button" onClick={toggle} disabled={loading} className={className}>
          {loading ? "Перевожу..." : showing ? "Показать оригинал" : "Перевести"}
        </button>
      )}
    </>
  );
};

export default TranslateText;
