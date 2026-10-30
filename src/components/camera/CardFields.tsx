import Icon from "@/components/ui/icon";
import { TOPICS } from "@/lib/topics";
import { useMyBoards } from "@/hooks/useBoards";
import type { PublishCompliance } from "./ComplianceFields";

interface Props {
  value: PublishCompliance;
  onChange: (v: PublishCompliance) => void;
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none";

const CardFields = ({ value, onChange }: Props) => {
  const { boards } = useMyBoards();
  const writable = boards.filter((b) => b.my_role !== "member");
  const isCard = value.postMode === "card";

  const setPoint = (i: number, text: string) => {
    const next = [...value.cardPoints];
    next[i] = text.slice(0, 60);
    onChange({ ...value, cardPoints: next });
  };

  const toggleBoard = (id: number) => {
    const has = value.boardIds.includes(id);
    if (!has && value.boardIds.length >= 3) return;
    onChange({ ...value, boardIds: has ? value.boardIds.filter((x) => x !== id) : [...value.boardIds, id] });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-white/60 text-xs font-semibold uppercase mb-2">Вид публикации</p>
        <div className="flex gap-1.5">
          {([["photo", "Просто фото"], ["card", "Карточка"]] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...value, postMode: mode })}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                value.postMode === mode ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isCard && (
        <div className="flex flex-col gap-2">
          <div>
            <input
              value={value.cardTitle}
              onChange={(e) => onChange({ ...value, cardTitle: e.target.value.slice(0, 30) })}
              placeholder="Заголовок карточки"
              className={inputCls}
            />
            <p className="text-white/40 text-xs mt-1 text-right">{value.cardTitle.length}/30</p>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/10 text-white/70 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <input
                value={value.cardPoints[i] || ""}
                onChange={(e) => setPoint(i, e.target.value)}
                placeholder={`Тезис ${i + 1} (до 60 символов)`}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-white/60 text-xs font-semibold uppercase mb-2">Тема</p>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => onChange({ ...value, topic: value.topic === t.slug ? "" : t.slug })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                value.topic === t.slug ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {writable.length > 0 && (
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Сохранить на доски (до 3)</p>
          <div className="flex flex-col gap-1.5">
            {writable.map((b) => {
              const active = value.boardIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBoard(b.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-left transition-colors ${
                    active ? "bg-[#FF5A3C]/20 border-[#FF5A3C]" : "bg-white/10 border-white/15"
                  }`}
                >
                  <Icon name={b.is_collab ? "Users" : "Layers"} size={15} className="text-white/70 flex-shrink-0" />
                  <span className="flex-1 text-white text-sm truncate">{b.title}</span>
                  {active && <Icon name="Check" size={16} className="text-[#FF5A3C]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default CardFields;
