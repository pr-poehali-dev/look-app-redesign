import { useState } from "react";
import Icon from "@/components/ui/icon";

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const [showSubscriptions, setShowSubscriptions] = useState(true);
  const [showChatButton, setShowChatButton] = useState(true);
  const [whoSees, setWhoSees] = useState("Все");

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? "bg-[#8b5cf6]" : "bg-gray-300"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0.5"}`}
      />
    </button>
  );

  const Row = ({ icon, label, right }: { icon: string; label: string; right?: React.ReactNode }) => (
    <div className="flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
      <Icon name={icon as "Bookmark"} size={22} className="text-[#8b5cf6] flex-shrink-0" />
      <span className="flex-1 text-black text-base">{label}</span>
      {right ?? <Icon name="ChevronRight" size={18} className="text-gray-400" />}
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-4 py-2 bg-gray-100">
      <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">{title}</span>
    </div>
  );

  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <Icon name="ArrowLeft" size={22} className="text-black" />
        </button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Настройки</span>
      </div>

      {/* Main items */}
      <div className="mt-2">
        <Row icon="Bookmark" label="Сохранённые" />
        <Row icon="Languages" label="Языки" />
        <Row icon="Ban" label="Заблокированные" />
        <Row icon="QrCode" label="Мой QR-код" />
      </div>

      {/* Privacy */}
      <SectionHeader title="Privacy" />
      <div>
        <div className="flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
          <Icon name="Eye" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base leading-tight">Кто видит<br />публикации</span>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-3 py-1.5">
            <span className="text-gray-500 text-sm">{whoSees}</span>
            <Icon name="ChevronDown" size={14} className="text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
          <Icon name="Users" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base">Показывать подписки</span>
          <Toggle value={showSubscriptions} onChange={() => setShowSubscriptions(v => !v)} />
        </div>
        <div className="flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
          <Icon name="MessageCircle" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base">Показывать кнопку чата</span>
          <Toggle value={showChatButton} onChange={() => setShowChatButton(v => !v)} />
        </div>
        <Row icon="Bell" label="Уведомления" />
      </div>

      {/* General */}
      <SectionHeader title="General" />
      <div>
        <Row icon="Info" label="Условиями использования" />
        <Row icon="Info" label="Политикой конфиденциальности" />
        <div className="flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
          <Icon name="LogOut" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base">Выйти</span>
        </div>
        <div className="flex items-center gap-4 px-4 py-4 bg-white">
          <Icon name="Trash2" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base">Удалить аккаунт</span>
        </div>
      </div>

      <div className="pb-28" />
    </div>
  );
};

export default SettingsScreen;
