import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import { toast } from "sonner";
import { RUBRICS } from "@/lib/rubrics";
import { AgeRating } from "@/components/camera/ComplianceFields";

const UPLOAD_URL = "https://functions.poehali.dev/25a6b99d-32f3-45a4-baf7-a088013ca292";
const MAX = 2000;
const AGES: AgeRating[] = ["0+", "6+", "12+", "16+", "18+"];

interface Props {
  onClose: () => void;
}

const TextPostComposer = ({ onClose }: Props) => {
  const { user } = useAuth();
  const { refreshMedia } = useUserMedia();
  const [text, setText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [workHours, setWorkHours] = useState("");
  const [tips, setTips] = useState("");
  const [category, setCategory] = useState("everyday");
  const [age, setAge] = useState<AgeRating>("12+");
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    if (!user) { toast.error("Войдите в аккаунт, чтобы опубликовать"); return; }
    setSaving(true);
    try {
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "text_post",
          text,
          hashtags,
          place,
          address,
          work_hours: workHours,
          tips,
          category,
          age_rating: age,
          user_id: user.id,
          author: user.name,
          handle: user.handle || user.name,
        }),
      });
      const raw = await res.json();
      const data = typeof raw?.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.error) { toast.error(data.error); setSaving(false); return; }
      if (data.moderation === "pending") toast.message("Пост отправлен на проверку модератору");
      else toast.success("Пост опубликован");
      try { await refreshMedia(); } catch { /* ignore */ }
      onClose();
    } catch {
      toast.error("Не удалось опубликовать. Попробуйте ещё раз");
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Закрыть">
          <Icon name="X" size={20} className="text-white" />
        </button>
        <p className="text-white font-bold">Новый пост</p>
        <button
          onClick={publish}
          disabled={text.trim().length < 3 || saving}
          className="px-4 py-1.5 rounded-full bg-[#FF5A3C] text-white text-sm font-bold disabled:opacity-40"
        >
          {saving ? "..." : "Опубликовать"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            rows={8}
            autoFocus
            placeholder="Поделитесь советом, мыслью или историей..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-[15px] leading-relaxed placeholder:text-white/30 outline-none resize-none"
          />
          <p className="text-white/30 text-xs text-right mt-1">{text.length}/{MAX}</p>
        </div>

        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Рубрика</p>
          <div className="flex flex-wrap gap-1.5">
            {RUBRICS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setCategory(r.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${category === r.id ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <input
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#совет #лайфхак"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
        />

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3">
          <Icon name="MapPin" size={14} className="text-white/50" />
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value.slice(0, 120))}
            placeholder="Место (необязательно)"
            className="flex-1 bg-transparent py-2 text-white text-sm placeholder:text-white/30 outline-none"
          />
        </div>
        {place.trim() && (
          <>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value.slice(0, 200))}
              placeholder="Адрес: ул. Рубинштейна, 15"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
            />
            <input
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value.slice(0, 120))}
              placeholder="Время работы: ежедневно 9:00–22:00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
            />
            <textarea
              value={tips}
              onChange={(e) => setTips(e.target.value.slice(0, 500))}
              placeholder="Лайфхак от своих"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none resize-none"
            />
          </>
        )}

        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Возрастная маркировка</p>
          <div className="flex gap-1.5">
            {AGES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAge(a)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${age === a ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextPostComposer;
