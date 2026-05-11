import Icon from "@/components/ui/icon";

interface Props {
  showStartForm: boolean;
  streamTitle: string;
  streamCategory: string;
  onTitleChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onOpenForm: () => void;
  onCancelForm: () => void;
  onStartLive: () => void;
}

const LiveStreamStartForm = ({
  showStartForm,
  streamTitle,
  streamCategory,
  onTitleChange,
  onCategoryChange,
  onOpenForm,
  onCancelForm,
  onStartLive,
}: Props) => {
  if (!showStartForm) {
    return (
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-24 h-24 rounded-full bg-[#fe2c55]/20 border-2 border-[#fe2c55] flex items-center justify-center animate-pulse">
          <Icon name="Radio" size={40} className="text-[#fe2c55]" />
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-2xl mb-2">Прямой эфир</h2>
          <p className="text-white/50 text-sm">Начни трансляцию — зрители уже ждут</p>
        </div>
        <button onClick={onOpenForm}
          className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-3">
          <Icon name="Radio" size={22} />
          Начать трансляцию
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-20 flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-full max-w-sm bg-black/60 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-white font-bold text-lg">Настрой эфир</p>
        <input
          autoFocus
          value={streamTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Название эфира..."
          maxLength={80}
          className="w-full bg-white/10 text-white placeholder-white/40 px-4 py-3 rounded-xl outline-none text-sm"
        />
        <select
          value={streamCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full bg-white/10 text-white px-4 py-3 rounded-xl outline-none text-sm appearance-none"
        >
          <option value="Общее">Общее</option>
          <option value="Музыка">Музыка</option>
          <option value="Игры">Игры</option>
          <option value="Спорт">Спорт</option>
          <option value="Путешествия">Путешествия</option>
          <option value="Еда">Еда</option>
          <option value="Юмор">Юмор</option>
          <option value="Образование">Образование</option>
        </select>
        <button onClick={onStartLive}
          className="w-full py-3.5 rounded-xl bg-[#fe2c55] text-white font-bold text-base active:scale-95 transition-all flex items-center justify-center gap-2">
          <Icon name="Radio" size={18} />
          В эфир
        </button>
        <button onClick={onCancelForm}
          className="w-full py-2.5 rounded-xl text-white/60 text-sm">
          Отмена
        </button>
      </div>
    </div>
  );
};

export default LiveStreamStartForm;
