import { useState } from "react";
import Icon from "@/components/ui/icon";
import VideoFeed from "@/components/VideoFeed";
import PostFeed from "@/components/PostFeed";
import LiveStream from "@/components/LiveStream";
import LiveList from "@/components/LiveList";

const TABS = [
  { id: "home", icon: "Home", label: "Главная" },
  { id: "feed", icon: "LayoutGrid", label: "Лента" },
  { id: "add", icon: "Plus", label: "" },
  { id: "live", icon: "Radio", label: "Эфиры" },
  { id: "profile", icon: "User", label: "Профиль" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [feedMode, setFeedMode] = useState<"for-you" | "following">("for-you");
  const [showLive, setShowLive] = useState(false);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ maxWidth: 480, margin: "0 auto" }}>

      {/* Live Stream overlay */}
      {showLive && (
        <div className="absolute inset-0 z-50">
          <LiveStream onClose={() => setShowLive(false)} />
        </div>
      )}

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-10 pb-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" style={{ maxWidth: 480, margin: "0 auto" }}>
        <button
          className="pointer-events-auto flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded-md hover:bg-[#e0264c] active:scale-95 transition-all"
          onClick={() => setShowLive(true)}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
        </button>

        <div className="flex items-center gap-6 pointer-events-auto">
          <button
            onClick={() => setFeedMode("following")}
            className={`text-base font-semibold transition-all ${feedMode === "following" ? "text-white" : "text-white/50"}`}
          >
            Подписки
          </button>
          <div className="flex flex-col items-center">
            <button
              onClick={() => setFeedMode("for-you")}
              className={`text-base font-semibold transition-all ${feedMode === "for-you" ? "text-white" : "text-white/50"}`}
            >
              Для тебя
            </button>
            {feedMode === "for-you" && (
              <div className="mt-0.5 w-5 h-0.5 rounded-full bg-white" />
            )}
          </div>
        </div>

        <button className="pointer-events-auto">
          <Icon name="Search" size={22} className="text-white" />
        </button>
      </div>

      {/* Top header only for home tab */}
      {activeTab === "feed" && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-10 pb-3 bg-black border-b border-white/8" style={{ maxWidth: 480, margin: "0 auto" }}>
          <span className="font-bold text-white text-lg">ShortApp</span>
          <div className="flex items-center gap-4">
            <button><Icon name="Heart" size={22} className="text-white" /></button>
            <button><Icon name="Send" size={22} className="text-white" /></button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 relative overflow-hidden ${activeTab === "feed" ? "pt-[72px]" : ""}`}>
        {activeTab === "home" && <VideoFeed activeTab={activeTab} />}

        {activeTab === "feed" && <PostFeed />}

        {activeTab === "live" && <LiveList />}

        {activeTab === "search" && (
          <div className="h-full flex flex-col items-center justify-center bg-black gap-4">
            <Icon name="Search" size={48} className="text-white/20" />
            <p className="text-white/40 text-base">Поиск видео и авторов</p>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="h-full flex flex-col items-center justify-center bg-black gap-4">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
              <Icon name="User" size={40} className="text-white/40" />
            </div>
            <p className="text-white font-bold text-xl">@username</p>
            <a
              href="https://www.rustore.ru/catalog/app/ru.aleksey.shortapp"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-8 py-3 rounded-full bg-[#fe2c55] text-white font-bold text-sm hover:bg-[#e0264c] transition-colors"
            >
              Скачать ShortApp
            </a>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black to-transparent" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="flex items-center justify-around px-2 pb-6 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                  <Icon
                    name={tab.icon as "Home"}
                    size={24}
                    className={activeTab === tab.id ? "text-white" : "text-white/50"}
                  />
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
  );
};

export default Index;