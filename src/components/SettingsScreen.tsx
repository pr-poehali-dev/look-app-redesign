import { useState } from "react";
import Icon from "@/components/ui/icon";

interface SettingsScreenProps {
  onBack: () => void;
}

const SAVED_ITEMS = [
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg", views: 142 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg", views: 389 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg", views: 256 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg", views: 621 },
];

const LANGUAGES = [
  { code: "ru", label: "Русский", active: true },
  { code: "en", label: "English", active: false },
  { code: "de", label: "Deutsch", active: false },
  { code: "fr", label: "Français", active: false },
  { code: "es", label: "Español", active: false },
  { code: "zh", label: "中文", active: false },
];

const BLOCKED = [
  { name: "spam_user_99", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg" },
  { name: "troll_2024", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg" },
];

const NOTIFICATIONS = [
  { label: "Лайки", value: true },
  { label: "Комментарии", value: true },
  { label: "Новые подписчики", value: true },
  { label: "Упоминания", value: false },
  { label: "Прямые эфиры", value: true },
  { label: "Сообщения", value: false },
];

// Sub-screens
const SavedScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
    <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
      <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
      <span className="flex-1 text-center text-black font-bold text-lg pr-7">Сохранённые</span>
    </div>
    {SAVED_ITEMS.length > 0 ? (
      <div className="grid grid-cols-3 gap-px bg-gray-200 mt-2">
        {SAVED_ITEMS.map((item, i) => (
          <div key={i} className="relative aspect-square overflow-hidden bg-gray-200">
            <img src={item.img} alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
              <Icon name="Play" size={10} className="text-white drop-shadow" />
              <span className="text-white text-[10px] font-semibold drop-shadow">{item.views}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center mt-20 gap-3">
        <Icon name="Bookmark" size={48} className="text-gray-300" />
        <p className="text-gray-400 text-sm">Нет сохранённых видео</p>
      </div>
    )}
    <div className="pb-28" />
  </div>
);

const LanguagesScreen = ({ onBack }: { onBack: () => void }) => {
  const [selected, setSelected] = useState("ru");
  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Языки</span>
      </div>
      <div className="mt-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code)}
            className="w-full flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100"
          >
            <span className="flex-1 text-black text-base text-left">{lang.label}</span>
            {selected === lang.code && <Icon name="Check" size={20} className="text-[#8b5cf6]" />}
          </button>
        ))}
      </div>
    </div>
  );
};

