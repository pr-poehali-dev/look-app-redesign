import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { uploadProductImage } from "@/hooks/useProducts";
import { TutorialStep, DIFFICULTY_LABEL } from "@/hooks/useArticles";

export interface TutorialValue {
  steps: TutorialStep[];
  materials: string;
  duration: string;
  difficulty: "" | "easy" | "medium" | "hard";
}

export const EMPTY_TUTORIAL: TutorialValue = {
  steps: [{ title: "", text: "", image: "" }],
  materials: "",
  duration: "",
  difficulty: "",
};

interface Props {
  userId: string;
  value: TutorialValue;
  onChange: (v: TutorialValue) => void;
}

const MAX_STEPS = 30;

const TutorialFields = ({ userId, value, onChange }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [pickIdx, setPickIdx] = useState(0);

  const setStep = (i: number, patch: Partial<TutorialStep>) =>
    onChange({ ...value, steps: value.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  const addStep = () => {
    if (value.steps.length >= MAX_STEPS) return;
    onChange({ ...value, steps: [...value.steps, { title: "", text: "", image: "" }] });
  };

  const removeStep = (i: number) => {
    if (value.steps.length <= 1) return;
    onChange({ ...value, steps: value.steps.filter((_, idx) => idx !== i) });
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.steps.length) return;
    const next = [...value.steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...value, steps: next });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploadingIdx(pickIdx);
    const url = await uploadProductImage(f, userId);
    setUploadingIdx(null);
    if (url) setStep(pickIdx, { image: url });
    else toast.error("Не удалось загрузить фото шага");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-gray-50 p-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={value.duration}
            onChange={(e) => onChange({ ...value, duration: e.target.value.slice(0, 40) })}
            placeholder="Время: 2 часа"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-gray-200 text-black text-sm outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange({ ...value, difficulty: value.difficulty === d ? "" : d })}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border ${value.difficulty === d ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
        <textarea
          value={value.materials}
          onChange={(e) => onChange({ ...value, materials: e.target.value.slice(0, 1500) })}
          rows={3}
          placeholder={"Что понадобится (по одному на строку)\nКлей\nКартон"}
          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-black text-sm outline-none resize-none"
        />
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {value.steps.map((st, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <input
              value={st.title}
              onChange={(e) => setStep(i, { title: e.target.value.slice(0, 120) })}
              placeholder="Название шага (необязательно)"
              className="flex-1 min-w-0 text-black text-sm font-semibold outline-none"
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 disabled:opacity-30" aria-label="Выше">
              <Icon name="ChevronUp" size={16} className="text-gray-500" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === value.steps.length - 1} className="p-1 disabled:opacity-30" aria-label="Ниже">
              <Icon name="ChevronDown" size={16} className="text-gray-500" />
            </button>
            <button type="button" onClick={() => removeStep(i)} disabled={value.steps.length <= 1} className="p-1 disabled:opacity-30" aria-label="Удалить шаг">
              <Icon name="Trash2" size={16} className="text-red-500" />
            </button>
          </div>
          <textarea
            value={st.text}
            onChange={(e) => setStep(i, { text: e.target.value.slice(0, 1500) })}
            rows={3}
            placeholder="Опишите, что нужно сделать"
            className="w-full text-black text-[15px] leading-relaxed outline-none resize-none"
          />
          {st.image ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={st.image} alt="" className="w-full max-h-56 object-cover" />
              <button
                type="button"
                onClick={() => setStep(i, { image: "" })}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center"
                aria-label="Убрать фото"
              >
                <Icon name="X" size={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setPickIdx(i); fileRef.current?.click(); }}
              disabled={uploadingIdx === i}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold disabled:opacity-50"
            >
              <Icon name="ImagePlus" size={14} />
              {uploadingIdx === i ? "Загружаю..." : "Добавить фото"}
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        disabled={value.steps.length >= MAX_STEPS}
        className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-gray-600 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <Icon name="Plus" size={16} /> Добавить шаг
      </button>
    </div>
  );
};

export default TutorialFields;
