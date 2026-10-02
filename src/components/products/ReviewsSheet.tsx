import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useProductReviews } from "@/hooks/useReviews";
import { uploadProductImage } from "@/hooks/useProducts";
import { toast } from "sonner";

export const Stars = ({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className="disabled:cursor-default">
        <Icon name="Star" size={size} className={n <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-300"} />
      </button>
    ))}
  </div>
);

interface Props {
  productId: number;
  title: string;
  onClose: () => void;
}

const ReviewsSheet = ({ productId, title, onClose }: Props) => {
  const { user } = useAuth();
  const { reviews, avg, count, loading, add, remove } = useProductReviews(productId);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user?.id) return;
    setUploading(true);
    const url = await uploadProductImage(f, user.id);
    setUploading(false);
    if (url) setImage(url); else toast.error("Не удалось загрузить фото");
  };

  const submit = async () => {
    if (!user?.id) { toast.error("Войди в аккаунт, чтобы оставить отзыв"); return; }
    setSending(true);
    const ok = await add(rating, text.trim(), image);
    setSending(false);
    if (ok) { setText(""); setImage(null); toast.success("Отзыв сохранён"); } else toast.error("Не удалось сохранить отзыв");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-end md:items-center md:justify-center" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md max-h-[85vh] rounded-t-3xl md:rounded-3xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-black font-bold text-base truncate">Отзывы: {title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Stars value={avg} size={13} />
              <span className="text-gray-500 text-xs">{count ? `${avg} · ${count}` : "Пока нет оценок"}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1"><Icon name="X" size={22} className="text-black" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {loading ? (
            <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" /></div>
          ) : reviews.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Будь первым, кто оставит отзыв</p>
          ) : reviews.map((r) => (
            <div key={r.id} className="rounded-2xl bg-gray-50 p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {r.author_avatar && <img src={r.author_avatar} alt="" className="w-full h-full object-cover" />}
                </div>
                <span className="text-black text-sm font-semibold flex-1 truncate">{r.author_name}</span>
                {r.user_id === user?.id && (
                  <button onClick={() => remove(r.id)} className="p-1"><Icon name="Trash2" size={14} className="text-gray-400" /></button>
                )}
              </div>
              <Stars value={r.rating} size={12} />
              {r.text && <p className="text-black text-sm leading-snug whitespace-pre-wrap">{r.text}</p>}
              {r.image && <img src={r.image} alt="" className="w-24 h-24 rounded-xl object-cover" />}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-medium">Твоя оценка</span>
            <Stars value={rating} size={22} onChange={setRating} />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Расскажи, как тебе покупка"
            className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black text-sm outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {uploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                : image ? <img src={image} alt="" className="w-full h-full object-cover" />
                : <Icon name="Camera" size={18} className="text-gray-500" />}
            </button>
            <button onClick={submit} disabled={sending} className="flex-1 h-11 rounded-xl bg-black text-white text-sm font-bold disabled:opacity-60">
              {sending ? "Сохраняю..." : "Оставить отзыв"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsSheet;
