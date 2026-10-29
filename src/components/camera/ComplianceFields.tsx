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

const ComplianceFields = ({ value, onChange, isImage = true }: Props) => (
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
  </div>
);

export default ComplianceFields;
