import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useAuth } from "@/context/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { useSavedList, SavedItem } from "@/hooks/useSaved";
import SavedItemViewer from "@/components/SavedItemViewer";

interface SettingsScreenProps {
  onBack: () => void;
}

const LANGUAGES = SUPPORTED_LANGUAGES;

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
const SavedScreen = ({ onBack }: { onBack: () => void }) => {
  const items = useSavedList();
  const [opened, setOpened] = useState<SavedItem | null>(null);
  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">Сохранённые</span>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-px bg-gray-200 mt-2">
          {items.map(item => {
            const isVideo = item.type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(item.image);
            return (
              <button
                key={`${item.type}:${item.id}`}
                onClick={() => setOpened(item)}
                className="relative aspect-square overflow-hidden bg-gray-200 active:opacity-80"
              >
                {isVideo ? (
                  <video src={item.image} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                  <Icon name={item.type === "video" ? "Play" : "Image"} size={10} className="text-white drop-shadow" />
                  {item.handle && (
                    <span className="text-white text-[10px] font-semibold drop-shadow">@{item.handle}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-20 gap-3">
          <Icon name="Bookmark" size={48} className="text-gray-300" />
          <p className="text-gray-400 text-sm">Нет сохранённых видео</p>
        </div>
      )}
      <div className="pb-28" />
      </div>
      {opened && <SavedItemViewer item={opened} onClose={() => setOpened(null)} />}
    </div>
  );
};

const LanguagesScreen = ({ onBack }: { onBack: () => void }) => {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(i18n.language?.split("-")[0] || "ru");

  const handleSelect = (code: string) => {
    setSelected(code);
    i18n.changeLanguage(code);
    try {
      localStorage.setItem("app_lang", code);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent("app-lang-change", { detail: code }));
  };

  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">{t("settings.languages")}</span>
      </div>
      <div className="mt-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className="w-full flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100"
          >
            <span className="flex-1 text-black text-base md:text-sm text-left">{lang.label}</span>
            {selected === lang.code && <Icon name="Check" size={20} className="text-[#8b5cf6]" />}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

const BlockedScreen = ({ onBack }: { onBack: () => void }) => {
  const [blocked, setBlocked] = useState(BLOCKED);
  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">Заблокированные</span>
      </div>
      <div className="mt-2">
        {blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 gap-3">
            <Icon name="Ban" size={48} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Нет заблокированных пользователей</p>
          </div>
        ) : blocked.map((u) => (
          <div key={u.name} className="flex items-center gap-3 px-4 py-3 md:py-2.5 bg-white border-b border-gray-100">
            <div className="w-10 h-10 md:w-9 md:h-9 rounded-full overflow-hidden flex-shrink-0">
              <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
            </div>
            <span className="flex-1 text-black text-sm font-medium">@{u.name}</span>
            <button
              onClick={() => setBlocked(b => b.filter(x => x.name !== u.name))}
              className="px-3 py-1.5 md:py-1 rounded-lg border border-gray-300 text-sm md:text-xs text-gray-600"
            >
              Разблокировать
            </button>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

const QrScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
    <div className="md:max-w-2xl md:mx-auto">
    <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
      <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
      <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">Мой QR-код</span>
    </div>
    <div className="flex flex-col items-center px-8 pt-10 md:pt-6 gap-6 md:gap-4">
      <div className="w-56 h-56 md:w-44 md:h-44 rounded-2xl bg-white shadow-lg border border-gray-100 flex items-center justify-center p-4">
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
        <p className="text-gray-400 text-sm mt-1">Отсканируй код чтобы найти меня в Лоок</p>
      </div>
      <button className="flex items-center gap-2 px-6 py-3 md:py-2.5 rounded-xl bg-[#8b5cf6] text-white font-semibold md:text-sm">
        <Icon name="Share2" size={18} className="text-white" />
        Поделиться QR-кодом
      </button>
    </div>
    </div>
  </div>
);

const NotificationsScreen = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState(NOTIFICATIONS);
  const toggle = (label: string) => setSettings(s => s.map(n => n.label === label ? { ...n, value: !n.value } : n));
  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">Уведомления</span>
      </div>
      <div className="mt-2">
        {settings.map((n) => (
          <div key={n.label} className="flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100">
            <span className="flex-1 text-black text-base md:text-sm">{n.label}</span>
            <button
              onClick={() => toggle(n.label)}
              className={`relative w-12 h-6 md:w-10 md:h-5 rounded-full transition-colors duration-200 ${n.value ? "bg-[#8b5cf6]" : "bg-gray-300"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 md:w-4 md:h-4 rounded-full bg-white shadow transition-transform duration-200 ${n.value ? "translate-x-6 md:translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

const ADMIN_API_URL = "https://functions.poehali.dev/c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7";

const LegalScreen = ({ onBack, title, settingKey, fallback }: { onBack: () => void; title: string; settingKey: "privacy_policy" | "terms_of_use"; fallback: string }) => {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(ADMIN_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "settings_public_get" }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const value = data?.settings?.[settingKey];
        if (!cancelled) setText(value || fallback);
      } catch {
        if (!cancelled) setText(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [settingKey, fallback]);

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
          <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
          <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">{title}</span>
        </div>
        <div className="px-4 py-6 md:py-4">
          {loading ? (
            <p className="text-gray-400 text-sm">Загрузка...</p>
          ) : (
            <p className="text-gray-600 text-sm md:text-xs leading-relaxed whitespace-pre-wrap">{text}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const AUTH_API_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

type ProfileLinkObj = { url: string; label: string };

const normalizeLinks = (raw: unknown): ProfileLinkObj[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((l): ProfileLinkObj => {
    if (typeof l === "string") return { url: l, label: "" };
    if (l && typeof l === "object" && "url" in l) {
      const obj = l as { url?: unknown; label?: unknown };
      return { url: String(obj.url || ""), label: String(obj.label || "") };
    }
    return { url: "", label: "" };
  }).filter(l => l.url);
};

const EditProfileScreen = ({ onBack }: { onBack: () => void }) => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState<string>(user?.name || "");
  const [handle, setHandle] = useState<string>(user?.handle || "");
  const [gender, setGender] = useState<string>(user?.gender || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [phone, setPhone] = useState<string>(() => {
    const p = user?.phone || "";
    return p.startsWith("+7") ? p.slice(2).trim() : p;
  });
  const [links, setLinks] = useState<ProfileLinkObj[]>(normalizeLinks(user?.links));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const genderLabel = gender === "male" ? "Мужской" : gender === "female" ? "Женский" : gender === "other" ? "Другой" : "Не указан";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const token = localStorage.getItem("auth_token") || "";
    if (!file || !token) return;
    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const ext = file.name.split(".").pop() || "jpg";
      try {
        const res = await fetch(AUTH_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_avatar", token, file: base64, file_type: file.type, ext }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.avatar) updateUser({ avatar: data.avatar });
      } catch { /* ignore */ }
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("auth_token") || "";
      const phoneClean = phone.replace(/[^\d]/g, "");
      const phoneFull = phoneClean ? "+7" + phoneClean : "";
      const body: Record<string, unknown> = {
        action: "update_profile",
        token,
        name: name.trim(),
        handle: handle.trim(),
        email: email.trim(),
        gender,
        links: links.filter(l => l.url.trim()),
      };
      if (phoneClean) body.phone = phoneFull;
      else body.phone = "";
      const res = await fetch(AUTH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.error) {
        setError(data.error);
      } else if (data.user) {
        updateUser(data.user);
        onBack();
      }
    } catch {
      setError("Не удалось сохранить. Попробуй ещё раз");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto pb-32">
        <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white">
          <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={24} className="text-black" /></button>
          <span className="flex-1 text-black font-bold text-lg md:text-base">Редактировать профиль</span>
        </div>

        {/* Avatar */}
        <div className="px-4 py-4 flex items-center">
          <input
            type="file"
            accept="image/*"
            ref={avatarInputRef}
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#c084fc] to-[#8b5cf6] flex items-center justify-center overflow-hidden"
          >
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-white font-black text-4xl">{(name?.[0] || user?.name?.[0] || "?").toUpperCase()}</span>
            }
            <span className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center border-2 border-white">
              {avatarLoading
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icon name="Pencil" size={14} className="text-white" />
              }
            </span>
          </button>
        </div>

        {/* Полное имя */}
        <div className="px-4 pt-3">
          <label className="text-black text-base">Полное имя</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Введите здесь..."
            className="w-full mt-2 px-0 py-3 bg-gray-50 text-gray-400 text-base rounded-md px-3 outline-none focus:text-black"
          />
        </div>

        {/* Имя пользователя */}
        <div className="px-4 pt-5">
          <label className="text-black text-base">Имя пользователя</label>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value.replace(/[^a-z0-9_.]/gi, ""))}
            placeholder="Введите здесь..."
            className="w-full mt-2 px-3 py-3 bg-gray-50 text-gray-400 text-base rounded-md outline-none focus:text-black"
          />
        </div>

        {/* Пол */}
        <div className="px-4 pt-5 relative">
          <label className="text-black text-base">Пол</label>
          <button
            type="button"
            onClick={() => setShowGender(s => !s)}
            className="w-full mt-2 px-3 py-3 bg-gray-50 text-base rounded-md outline-none flex items-center justify-between"
          >
            <span className={gender ? "text-black" : "text-gray-400"}>{genderLabel}</span>
            <Icon name="ChevronDown" size={18} className="text-gray-400" />
          </button>
          {showGender && (
            <div className="absolute left-4 right-4 mt-1 z-10 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
              {[
                { v: "male", l: "Мужской" },
                { v: "female", l: "Женский" },
                { v: "other", l: "Другой" },
                { v: "", l: "Не указан" },
              ].map(opt => (
                <button
                  key={opt.l}
                  onClick={() => { setGender(opt.v); setShowGender(false); }}
                  className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 last:border-0 ${gender === opt.v ? "text-[#8b5cf6] font-semibold" : "text-black"}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Email */}
        <div className="px-4 pt-5">
          <label className="text-black text-base">Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Введите здесь..."
            className="w-full mt-2 px-3 py-3 bg-gray-50 text-gray-400 text-base rounded-md outline-none focus:text-black"
          />
        </div>

        {/* Телефон */}
        <div className="px-4 pt-5">
          <label className="text-black text-base">Телефон</label>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex items-center gap-1 px-3 py-3 bg-gray-700 text-white text-sm rounded-md">
              <span>RU +7</span>
              <Icon name="ChevronDown" size={14} className="text-white/70" />
            </div>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^\d\-() ]/g, ""))}
              type="tel"
              inputMode="tel"
              placeholder="Введите здесь..."
              className="flex-1 px-3 py-3 bg-gray-50 text-gray-400 text-base rounded-md outline-none focus:text-black"
            />
          </div>
        </div>

        {/* Ссылки */}
        <div className="px-4 pt-5">
          <div className="flex items-center gap-2">
            <span className="text-black text-base">Ссылки</span>
            <button
              type="button"
              onClick={() => setLinks(prev => [...prev, { url: "", label: "" }])}
              className="w-6 h-6 rounded-full bg-[#8b5cf6] flex items-center justify-center"
            >
              <Icon name="Plus" size={14} className="text-white" />
            </button>
          </div>
          {links.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {links.map((ln, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={ln.url}
                    onChange={e => setLinks(prev => prev.map((p, idx) => idx === i ? { ...p, url: e.target.value } : p))}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2.5 bg-gray-50 text-black text-sm rounded-md outline-none"
                  />
                  <button
                    onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-5 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        {/* Кнопка Сохранить */}
        <div className="px-4 pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-xl bg-gray-700 text-white font-bold text-base disabled:opacity-50"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SubscriptionScreen = ({ onBack }: { onBack: () => void }) => {
  const [current] = useState<"free" | "premium">("free");
  const [showPending, setShowPending] = useState(false);

  return (
    <div className="h-full bg-gray-100 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">Подписка</span>
      </div>

      <div className="px-4 pt-6 md:pt-4 flex flex-col gap-4 md:gap-3">
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
    </div>
  );
};

// Main Settings
const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const { user } = useAuth();
  const [showSubscriptions, setShowSubscriptions] = useState(true);
  const [showChatButton, setShowChatButton] = useState(true);
  const [whoSees, setWhoSees] = useState("Все");
  const [showWhoSees, setShowWhoSees] = useState(false);
  const [screen, setScreen] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "sent" | "already" | "error">("idle");
  const [emailVerified, setEmailVerified] = useState<boolean | null>(() => {
    if (typeof window === "undefined" || !user?.email) return null;
    return localStorage.getItem(`email_verified:${user.email.toLowerCase()}`) === "1" ? true : null;
  });

  useEffect(() => {
    if (!user?.email) { setEmailVerified(null); return; }
    const cached = localStorage.getItem(`email_verified:${user.email.toLowerCase()}`);
    if (cached === "1") { setEmailVerified(true); return; }
    fetch("https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_verified", email: user.email }),
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const verified = !!data.verified;
        setEmailVerified(verified);
        if (verified) localStorage.setItem(`email_verified:${user.email!.toLowerCase()}`, "1");
      })
      .catch(() => setEmailVerified(false));
  }, [user?.email]);

  const sendVerifyEmail = async () => {
    if (!user?.email || verifyStatus === "loading") return;
    setVerifyStatus("loading");
    try {
      const res = await fetch("https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_send", email: user.email, origin: window.location.origin }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.already) { setVerifyStatus("already"); setEmailVerified(true); }
      else if (data.sent) setVerifyStatus("sent");
      else setVerifyStatus("error");
    } catch {
      setVerifyStatus("error");
    }
  };

  if (screen === "saved") return <SavedScreen onBack={() => setScreen(null)} />;
  if (screen === "languages") return <LanguagesScreen onBack={() => setScreen(null)} />;
  if (screen === "blocked") return <BlockedScreen onBack={() => setScreen(null)} />;
  if (screen === "qr") return <QrScreen onBack={() => setScreen(null)} />;
  if (screen === "notifications") return <NotificationsScreen onBack={() => setScreen(null)} />;
  if (screen === "edit_profile") return <EditProfileScreen onBack={() => setScreen(null)} />;
  if (screen === "terms") return <LegalScreen onBack={() => setScreen(null)} title="Условия использования" settingKey="terms_of_use" fallback="Используя приложение Look, вы соглашаетесь с нашими условиями использования." />;
  if (screen === "privacy") return <LegalScreen onBack={() => setScreen(null)} title="Политика конфиденциальности" settingKey="privacy_policy" fallback="Мы уважаем вашу конфиденциальность." />;
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
    <button onClick={onPress} className="w-full flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100">
      <Icon name={icon as "Bookmark"} size={22} className="text-[#8b5cf6] flex-shrink-0" />
      <span className="flex-1 text-black text-base md:text-sm text-left">{label}</span>
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
      <div className="md:max-w-2xl md:mx-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-10 md:pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <Icon name="ArrowLeft" size={22} className="text-black" />
        </button>
        <span className="flex-1 text-center text-black font-bold text-lg md:text-base pr-7">Настройки</span>
      </div>

      {user?.email && emailVerified === false && (
        <div className="mx-4 mt-3 rounded-2xl bg-white p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#fe2c55]/10 flex items-center justify-center flex-shrink-0">
            <Icon name="MailCheck" size={18} className="text-[#fe2c55]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-black font-semibold text-sm">Подтверждение email</p>
            <p className="text-gray-500 text-xs mt-0.5 break-all">{user.email}</p>
            {verifyStatus === "sent" && <p className="text-green-600 text-xs mt-2">Письмо отправлено! Проверь почту.</p>}
            {verifyStatus === "already" && <p className="text-green-600 text-xs mt-2">Email уже подтверждён.</p>}
            {verifyStatus === "error" && <p className="text-red-600 text-xs mt-2">Не удалось отправить письмо.</p>}
            <button
              onClick={sendVerifyEmail}
              disabled={verifyStatus === "loading" || verifyStatus === "sent" || verifyStatus === "already"}
              className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white text-xs font-semibold disabled:opacity-50"
            >
              {verifyStatus === "loading" ? "Отправляем..." : verifyStatus === "sent" ? "Отправлено" : verifyStatus === "already" ? "Подтверждено" : "Отправить письмо"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-2">
        <Row icon="UserPen" label="Редактировать профиль" onPress={() => setScreen("edit_profile")} />
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
        <button className="w-full flex items-center gap-4 px-4 py-4 md:py-3 bg-white border-b border-gray-100">
          <Icon name="LogOut" size={22} className="text-[#8b5cf6] flex-shrink-0" />
          <span className="flex-1 text-black text-base md:text-sm text-left">Выйти</span>
        </button>
      </div>

      <div className="pb-28" />
      </div>
    </div>
  );
};

export default SettingsScreen;