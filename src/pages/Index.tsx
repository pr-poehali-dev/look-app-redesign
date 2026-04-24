import { useState } from "react";
import Icon from "@/components/ui/icon";
import VideoFeed, { CATEGORIES } from "@/components/VideoFeed";
import PostFeed from "@/components/PostFeed";
import LiveStream from "@/components/LiveStream";
import LiveList from "@/components/LiveList";
import ProfilePage from "@/components/ProfilePage";
import CameraScreen from "@/components/CameraScreen";
import MessagesScreen from "@/components/MessagesScreen";

const TABS = [
  { id: "home", icon: "Home", label: "Главная" },
  { id: "messages", icon: "MessageCircle", label: "Чаты" },
  { id: "add", icon: "Plus", label: "" },
  { id: "live", icon: "Radio", label: "Эфиры" },
  { id: "profile", icon: "User", label: "Профиль" },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [feedMode, setFeedMode] = useState<"for-you" | "following">("for-you");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showLive, setShowLive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden" style={{ maxWidth: 480, margin: "0 auto" }}>

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
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="flex items-center justify-between px-4 pt-10 pb-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex items-center gap-6 pointer-events-auto">
            <button
              onClick={() => setFeedMode("following")}
              className={`text-base font-semibold transition-all ${feedMode === "following" ? "text-white" : "text-white/50"}`}
            >
              Подписки
            </button>
          </div>
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

      {/* Top header only for home tab */}
      {activeTab === "feed" && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-10 pb-3 bg-black border-b border-white/8" style={{ maxWidth: 480, margin: "0 auto" }}>
          <span className="font-bold text-white text-lg">Look</span>
          <div className="flex items-center gap-4">
            <button><Icon name="Heart" size={22} className="text-white" /></button>
            <button><Icon name="Send" size={22} className="text-white" /></button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 relative overflow-hidden ${activeTab === "feed" ? "pt-[72px]" : ""}`}>
        {activeTab === "home" && <VideoFeed activeTab={activeTab} activeCategory={activeCategory} />}

        {activeTab === "feed" && <PostFeed />}

        {activeTab === "live" && <LiveList />}
        {activeTab === "messages" && <MessagesScreen />}
        {activeTab === "profile" && <ProfilePage />}
      </div>

      {/* Bottom Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black to-transparent" style={{ maxWidth: 480, margin: "0 auto" }}>
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