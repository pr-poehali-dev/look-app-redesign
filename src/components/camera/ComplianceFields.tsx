import Icon from "@/components/ui/icon";
import PostExtras from "@/components/camera/PostExtras";
import PostStoryFields from "@/components/camera/PostStoryFields";

export type AgeRating = "0+" | "6+" | "12+" | "16+" | "18+";

export interface PublishCompliance {
  ageRating: AgeRating;
  adErid: string;
  adAdvertiser: string;
  extraImages: string[];
  place: string;
  address: string;
  workHours: string;
  tips: string;
  seriesTitle: string;
  brand: string;
  personalExperience: boolean;
  collabId: number | null;
}

export const DEFAULT_COMPLIANCE: PublishCompliance = {
  ageRating: "12+", adErid: "", adAdvertiser: "", extraImages: [], place: "", address: "", workHours: "", tips: "",
  seriesTitle: "", brand: "", personalExperience: false, collabId: null,
};

const AGES: AgeRating[] = ["0+", "6+", "12+", "16+", "18+"];

interface Props {
  isAd: boolean;
  setIsAd: (v: boolean) => void;
  value: PublishCompliance;
  onChange: (v: PublishCompliance) => void;
  isImage?: boolean;
}

const ComplianceFields = ({ isAd, setIsAd, value, onChange, isImage = true }: Props) => (
  <div className="flex flex-col gap-3">
    <PostExtras
      value={{ extraImages: value.extraImages, place: value.place, address: value.address, workHours: value.workHours, tips: value.tips }}
      onChange={(e) => onChange({ ...value, extraImages: e.extraImages, place: e.place, address: e.address, workHours: e.workHours, tips: e.tips })}
      allowImages={isImage}
    />
    <PostStoryFields value={value} onChange={onChange} />
    <div>
      <p className="text-white/60 text-xs font-semibold uppercase mb-2">Возрастная маркировка</p>
      <div className="flex gap-1.5">
        {AGES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange({ ...value, ageRating: a })}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              value.ageRating === a ? "bg-[#fe2c55] border-[#fe2c55] text-white" : "bg-white/10 border-white/15 text-white/70"
            }`}
          >
            {a}
          </button>
        ))}
      </div>
      {value.ageRating === "18+" && (
        <p className="text-white/40 text-xs mt-1.5">Публикацию увидят только пользователи, подтвердившие, что им есть 18 лет</p>
      )}
    </div>

    <button
      type="button"
      onClick={() => setIsAd(!isAd)}
      className="w-full flex items-center justify-between bg-white/10 border border-white/15 rounded-xl px-3 py-3"
    >
      <div className="flex items-center gap-2.5">
        <Icon name="Megaphone" size={16} className="text-white/70" />
        <div className="text-left">
          <p className="text-white text-sm font-medium">Это реклама</p>
          <p className="text-white/40 text-xs">Будет помечено «Реклама» и токеном ERID</p>
        </div>
      </div>
      <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${isAd ? "bg-[#fe2c55]" : "bg-white/15"}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isAd ? "translate-x-4" : "translate-x-0"}`} />
      </div>
    </button>

    {isAd && (
      <div className="flex flex-col gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
        <p className="text-white/50 text-xs">
          По закону о рекламе (38-ФЗ) реклама должна иметь токен ERID, который выдаёт оператор рекламных данных. Без него публикация невозможна.
        </p>
        <input
          value={value.adErid}
          onChange={(e) => onChange({ ...value, adErid: e.target.value.trim().slice(0, 100) })}
          placeholder="Токен ERID (обязательно)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
        />
        <input
          value={value.adAdvertiser}
          onChange={(e) => onChange({ ...value, adAdvertiser: e.target.value.slice(0, 200) })}
          placeholder="Рекламодатель (название или ИНН)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
        />
      </div>
    )}
  </div>
);

export default ComplianceFields;
