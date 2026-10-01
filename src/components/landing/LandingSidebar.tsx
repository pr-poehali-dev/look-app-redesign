import { useState } from "react";
import Icon from "@/components/ui/icon";

export type LandingTab = "foryou" | "explore";

interface LandingSidebarProps {
  tab: LandingTab;
  onTab: (t: LandingTab) => void;
  onLocked: (reason: string) => void;
  onLogin: () => void;
}

const LOGO =
  "https://static.rustore.ru/imgproxy/vs3_tA6Fiyv_VxNKTcByf1sXvc4-Qy2G_VlA-uzDgTs/preset:web_app_icon_62/plain/https://static.rustore.ru/2025/9/16/49/apk/2063656157/content/ICON/586db88b-5139-4dc5-b8f4-5a7e07f892ba.png@webp";

const LandingSidebar = ({ tab, onTab, onLocked, onLogin }: LandingSidebarProps) => {
  const [query, setQuery] = useState("");

  const locked = (icon: string, label: string, reason: string) => (
    <button
      key={label}
      onClick={() => onLocked(reason)}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[17px] font-semibold text-[#161823] hover:bg-black/5"
    >
      <Icon name={icon} size={26} />
      {label}
    </button>
  );

  return (
    <aside className="hidden h-full w-[260px] shrink-0 flex-col overflow-y-auto border-r border-black/5 bg-white px-4 py-5 lg:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <img src={LOGO} alt="Лоок" className="h-9 w-9 rounded-xl object-cover" />
        <span className="text-2xl font-black text-[#14723f]">Лоок</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLocked("Войди, чтобы искать видео, людей и сообщества.");
        }}
        className="mb-3 flex items-center gap-2 rounded-full bg-black/5 px-4 py-2.5"
      >
        <Icon name="Search" size={18} className="text-black/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск"
          className="w-full bg-transparent text-sm text-[#161823] outline-none placeholder:text-black/40"
        />
      </form>

      <nav className="flex flex-col gap-0.5">
        <button
          onClick={() => onTab("foryou")}
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[17px] font-bold hover:bg-black/5 ${
            tab === "foryou" ? "text-[#14723f]" : "text-[#161823]"
          }`}
        >
          <Icon name="Home" size={26} />
          Рекомендации
        </button>
        <button
          onClick={() => onTab("explore")}
          className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[17px] font-bold hover:bg-black/5 ${
            tab === "explore" ? "text-[#14723f]" : "text-[#161823]"
          }`}
        >
          <Icon name="Compass" size={26} />
          Смотреть
        </button>
        {locked("UserPlus", "Подписки", "Войди, чтобы видеть ролики тех, на кого ты подписан.")}
        {locked("Users", "Сообщества", "Войди, чтобы находить единомышленников и вступать в сообщества.")}
        {locked("MessageCircle", "Чаты и звонки", "Войди, чтобы общаться в чатах и созваниваться с друзьями.")}
        {locked("Radio", "Трансляции", "Войди, чтобы смотреть и вести прямые эфиры.")}
        {locked("PlusSquare", "Загрузить", "Войди, чтобы публиковать свои видео и фото.")}
        {locked("ShoppingBag", "Магазин", "Войди, чтобы покупать и продавать товары прямо в приложении.")}
        {locked("User", "Профиль", "Войди, чтобы открыть свой профиль.")}
        {locked("MoreHorizontal", "Ещё", "Войди, чтобы увидеть все возможности Лоок.")}
      </nav>

      <button
        onClick={onLogin}
        className="mt-5 w-full rounded-lg bg-[#14723f] py-3 text-base font-bold text-white transition-opacity hover:opacity-90"
      >
        Войти
      </button>

      <div className="mt-5 border-t border-black/5 pt-4 text-xs leading-5 text-black/50">
        <p className="font-semibold text-black/70">Социальная сеть нового поколения</p>
        <p>Смотри. Делись. Общайся. Будь собой.</p>
        <p className="mt-3">© 2026 Лоок</p>
      </div>
    </aside>
  );
};

export default LandingSidebar;
