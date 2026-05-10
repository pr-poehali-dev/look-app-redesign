import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import VideoFeed, { CATEGORIES } from "@/components/VideoFeed";
import PostFeed from "@/components/PostFeed";
import LiveStream from "@/components/LiveStream";
import LiveList from "@/components/LiveList";
import ProfilePage from "@/components/ProfilePage";
import CameraScreen from "@/components/CameraScreen";
import MessagesScreen from "@/components/MessagesScreen";
import { useUnread } from "@/context/UnreadContext";

const TABS = [
  { id: "home", icon: "Home", label: "Главная" },
  { id: "feed", icon: "LayoutList", label: "Лента" },
  { id: "live", icon: "Radio", label: "Эфиры" },
  { id: "add", icon: "Plus", label: "" },
  { id: "messages", icon: "MessageCircle", label: "Чаты" },
  { id: "profile", icon: "User", label: "Профиль" },
];

const Index = () => {
  const initialCommunityFromUrl = (() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("community");
  })();
  const [activeTab, setActiveTab] = useState(initialCommunityFromUrl ? "messages" : "home");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showLive, setShowLive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(initialCommunityFromUrl);
  const { totalUnread } = useUnread();

  useEffect(() => {
    // Подчищаем параметр из URL после применения, чтобы не сработал при обычной навигации
    if (initialCommunityFromUrl && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("community");
      window.history.replaceState({}, "", url.toString());
    }
  }, [initialCommunityFromUrl]);

  return (
    <div className="fixed inset-0 bg-black md:bg-[#121212] flex overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] xl:w-[280px] h-full border-r border-white/8 bg-black flex-shrink-0 z-40">
        <div className="px-6 pt-6 pb-4">
          <span className="font-bold text-white text-2xl tracking-tight">Look</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {TABS.map((tab) => {
            const active = activeTab === tab.id && tab.id !== "add";
            const isAdd = tab.id === "add";
            return (
              <button
                key={tab.id}
                onClick={() => isAdd ? setShowCamera(true) : setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                  active ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                {isAdd ? (
                  <div className="relative flex items-center h-7 w-10">
                    <div className="w-7 h-6 rounded-md bg-[#61d4f0] absolute left-0" />
                    <div className="w-7 h-6 rounded-md bg-[#fe2c55] absolute right-0" />
                    <div className="w-7 h-6 rounded-md bg-white flex items-center justify-center relative z-10 mx-auto">
                      <Icon name="Plus" size={16} className="text-black" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Icon
                      name={tab.icon as "Home"}
                      size={26}
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
                <span className={`text-base ${active ? "text-white font-bold" : "text-white/90"}`}>
                  {isAdd ? "Создать" : tab.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/8">
          <p className="text-white/40 text-xs leading-relaxed">© Look 2026</p>
        </div>
      </aside>

      {/* Main app area */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden mx-auto w-full max-w-[480px] md:max-w-none">

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

        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <div className="flex items-center justify-end px-4 pt-10 md:pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            <button className="pointer-events-auto">
              <Icon name="Search" size={22} className="text-white" />
            </button>
          </div>
          {activeTab === "home" && (
            <div className="pointer-events-auto overflow-x-scroll scrollbar-none px-4 pb-2" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-2 w-max">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top header only for feed tab */}
        {activeTab === "feed" && (
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-10 md:pt-4 pb-3 bg-black border-b border-white/8">
            <span className="font-bold text-white text-lg md:hidden">Look</span>
            <div className="flex items-center gap-4 ml-auto">
              <button><Icon name="Heart" size={22} className="text-white" /></button>
              <button><Icon name="Send" size={22} className="text-white" /></button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 relative overflow-hidden ${activeTab === "feed" ? "pt-[72px] md:pt-[56px]" : ""}`}>
          {activeTab === "home" && <VideoFeed activeTab={activeTab} activeCategory={activeCategory} />}

          {activeTab === "feed" && <PostFeed />}

          {activeTab === "live" && <LiveList />}
          {activeTab === "messages" && (
            <MessagesScreen
              initialCommunityId={pendingCommunityId}
              onCommunityConsumed={() => setPendingCommunityId(null)}
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
                    <div className="w-10 h-7 rounded-lg bg-[#61d4f0] absolute left-0" />
                    <div className="w-10 h-7 rounded-lg bg-[#fe2c55] absolute right-0" />
                    <div className="w-10 h-7 rounded-lg bg-white flex items-center justify-center relative z-10 mx-auto">
                      <Icon name="Plus" size={18} className="text-black" />
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
    </div>
  );
};

export default Index;