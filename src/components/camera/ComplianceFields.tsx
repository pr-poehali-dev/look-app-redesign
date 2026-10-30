import PostExtras from "@/components/camera/PostExtras";
import PostStoryFields from "@/components/camera/PostStoryFields";
import CardFields from "@/components/camera/CardFields";
import { addItemToBoards } from "@/hooks/useBoards";
import { submitPendingChallenge } from "@/hooks/useChallenge";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";

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
  postMode: "photo" | "card";
  cardTitle: string;
  cardPoints: string[];
  topic: string;
  boardIds: number[];
  isCommercial: boolean;
}

export const DEFAULT_COMPLIANCE: PublishCompliance = {
  ageRating: "12+", adErid: "", adAdvertiser: "", extraImages: [], place: "", address: "", workHours: "", tips: "",
  seriesTitle: "", brand: "", personalExperience: false, collabId: null,
  postMode: "photo", cardTitle: "", cardPoints: ["", "", ""], topic: "", boardIds: [], isCommercial: false,
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
    <CardFields value={value} onChange={onChange} />
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
              value.ageRating === a ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"
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

export const complianceUploadMeta = (c: PublishCompliance) => ({
  cardTitle: c.postMode === "card" ? c.cardTitle.trim() : "",
  cardPoints: c.postMode === "card" ? c.cardPoints.map((p) => p.trim()).filter(Boolean) : [],
  topic: c.topic,
  isCommercial: c.isCommercial,
});

export const attachToBoards = async (
  c: PublishCompliance,
  userId: string | undefined,
  reg: { id?: number; url?: string; thumb?: string; type?: string } | null,
  caption: string,
) => {
  if (userId && reg?.id && c.postMode === "card") trackEvent("card_created", userId);
  if (userId && reg?.id) {
    const badge = await submitPendingChallenge(userId, reg.id);
    if (badge) window.dispatchEvent(new CustomEvent("badge-earned", { detail: { title: badge } }));
  }
  if (!userId || !reg?.id || c.boardIds.length === 0) return;
  const isVideo = reg.type === "video";
  await addItemToBoards(
    c.boardIds,
    {
      itemType: isVideo ? "video" : "post",
      itemId: reg.id,
      image: (isVideo ? reg.thumb : reg.url) || reg.url || "",
      title: (c.postMode === "card" && c.cardTitle.trim()) || caption.slice(0, 120),
    },
    userId,
  );
};
