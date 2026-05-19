import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const ADMIN_API = "https://functions.poehali.dev/c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7";

export type ReportTarget = "video" | "comment" | "user" | "chat" | "message" | "stream" | "post";

const REASONS: { id: string; label: string }[] = [
  { id: "spam", label: "Спам или реклама" },
  { id: "violence", label: "Жестокость, насилие" },
  { id: "harassment", label: "Оскорбления, травля" },
  { id: "nudity", label: "Порнография / 18+" },
  { id: "hate", label: "Разжигание ненависти" },
  { id: "illegal", label: "Незаконный контент" },
  { id: "fake", label: "Обман, фейк" },
  { id: "other", label: "Другое" },
];

interface Props {
  targetType: ReportTarget;
  targetId: string | number;
  className?: string;
  variant?: "icon" | "menu" | "controlled";
  label?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDone?: () => void;
}

export default function ReportButton({ targetType, targetId, className, variant = "icon", label, open: openProp, onOpenChange, onDone }: Props) {
  const { user } = useAuth();
  const [openState, setOpenState] = useState(false);
  const open = variant === "controlled" ? !!openProp : openState;
  const setOpen = (v: boolean) => {
    if (variant === "controlled") onOpenChange?.(v);
    else setOpenState(v);
  };
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      await fetch(ADMIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_create",
          target_type: targetType,
          target_id: String(targetId),
          reason,
          comment,
          reporter_id: user?.id || "anon",
          reporter_name: user?.name || "",
        }),
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false); setDone(false); setReason(""); setComment("");
        onDone?.();
      }, 1200);
    } catch (e) { void e; }
    finally { setSending(false); }
  };

  return (
    <>
      {variant === "controlled" ? null : variant === "icon" ? (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={className || "p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white"}
          title="Пожаловаться"
          aria-label="Пожаловаться"
        >
          <Icon name="Flag" size={16} />
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={className || "w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 flex items-center gap-2"}
        >
          <Icon name="Flag" size={16} className="text-[#fe2c55]" />
          {label || "Пожаловаться"}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center px-4 pb-6"
          onClick={() => !sending && setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Icon name="Check" size={24} className="text-emerald-400" />
                </div>
                <p className="text-white font-semibold">Жалоба отправлена</p>
                <p className="text-white/50 text-xs text-center">Модераторы рассмотрят её в ближайшее время.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-base">Пожаловаться</p>
                  <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1">
                    <Icon name="X" size={18} />
                  </button>
                </div>
                <p className="text-white/50 text-xs">Выбери причину:</p>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {REASONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setReason(r.id)}
                      className={`w-full px-3 py-2.5 rounded-xl text-left text-sm flex items-center justify-between ${
                        reason === r.id ? "bg-[#fe2c55]/20 text-white border border-[#fe2c55]/40" : "bg-white/5 text-white/80 hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      {r.label}
                      {reason === r.id && <Icon name="Check" size={16} className="text-[#fe2c55]" />}
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Добавь детали (необязательно)"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-[#fe2c55]"
                />
                <button
                  onClick={send}
                  disabled={!reason || sending}
                  className="w-full py-3 rounded-xl bg-[#fe2c55] text-white font-semibold disabled:opacity-50"
                >
                  {sending ? "Отправляем..." : "Отправить жалобу"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}