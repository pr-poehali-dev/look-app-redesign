import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";

interface Props {
  title: string;
  authorName: string;
  onClose: () => void;
}

const ArticleShareSheet = ({ title, authorName, onClose }: Props) => {
  const [copied, setCopied] = useState(false);
  const url = window.location.origin;
  const text = `${authorName}: ${title}`;
  const options = [
    { icon: "MessageCircle", label: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { icon: "Send", label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { icon: "Share2", label: "VK", color: "#0077FF", href: `https://vk.com/share.php?url=${encodeURIComponent(url)}` },
    { icon: "MessageSquare", label: "МАКС", color: "#7C66FC", href: `https://max.ru/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={onClose}>
      <div className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[360px] md:shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-white font-bold text-base">Поделиться</span>
          <button onClick={onClose}><Icon name="X" size={20} className="text-white/60" /></button>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {options.map((opt) => (
            <a key={opt.label} href={opt.href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2" onClick={onClose}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: opt.color + "22", border: `1.5px solid ${opt.color}55` }}>
                <Icon name={opt.icon} size={24} style={{ color: opt.color }} />
              </div>
              <span className="text-white/70 text-xs">{opt.label}</span>
            </a>
          ))}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => { setCopied(false); onClose(); }, 1500);
          }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon name={copied ? "Check" : "Link"} size={20} className={copied ? "text-green-400" : "text-white"} />
          </div>
          <span className="text-white text-sm font-medium">{copied ? "Скопировано!" : "Скопировать ссылку"}</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ArticleShareSheet;
