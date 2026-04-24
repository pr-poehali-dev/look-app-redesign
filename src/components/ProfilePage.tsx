import { useState } from "react";
import Icon from "@/components/ui/icon";

const AVATAR = "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg";

const POSTS_GRID = [
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0a51a008-0fe3-4620-8186-4626075d14eb.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg",
];

const HIGHLIGHTS = [
  { label: "Путешествия", img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg" },
  { label: "Спорт", img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg" },
  { label: "Еда", img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0a51a008-0fe3-4620-8186-4626075d14eb.jpg" },
  { label: "Город", img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg" },
];

const ProfilePage = () => {
  const [tab, setTab] = useState<"posts" | "videos" | "saved">("posts");
  const [following, setFollowing] = useState(false);

  return (
    <div className="h-full bg-black overflow-y-scroll" style={{ scrollbarWidth: "none" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">shortapp_user</span>
          <Icon name="BadgeCheck" size={16} className="text-[#61d4f0]" />
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <Icon name="Bell" size={18} className="text-white" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <Icon name="Menu" size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Avatar + stats */}
      <div className="flex items-center gap-6 px-4 py-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#fe2c55] via-[#ff9800] to-[#61d4f0]">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
              <img src={AVATAR} alt="avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#fe2c55] flex items-center justify-center border-2 border-black">
            <Icon name="Plus" size={12} className="text-white" />
          </div>
        </div>

        <div className="flex-1 flex justify-around">
          {[
            { value: "248", label: "публикаций" },
            { value: "14.2K", label: "подписчиков" },
            { value: "892", label: "подписок" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="text-white font-bold text-lg leading-tight">{s.value}</span>
              <span className="text-white/50 text-xs mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="px-4 pb-3">
        <p className="text-white font-semibold text-sm">Алекс | Контент-мейкер 🎬</p>
        <p className="text-white/60 text-sm leading-snug mt-1">
          Создаю видео о жизни, путешествиях и спорте ✈️🏋️<br />
          Москва • Снимаю на iPhone
        </p>
        <a
          href="https://www.rustore.ru/catalog/app/ru.aleksey.shortapp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mt-1 text-[#61d4f0] text-sm"
        >
          <Icon name="Link" size={13} className="text-[#61d4f0]" />
          Look — скачать приложение
        </a>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => setFollowing((v) => !v)}
          className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
            following
              ? "bg-white/10 text-white border border-white/20"
              : "bg-[#fe2c55] text-white"
          }`}
        >
          {following ? "Вы подписаны" : "Подписаться"}
        </button>
        <button className="flex-1 py-2 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/20">
          Написать
        </button>
        <button className="w-10 py-2 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
          <Icon name="UserPlus" size={16} className="text-white" />
        </button>
      </div>

      {/* Highlights */}
      <div className="flex gap-4 px-4 pb-4 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full p-0.5 border border-white/20 overflow-hidden">
              <img src={h.img} alt={h.label} className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="text-white/60 text-xs">{h.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center">
            <Icon name="Plus" size={22} className="text-white/30" />
          </div>
          <span className="text-white/30 text-xs">Новое</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { id: "posts", icon: "LayoutGrid" },
          { id: "videos", icon: "Play" },
          { id: "saved", icon: "Bookmark" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-all ${
              tab === t.id ? "border-white" : "border-transparent"
            }`}
          >
            <Icon name={t.icon as "LayoutGrid"} size={22} className={tab === t.id ? "text-white" : "text-white/40"} />
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-px bg-white/5">
        {POSTS_GRID.map((img, i) => (
          <div key={i} className="relative aspect-square overflow-hidden bg-white/5">
            <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            {i === 0 && (
              <div className="absolute top-1.5 right-1.5">
                <div className="w-5 h-5 bg-black/40 rounded flex items-center justify-center">
                  <Icon name="Copy" size={11} className="text-white" />
                </div>
              </div>
            )}
            {i % 3 === 2 && (
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                <Icon name="Play" size={10} className="text-white drop-shadow" />
                <span className="text-white text-[10px] font-semibold drop-shadow">
                  {Math.floor(Math.random() * 900 + 100)}K
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Download banner */}
      <div className="mx-4 mt-6 mb-28 rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6]" />
        <div className="relative px-5 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">Скачай ShortApp</p>
            <p className="text-white/70 text-xs mt-0.5">Смотри и создавай контент</p>
          </div>
          <a
            href="https://www.rustore.ru/catalog/app/ru.aleksey.shortapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white text-[#fe2c55] font-bold text-sm px-4 py-2.5 rounded-xl hover:scale-105 transition-transform"
          >
            <Icon name="Download" size={15} className="text-[#fe2c55]" />
            RuStore
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;