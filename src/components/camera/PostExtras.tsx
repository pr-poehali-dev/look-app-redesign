import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { uploadExtraImage } from "@/lib/videoCompress";

export interface PostExtrasValue {
  extraImages: string[];
  place: string;
}

export const DEFAULT_EXTRAS: PostExtrasValue = { extraImages: [], place: "" };

interface Props {
  value: PostExtrasValue;
  onChange: (v: PostExtrasValue) => void;
  allowImages: boolean;
}

const MAX_EXTRA = 9;

const PostExtras = ({ value, onChange, allowImages }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const room = MAX_EXTRA - value.extraImages.length;
      const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
      const urls: string[] = [];
      for (const f of picked) urls.push(await uploadExtraImage(f));
      onChange({ ...value, extraImages: [...value.extraImages, ...urls] });
    } catch {
      setError("Не удалось загрузить фото. Попробуйте ещё раз");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (i: number) => onChange({ ...value, extraImages: value.extraImages.filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-white/60 text-xs font-semibold uppercase mb-2 flex items-center gap-1.5">
          <Icon name="MapPin" size={13} /> Место
        </p>
        <input
          value={value.place}
          onChange={(e) => onChange({ ...value, place: e.target.value.slice(0, 120) })}
          placeholder="Например: Кофейня «Дрейф», Санкт-Петербург"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
        />
      </div>

      {allowImages && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/60 text-xs font-semibold uppercase flex items-center gap-1.5">
              <Icon name="Images" size={13} /> Ещё фото в заметке
            </p>
            <span className="text-white/40 text-xs">{value.extraImages.length}/{MAX_EXTRA}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {value.extraImages.map((u, i) => (
              <div key={u} className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10">
                <img loading="lazy" decoding="async" src={u} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                  aria-label="Убрать"
                >
                  <Icon name="X" size={12} className="text-white" />
                </button>
              </div>
            ))}
            {value.extraImages.length < MAX_EXTRA && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-16 h-16 rounded-lg border border-dashed border-white/25 flex items-center justify-center disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="Plus" size={20} className="text-white/60" />
                )}
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          {error && <p className="text-[#fe2c55] text-xs mt-1.5">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default PostExtras;
