import Icon from "@/components/ui/icon";
import { useAcceptedCollabs } from "@/hooks/useBrandCollabs";
import type { PublishCompliance } from "./ComplianceFields";

interface Props {
  value: PublishCompliance;
  onChange: (v: PublishCompliance) => void;
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none";

const PostStoryFields = ({ value, onChange }: Props) => {
  const accepted = useAcceptedCollabs();

  return (
    <div className="flex flex-col gap-3">
      {accepted.length > 0 && (
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Предложение от бренда</p>
          <div className="flex flex-col gap-1.5">
            {accepted.map((c) => {
              const active = value.collabId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange(active
                    ? { ...value, collabId: null }
                    : { ...value, collabId: c.id, brand: c.brand_name })}
                  className={`flex items-center gap-2 text-left rounded-xl px-3 py-2 border transition-colors ${
                    active ? "bg-[#fe2c55]/20 border-[#fe2c55]" : "bg-white/10 border-white/15"
                  }`}
                >
                  <Icon name="Handshake" fallback="Gift" size={16} className="text-white/70 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{c.brand_name}: {c.product_title}</p>
                    <p className="text-white/40 text-xs">{active ? "Пост будет привязан к этому предложению" : "Нажмите, чтобы привязать пост"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-white/60 text-xs font-semibold uppercase mb-2">Бренд</p>
        <input
          value={value.brand}
          onChange={(e) => onChange({ ...value, brand: e.target.value.replace(/^[#@]+/, "").slice(0, 80) })}
          placeholder="Бренд, о котором пост (необязательно)"
          className={inputCls}
        />
      </div>

      <div>
        <p className="text-white/60 text-xs font-semibold uppercase mb-2">Серия постов</p>
        <input
          value={value.seriesTitle}
          onChange={(e) => onChange({ ...value, seriesTitle: e.target.value.slice(0, 100) })}
          placeholder="Название серии, например «Неделя в Стамбуле»"
          className={inputCls}
        />
        <p className="text-white/40 text-xs mt-1.5">Посты с одним названием соберутся в цепочку «Часть 1 из 3»</p>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...value, personalExperience: !value.personalExperience })}
        className="w-full flex items-center justify-between bg-white/10 border border-white/15 rounded-xl px-3 py-3"
      >
        <div className="flex items-center gap-2.5">
          <Icon name="Heart" size={16} className="text-white/70" />
          <div className="text-left">
            <p className="text-white text-sm font-medium">Личный опыт</p>
            <p className="text-white/40 text-xs">Я сам пользуюсь этим товаром или был в этом месте</p>
          </div>
        </div>
        <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${value.personalExperience ? "bg-[#fe2c55]" : "bg-white/15"}`}>
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value.personalExperience ? "translate-x-4" : "translate-x-0"}`} />
        </div>
      </button>
    </div>
  );
};

export default PostStoryFields;