const BlockedScreen = ({ onBack }: { onBack: () => void }) => {
  const [blocked, setBlocked] = useState(BLOCKED);
  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Заблокированные</span>
      </div>
      <div className="mt-2">
        {blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3">
            <Icon name="Ban" size={48} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Нет заблокированных пользователей</p>
          </div>
        ) : blocked.map((u) => (
          <div key={u.name} className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
            <img src={u.avatar} className="w-10 h-10 rounded-full object-cover" alt={u.name} />
            <span className="flex-1 text-black text-sm font-medium">@{u.name}</span>
            <button
              onClick={() => setBlocked(b => b.filter(x => x.name !== u.name))}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600"
            >
              Разблокировать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const QrScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
    <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
      <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
      <span className="flex-1 text-center text-black font-bold text-lg pr-7">Мой QR-код</span>
    </div>
    <div className="flex flex-col items-center px-8 pt-10 gap-6">
      <div className="w-56 h-56 rounded-2xl bg-white shadow-lg border border-gray-100 flex items-center justify-center p-4">
        <div className="w-full h-full grid grid-cols-7 grid-rows-7 gap-0.5">
          {Array.from({ length: 49 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-sm ${[0,1,2,3,4,5,6,7,13,14,20,21,22,23,24,25,26,27,28,35,36,42,43,44,45,46,47,48,10,38,8,15,11,18,33,40].includes(i) ? "bg-[#8b5cf6]" : "bg-gray-100"}`}
            />
          ))}
        </div>
      </div>
      <div className="text-center">
        <p className="text-black font-bold text-lg">@look_user</p>
        <p className="text-gray-400 text-sm mt-1">Отсканируй код чтобы найти меня в Look</p>
      </div>
      <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8b5cf6] text-white font-semibold">
        <Icon name="Share2" size={18} className="text-white" />
        Поделиться QR-кодом
      </button>
    </div>
  </div>
);

const NotificationsScreen = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState(NOTIFICATIONS);
  const toggle = (label: string) => setSettings(s => s.map(n => n.label === label ? { ...n, value: !n.value } : n));
  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Уведомления</span>
      </div>
      <div className="mt-2">
        {settings.map((n) => (
          <div key={n.label} className="flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
            <span className="flex-1 text-black text-base">{n.label}</span>
            <button
              onClick={() => toggle(n.label)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${n.value ? "bg-[#8b5cf6]" : "bg-gray-300"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${n.value ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TextScreen = ({ onBack, title, text }: { onBack: () => void; title: string; text: string }) => (
  <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
    <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
      <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
      <span className="flex-1 text-center text-black font-bold text-lg pr-7">{title}</span>
    </div>
    <div className="px-4 py-6">
      <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
    </div>
  </div>
);

const SubscriptionScreen = ({ onBack }: { onBack: () => void }) => {
  const [current] = useState<"free" | "premium">("free");
  const [showPending, setShowPending] = useState(false);

  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Подписка</span>
      </div>

      <div className="px-4 pt-6 flex flex-col gap-4">
        {/* Бесплатный тариф */}
        <div className={`rounded-2xl border-2 p-5 bg-white ${current === "free" ? "border-[#8b5cf6]" : "border-gray-200"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-black">Бесплатный</span>
            {current === "free" && (
              <span className="text-xs font-semibold text-[#8b5cf6] bg-purple-50 px-2 py-1 rounded-full">Активен</span>
            )}
          </div>
          <p className="text-2xl font-bold text-black mb-4">0 ₽<span className="text-sm font-normal text-gray-400"> / мес</span></p>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="Check" size={16} className="text-green-500 flex-shrink-0" />
              Лента видео и сторис
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="Check" size={16} className="text-green-500 flex-shrink-0" />
              Загрузка видео
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="X" size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-gray-400">Реклама в ленте</span>
            </li>
          </ul>
        </div>

        {/* Премиум тариф */}
        <div className={`rounded-2xl border-2 p-5 bg-white ${current === "premium" ? "border-[#8b5cf6]" : "border-gray-200"} relative overflow-hidden`}>
          <div className="absolute top-3 right-3 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ЛУЧШИЙ ВЫБОР
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold text-black">Премиум</span>
            {current === "premium" && (
              <span className="text-xs font-semibold text-[#8b5cf6] bg-purple-50 px-2 py-1 rounded-full">Активен</span>
            )}
          </div>
          <p className="text-2xl font-bold text-black mb-4">50 ₽<span className="text-sm font-normal text-gray-400"> / мес</span></p>
          <ul className="flex flex-col gap-2 mb-5">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="Check" size={16} className="text-green-500 flex-shrink-0" />
              Лента видео и сторис
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="Check" size={16} className="text-green-500 flex-shrink-0" />
              Загрузка видео
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <Icon name="Check" size={16} className="text-green-500 flex-shrink-0" />
              <span className="font-medium text-black">Без рекламы</span>
            </li>
          </ul>
          {current !== "premium" && (
            <button
              onClick={() => setShowPending(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6228d7] text-white font-semibold text-base"
            >
              Подключить за 50 ₽/мес
            </button>
          )}
        </div>
      </div>

      {/* Модалка "скоро" */}
      {showPending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowPending(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-sm p-6 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-1">
              <Icon name="Clock" size={28} className="text-[#8b5cf6]" />
            </div>
            <p className="text-black font-bold text-lg text-center">Оплата скоро появится</p>
            <p className="text-gray-400 text-sm text-center">Мы подключаем оплату через ЮКассу. Совсем скоро вы сможете оформить премиум прямо здесь.</p>
            <button
              className="w-full py-3 rounded-xl bg-[#8b5cf6] text-white font-semibold mt-2"
              onClick={() => setShowPending(false)}
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      <div className="pb-28" />
    </div>
  );
};

// Main Settings
const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const [showSubscriptions, setShowSubscriptions] = useState(true);
  const [showChatButton, setShowChatButton] = useState(true);
  const [whoSees, setWhoSees] = useState("Все");
  const [showWhoSees, setShowWhoSees] = useState(false);
  const [screen, setScreen] = useState<string | null>(null);

  if (screen === "saved") return <SavedScreen onBack={() => setScreen(null)} />;
  if (screen === "languages") return <LanguagesScreen onBack={() => setScreen(null)} />;
  if (screen === "blocked") return <BlockedScreen onBack={() => setScreen(null)} />;
  if (screen === "qr") return <QrScreen onBack={() => setScreen(null)} />;
  if (screen === "notifications") return <NotificationsScreen onBack={() => setScreen(null)} />;
  if (screen === "terms") return <TextScreen onBack={() => setScreen(null)} title="Условия использования" text="Используя приложение Look, вы соглашаетесь с нашими условиями использования. Мы оставляем за собой право изменять условия в любое время. Продолжая использовать приложение, вы принимаете обновлённые условия. Запрещается публиковать незаконный, оскорбительный или вводящий в заблуждение контент. Мы вправе заблокировать аккаунт при нарушении правил." />;
  if (screen === "privacy") return <TextScreen onBack={() => setScreen(null)} title="Политика конфиденциальности" text="Мы уважаем вашу конфиденциальность. Собираемые данные используются только для улучшения работы приложения Look. Мы не передаём личные данные третьим лицам без вашего согласия. Вы вправе в любой момент запросить удаление своих данных через настройки аккаунта или обратившись в поддержку." />;
  if (screen === "subscription") return <SubscriptionScreen onBack={() => setScreen(null)} />;

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? "bg-[#8b5cf6]" : "bg-gray-300"}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );

  const Row = ({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) => (
    <button onClick={onPress} className="w-full flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
      <Icon name={icon as "Bookmark"} size={22} className="text-[#8b5cf6] flex-shrink-0" />
      <span className="flex-1 text-black text-base text-left">{label}</span>
      <Icon name="ChevronRight" size={18} className="text-gray-400" />
    </button>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-4 py-2 bg-gray-100">
      <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">{title}</span>
    </div>
  );

  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <Icon name="ArrowLeft" size={22} className="text-black" />
        </button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Настройки</span>
      </div>

      <div className="mt-2">
        <Row icon="Star" label="Подписка и тарифы" onPress={() => setScreen("subscription")} />
        <Row icon="Bookmark" label="Сохранённые" onPress={() => setScreen("saved")} />
        <Row icon="Languages" label="Языки" onPress={() => setScreen("languages")} />
        <Row icon="Ban" label="Заблокированные" onPress={() => setScreen("blocked")} />
        <Row icon="QrCode" label="Мой QR-код" onPress={() => setScreen("qr")} />
      </div>

      <SectionHeader title="Privacy" />
      <div>
        <div className="relative">
          <button
            onClick={() => setShowWhoSees(v => !v)}
            className="w-full flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100"
          >
            <Icon name="Eye" size={22} className="text-[#8b5cf6] flex-shrink-0" />
            <span className="flex-1 text-black text-base text-left leading-tight">Кто видит публикации</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-3 py-1.5">
              <span className="text-gray-500 text-sm">{whoSees}</span>
              <Icon name="ChevronDown" size={14} className="text-gray-400" />
            </div>
          </button>
          {showWhoSees && (
            <div className="bg-white border border-gray-100 shadow-lg rounded-xl mx-4 overflow-hidden z-10">
              {["Все", "Подписчики", "Только я"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setWhoSees(opt); setShowWhoSees(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 ${whoSees === opt ? "text-[#8b5cf6] font-semibold" : "text-black"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
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
        <Row icon="Bell" label="Уведомления" onPress={() => setScreen("notifications")} />
      </div>

      <SectionHeader title="General" />
      <div>
        <Row icon="Info" label="Условия использования" onPress={() => setScreen("terms")} />
        <Row icon="Info" label="Политика конфиденциальности" onPress={() => setScreen("privacy")} />
        <button className="w-full flex items-center gap-4 px-4 py-4 bg-white border-b border-gray-100">
          <Icon name="LogOut" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base text-left">Выйти</span>
        </button>
      </div>

      <div className="pb-28" />
    </div>
  );
};

export default SettingsScreen;