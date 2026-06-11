import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import VideoFeed, { CATEGORIES } from "@/components/VideoFeed";
import VideoGrid from "@/components/VideoGrid";
import { useTheme } from "@/context/ThemeContext";
import PostFeed from "@/components/PostFeed";
import LiveStream from "@/components/LiveStream";
import LiveList from "@/components/LiveList";
import ProfilePage from "@/components/ProfilePage";
import CameraScreen from "@/components/CameraScreen";
import MessagesScreen from "@/components/MessagesScreen";
import UserProfileModal from "@/components/UserProfileModal";
import { SupportScreen, LegalScreen } from "@/components/SettingsScreen";
import { useUnread } from "@/context/UnreadContext";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { id: "home", icon: "Home", label: "Главная" },
  { id: "feed", icon: "LayoutList", label: "Лента" },
  { id: "live", icon: "Radio", label: "Эфиры" },
  { id: "add", icon: "Plus", label: "" },
  { id: "messages", icon: "MessageCircle", label: "Чаты" },
  { id: "profile", icon: "User", label: "Профиль" },
];

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const Index = () => {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const initialCommunityFromUrl = (() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("community");
  })();
  const initialInviteFromUrl = (() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("invite");
  })();
  const [activeTab, setActiveTab] = useState(initialCommunityFromUrl || initialInviteFromUrl ? "messages" : "home");
  const [activeCategory, setActiveCategory] = useState("new");
  const [gridOpenVideoId, setGridOpenVideoId] = useState<number | null>(null);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(initialCommunityFromUrl);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [pendingDirectHandle, setPendingDirectHandle] = useState<string | null>(null);
  const { totalUnread } = useUnread();
  const [desktopOverlay, setDesktopOverlay] = useState<"support" | "terms" | "privacy" | null>(null);

  const handleLogout = () => {
    if (confirm("Выйти из аккаунта?")) logout();
  };

  // «Глубокий» экран, который закрывается кнопкой «Назад».
  // Между вкладками переключаемся нижним меню — их сюда НЕ включаем.
  const canGoBack =
    showLive || showCamera || !!desktopOverlay || !!profileHandle;

  // Видимая кнопка «Назад» — только для полноэкранных оверлеев
  const showBackButton = canGoBack;

  // Закрыть верхний открытый экран (приоритет — от самого верхнего слоя)
  const goBack = () => {
    if (showLive) { setShowLive(false); return; }
    if (showCamera) { setShowCamera(false); return; }
    if (desktopOverlay) { setDesktopOverlay(null); return; }
    if (profileHandle) { setProfileHandle(null); return; }
  };

  // Перехват системной кнопки/жеста «Назад»: вместо ухода с сайта — закрываем экран
  useEffect(() => {
    if (!canGoBack) return;
    window.history.pushState({ lookBack: true }, "");
    const onPop = () => goBack();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGoBack]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { handle?: string };
      if (detail?.handle) setProfileHandle(detail.handle);
    };
    const onMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail as { handle?: string };
      setProfileHandle(null);
      if (detail?.handle) setPendingDirectHandle(detail.handle);
      setActiveTab("messages");
    };
    window.addEventListener("open-user-profile", onOpen);
    window.addEventListener("open-direct-message", onMessage);
    return () => {
      window.removeEventListener("open-user-profile", onOpen);
      window.removeEventListener("open-direct-message", onMessage);
    };
  }, []);

  useEffect(() => {
    // Подчищаем параметр из URL после применения, чтобы не сработал при обычной навигации
    if (initialCommunityFromUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("community");
      window.history.replaceState({}, "", url.toString());
    }
  }, [initialCommunityFromUrl]);

  // Обработка ссылки-приглашения ?invite=<token>
  useEffect(() => {
    if (!initialInviteFromUrl || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${CHAT_API}?module=community`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": user.id,
            "X-User-Name": encodeURIComponent(user.name),
          },
          body: JSON.stringify({ action: "join_by_invite", token: initialInviteFromUrl }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (!cancelled && data.ok && data.community_id) {
          setPendingCommunityId(data.community_id);
          setActiveTab("messages");
        } else if (!cancelled) {
          alert("Ссылка-приглашение недействительна или сообщество удалено");
        }
      } catch {
        if (!cancelled) alert("Не удалось присоединиться по ссылке");
      } finally {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        }
      }
    })();
    return () => { cancelled = true; };
  }, [initialInviteFromUrl, user]);

  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden" style={{ background: "var(--look-bg)" }}>
     <div className="relative flex w-full h-full overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] xl:w-[280px] h-full border-r border-white/8 flex-shrink-0 z-40" style={{ background: "var(--look-sidebar-bg)" }}>
        <div className="px-6 pt-4 pb-2">
          <span className="font-bold text-white text-xl tracking-tight">Лоок</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto min-h-0">
          {TABS.map((tab) => {
            const active = activeTab === tab.id && tab.id !== "add";
            const isAdd = tab.id === "add";
            return (
              <button
                key={tab.id}
                onClick={() => isAdd ? setShowCamera(true) : setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-4 py-2 rounded-xl transition-colors ${
                  active ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                {isAdd ? (
                  <div className="relative flex items-center h-6 w-9">
                    <div className="w-6 h-5 rounded-md absolute left-0" style={{ background: "var(--look-accent)", opacity: 0.6 }} />
                    <div className="w-6 h-5 rounded-md absolute right-0" style={{ background: "var(--look-accent)" }} />
                    <div className="w-6 h-5 rounded-md flex items-center justify-center relative z-10 mx-auto" style={{ background: "#ffffff", border: "1.5px solid rgba(0,0,0,0.15)" }}>
                      <Icon name="Plus" size={14} strokeWidth={3} style={{ color: "#1f6b3a" }} />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Icon
                      name={tab.icon as "Home"}
                      size={22}
                      className={active ? "text-white" : "text-white/80"}
                    />
                    {tab.id === "messages" && totalUnread > 0 && (
                      <div className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fe2c55] flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold leading-none">
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <span className={`text-sm ${active ? "text-white font-bold" : "text-white/90"}`}>
                  {isAdd ? "Создать" : tab.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setDesktopOverlay("support")}
            className="flex items-center gap-4 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <Icon name="LifeBuoy" size={22} className="text-white/80" />
            <span className="text-sm text-white/90">Поддержка</span>
          </button>
          <button
            onClick={() => setDesktopOverlay("terms")}
            className="flex items-center gap-4 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <Icon name="FileText" size={22} className="text-white/80" />
            <span className="text-sm text-white/90">Условия использования</span>
          </button>
          <button
            onClick={() => setDesktopOverlay("privacy")}
            className="flex items-center gap-4 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <Icon name="ShieldCheck" size={22} className="text-white/80" />
            <span className="text-sm text-white/90">Политика конфиденциальности</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
          >
            <Icon name="LogOut" size={22} className="text-[#fe2c55]" />
            <span className="text-sm text-[#fe2c55]">Выйти</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors text-left"
            title="Переключить тему"
          >
            <Icon name={theme === "dark" ? "Sun" : "Moon"} size={22} className="text-white/80" />
            <span className="text-sm text-white/90">{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
          </button>
        </nav>
        <div className="px-6 py-2 flex-shrink-0">
          <p className="text-white/40 text-[11px] leading-relaxed">© Лоок 2026</p>
        </div>
      </aside>

      {/* Main app area */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden mx-auto w-full max-w-[480px] md:max-w-none">

        {/* Кнопка «Назад» для телефонов без системной кнопки */}
        {showBackButton && (
          <button
            onClick={goBack}
            className="md:hidden absolute top-9 left-3 z-[60] w-9 h-9 rounded-full bg-black/45 backdrop-blur flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Назад"
            title="Назад"
          >
            <Icon name="ChevronLeft" size={22} className="text-white" />
          </button>
        )}

        {/* Live Stream overlay */}
        {showLive && (
          <div className="absolute inset-0 z-50">
            <LiveStream onClose={() => setShowLive(false)} />
          </div>
        )}

        {/* Camera overlay */}
        {showCamera && (
          <div className="absolute inset-0 z-50">
            <CameraScreen onClose={() => setShowCamera(false)} />
          </div>
        )}

        {/* Desktop info overlays (Support / Terms / Privacy) */}
        {desktopOverlay && (
          <div className="absolute inset-0 z-50 bg-gray-100">
            {desktopOverlay === "support" && <SupportScreen onBack={() => setDesktopOverlay(null)} />}
            {desktopOverlay === "terms" && (
              <LegalScreen
                onBack={() => setDesktopOverlay(null)}
                title="Условия использования"
                settingKey="terms_of_use"
                fallback="Используя приложение Look, вы соглашаетесь с нашими условиями использования."
              />
            )}
            {desktopOverlay === "privacy" && (
              <LegalScreen
                onBack={() => setDesktopOverlay(null)}
                title="Политика конфиденциальности"
                settingKey="privacy_policy"
                fallback="Мы уважаем вашу конфиденциальность."
              />
            )}
          </div>
        )}

        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <div className="px-4 pt-10 md:pt-4 pb-2 pointer-events-none" />
          {activeTab === "home" && (
            <>
              {/* Единый стиль для ПК и телефона: кнопка с раскрывающимся списком */}
              <div className="pointer-events-auto px-4 pb-2 relative flex items-center gap-2">
                <button
                  onClick={() => {
                    // Если уже в категории "Все" и открыто видео — возвращаемся в плитку
                    if (activeCategory === "all" && gridOpenVideoId !== null) {
                      setGridOpenVideoId(null);
                      return;
                    }
                    setMobileCatOpen((v) => !v);
                  }}
                  className="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap bg-white text-black flex items-center gap-1"
                >
                  {CATEGORIES.find((c) => c.id === activeCategory)?.label || "Все"}
                  <Icon name={(activeCategory === "all" && gridOpenVideoId !== null) ? "ArrowLeft" : (mobileCatOpen ? "ChevronUp" : "ChevronDown")} size={14} />
                </button>
                <button
                  onClick={toggleTheme}
                  className="ml-auto w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors"
                  title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                >
                  <Icon name={theme === "dark" ? "Sun" : "Moon"} size={16} className="text-white" />
                </button>
                {mobileCatOpen && (
                  <div
                    className="absolute left-4 right-4 md:right-auto md:w-[420px] top-full mt-1 backdrop-blur rounded-2xl p-2 max-h-[60vh] overflow-y-auto z-40"
                    style={{
                      background: theme === "dark" ? "rgba(10,46,26,0.95)" : "rgba(255,255,255,0.98)",
                      border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(13,42,24,0.15)",
                    }}
                  >
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => {
                        const active = activeCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setActiveCategory(cat.id);
                              setGridOpenVideoId(null);
                              setMobileCatOpen(false);
                            }}
                            className="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all"
                            style={{
                              background: active
                                ? theme === "dark" ? "#fff" : "#1f6b3a"
                                : theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(13,42,24,0.08)",
                              color: active
                                ? theme === "dark" ? "#000" : "#fff"
                                : theme === "dark" ? "rgba(255,255,255,0.9)" : "#0d2a18",
                            }}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden" style={{ background: "var(--look-bg)" }}>
          {activeTab === "home" && (
            <>
              {/* На ПК показываем плиточную сетку (TikTok-стиль) для всех категорий, кроме «Подписки» и «Новые». Клик — открывает видео в ленте */}
              <div className="hidden md:block w-full h-full">
                {activeCategory !== "subs" && activeCategory !== "new" && gridOpenVideoId === null ? (
                  <VideoGrid category={activeCategory} onOpenVideo={(id) => setGridOpenVideoId(id)} />
                ) : (
                  <VideoFeed
                    activeTab={activeTab}
                    activeCategory={activeCategory}
                    initialVideoId={gridOpenVideoId ?? undefined}
                    onCloseInitial={() => setGridOpenVideoId(null)}
                  />
                )}
              </div>
              {/* Мобильная — всегда вертикальная лента */}
              <div className="md:hidden w-full h-full">
                <VideoFeed activeTab={activeTab} activeCategory={activeCategory} />
              </div>
            </>
          )}

          {activeTab === "feed" && <PostFeed />}

          {activeTab === "live" && <LiveList />}
          {activeTab === "messages" && (
            <MessagesScreen
              initialCommunityId={pendingCommunityId}
              onCommunityConsumed={() => setPendingCommunityId(null)}
              initialDirectHandle={pendingDirectHandle}
              onDirectConsumed={() => setPendingDirectHandle(null)}
            />
          )}
          {activeTab === "profile" && <ProfilePage />}
        </div>

        {/* Bottom Tab Bar (mobile only) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black to-transparent md:hidden">
          <div className="flex items-center justify-around px-2 pb-6 pt-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.id === "add" ? setShowCamera(true) : setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 min-w-[52px]"
              >
                {tab.id === "add" ? (
                  <div className="relative flex items-center h-7">
                    <div className="w-10 h-7 rounded-lg absolute left-0" style={{ background: "var(--look-accent)", opacity: 0.6 }} />
                    <div className="w-10 h-7 rounded-lg absolute right-0" style={{ background: "var(--look-accent)" }} />
                    <div className="w-10 h-7 rounded-lg flex items-center justify-center relative z-10 mx-auto" style={{ background: "#ffffff", border: "1.5px solid rgba(0,0,0,0.15)" }}>
                      <Icon name="Plus" size={18} strokeWidth={3} style={{ color: "#1f6b3a" }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Icon
                        name={tab.icon as "Home"}
                        size={24}
                        className={activeTab === tab.id ? "text-white" : "text-white/50"}
                      />
                      {tab.id === "messages" && totalUnread > 0 && (
                        <div className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#fe2c55] flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold leading-none">
                            {totalUnread > 99 ? "99+" : totalUnread}
                          </span>
                        </div>
                      )}
                    </div>
                    {tab.label && (
                      <span className={`text-[10px] font-medium ${activeTab === tab.id ? "text-white" : "text-white/50"}`}>
                        {tab.label}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {profileHandle && (
        <UserProfileModal handle={profileHandle} onClose={() => setProfileHandle(null)} />
      )}
     </div>
    </div>
  );
};

export default Index;