import Icon from "@/components/ui/icon";
import { useTheme } from "@/context/ThemeContext";

interface LandingSidebarProps {
  onLocked: (reason: string) => void;
  onLogin: () => void;
  onHome: () => void;
  onOpenDoc: (doc: "terms" | "privacy") => void;
}

const ITEM =
  "flex items-center gap-4 px-4 py-2 rounded-xl transition-colors text-left hover:bg-white/5";

const LandingSidebar = ({ onLocked, onLogin, onOpenDoc, onHome }: LandingSidebarProps) => {
  const { theme, toggle } = useTheme();

  const locked = (icon: string, label: string, reason: string) => (
    <button key={label} onClick={() => onLocked(reason)} className={ITEM}>
      <Icon name={icon} size={22} className="opacity-80" />
      <span className="text-sm opacity-90">{label}</span>
    </button>
  );

  return (
    <aside
      className="hidden md:flex flex-col w-[240px] xl:w-[280px] h-full border-r border-white/10 flex-shrink-0 z-40"
      style={{ background: "var(--look-sidebar-bg)", color: "var(--look-fg)" }}
    >
      <div className="px-6 pt-4 pb-2">
        <span className="font-bold text-xl tracking-tight">Лоок</span>
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto min-h-0">
        <button onClick={onHome} className={`${ITEM} bg-white/10`}>
          <Icon name="Home" size={22} />
          <span className="text-sm font-bold">Главная</span>
        </button>
        {locked("LayoutList", "Лента", "Войди, чтобы смотреть ленту ваших подписок.")}
        <button
          onClick={() => onLocked("Войди, чтобы публиковать свои видео и фото.")}
          className={ITEM}
        >
          <div className="relative flex items-center h-6 w-9">
            <div className="w-6 h-5 rounded-md absolute left-0" style={{ background: "var(--look-accent)", opacity: 0.6 }} />
            <div className="w-6 h-5 rounded-md absolute right-0" style={{ background: "var(--look-accent)" }} />
            <div
              className="w-6 h-5 rounded-md flex items-center justify-center relative z-10 mx-auto"
              style={{ background: "#ffffff", border: "1.5px solid rgba(0,0,0,0.15)" }}
            >
              <Icon name="Plus" size={14} strokeWidth={3} style={{ color: "#1f6b3a" }} />
            </div>
          </div>
          <span className="text-sm opacity-90">Создать</span>
        </button>
        {locked("MessageCircle", "Чаты", "Войди, чтобы общаться в чатах и созваниваться с друзьями.")}
        {locked("User", "Профиль", "Войди, чтобы открыть свой профиль.")}
        {locked("LifeBuoy", "Поддержка", "Войди, чтобы написать в поддержку.")}
        <button onClick={() => onOpenDoc("terms")} className={ITEM}>
          <Icon name="FileText" size={22} className="opacity-80" />
          <span className="text-sm opacity-90">Условия использования</span>
        </button>
        <button onClick={() => onOpenDoc("privacy")} className={ITEM}>
          <Icon name="ShieldCheck" size={22} className="opacity-80" />
          <span className="text-sm opacity-90">Политика конфиденциальности</span>
        </button>
        <button onClick={onLogin} className={ITEM}>
          <Icon name="LogIn" size={22} className="text-[#fe2c55]" />
          <span className="text-sm text-[#fe2c55]">Войти</span>
        </button>
        <button onClick={toggle} className={ITEM} title="Переключить тему">
          <Icon name={theme === "dark" ? "Sun" : "Moon"} size={22} className="opacity-80" />
          <span className="text-sm opacity-90">{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
        </button>
      </nav>
      <div className="px-6 py-2 flex-shrink-0">
        <p className="opacity-40 text-[11px] leading-relaxed">© Лоок 2026</p>
      </div>
    </aside>
  );
};

export default LandingSidebar;
