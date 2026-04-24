import { useState } from "react";
import Icon from "@/components/ui/icon";
import SettingsScreen from "./SettingsScreen";

const AVATAR = "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg";

const POSTS_GRID = [
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg", views: 50 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg", views: 91 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg", views: 77 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg", views: 104 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg", views: 116 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg", views: 97 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0a51a008-0fe3-4620-8186-4626075d14eb.jpg", views: 203 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg", views: 88 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg", views: 145 },
];

const ProfilePage = () => {
  const [tab, setTab] = useState<"videos" | "posts">("videos");
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>

      {/* Avatar + stats */}
      <div className="flex items-center gap-4 px-4 pt-14 pb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#c084fc] to-[#8b5cf6] flex items-center justify-center">
          <img src={AVATAR} alt="avatar" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-1 justify-around">
          {[
            { value: "7", label: "Лайки" },
            { value: "4", label: "Подписчики" },
            { value: "3", label: "Подписки" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && <div className="w-px h-8 bg-gray-200 mr-4" />}
              <div className="flex flex-col items-center">
                <span className="text-black font-bold text-xl leading-tight">{s.value}</span>
                <span className="text-gray-500 text-xs mt-0.5">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Name & bio */}
      <div className="px-4 pb-4">
        <p className="text-black font-bold text-lg leading-tight">Алекс</p>
        <p className="text-gray-500 text-sm mt-0.5">Алекс</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 text-black font-semibold text-sm"
        >
          Настройки
        </button>
        <button className="flex-1 py-2.5 rounded-xl bg-gray-100 text-black font-semibold text-sm">
          Опубликовать
        </button>
        <button className="w-12 py-2.5 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon name="Share2" size={18} className="text-black" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("videos")}
          className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-all ${
            tab === "videos" ? "border-[#8b5cf6]" : "border-transparent"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tab === "videos" ? "bg-[#8b5cf6]" : "bg-gray-200"}`}>
            <Icon name="Play" size={16} className={tab === "videos" ? "text-white" : "text-gray-400"} />
          </div>
        </button>
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-all ${
            tab === "posts" ? "border-[#8b5cf6]" : "border-transparent"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tab === "posts" ? "bg-[#8b5cf6]" : "bg-gray-200"}`}>
            <Icon name="LayoutGrid" size={16} className={tab === "posts" ? "text-white" : "text-gray-400"} />
          </div>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-px bg-gray-100">
        {POSTS_GRID.map((item, i) => (
          <div key={i} className="relative aspect-square overflow-hidden bg-gray-200">
            <img src={item.img} alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
              <Icon name="Play" size={10} className="text-white drop-shadow" />
              <span className="text-white text-[10px] font-semibold drop-shadow">{item.views}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pb-28" />
    </div>
  );
};

export default ProfilePage;