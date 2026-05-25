import Icon from "@/components/ui/icon";

interface Props {
  isOwner: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

const SettingsHeader = ({ isOwner, saving, onBack, onSave }: Props) => {
  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack}>
          <Icon name="ChevronLeft" size={24} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-xl">Настройки</h2>
      </div>
      {isOwner && (
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-[#fe2c55] px-4 py-1.5 rounded-full text-white text-xs font-bold disabled:opacity-40"
        >
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
      )}
    </div>
  );
};

export default SettingsHeader;
