import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import SettingsScreen from "./SettingsScreen";

const AVATAR = "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg";

const FOLLOWERS = [
  { name: "Аня Смирнова", handle: "anya_dance", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg" },
  { name: "Макс Паркур", handle: "max_parkour", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg" },
  { name: "Кофе и уют", handle: "cozy_coffee", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg" },
  { name: "Travel Rus", handle: "travel_rus", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg" },
];

const FOLLOWING = [
  { name: "DJ Макс", handle: "dj_max_official", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg" },
  { name: "ФитнесПро", handle: "fit_pro", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg" },
  { name: "GameZone", handle: "gamezone_tv", avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg" },
];

const UserListScreen = ({ title, users, onBack }: { title: string; users: typeof FOLLOWERS; onBack: () => void }) => {
  const [followed, setFollowed] = useState<string[]>([]);
  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">{title}</span>
      </div>
      <div>
        {users.map((u) => (
          <div key={u.handle} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
            <img src={u.avatar} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt={u.name} />
            <div className="flex-1 min-w-0">
              <p className="text-black font-semibold text-sm">{u.name}</p>
              <p className="text-gray-400 text-xs">@{u.handle}</p>
            </div>
            <button
              onClick={() => setFollowed(f => f.includes(u.handle) ? f.filter(x => x !== u.handle) : [...f, u.handle])}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${followed.includes(u.handle) ? "bg-gray-100 text-gray-500" : "bg-[#8b5cf6] text-white"}`}
            >
              {followed.includes(u.handle) ? "Подписан" : "Подписаться"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

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

interface Story {
  id: number;
  url: string;
  type: "image" | "video";
  label: string;
}

const StoryViewer = ({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) => {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = stories[index];
  const DURATION = story.type === "video" ? 15000 : 5000;

  const goNext = () => {
    if (index < stories.length - 1) { setIndex(i => i + 1); setProgress(0); }
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) { setIndex(i => i - 1); setProgress(0); }
  };

  useState(() => {
    setProgress(0);
  });

  // progress bar
  useRef(() => {});
  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    const step = 100 / (DURATION / 50);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p + step >= 100) { clearInterval(timerRef.current!); goNext(); return 100; }
        return p + step;
      });
    }, 50);
  };

  // reset on index change
  const mounted = useRef(false);
  if (!mounted.current) { mounted.current = true; }

  useRef(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; });

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={e => e.stopPropagation()}>
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-12 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-14 left-4 right-4 flex items-center gap-3 z-10">
        <img src={AVATAR} className="w-8 h-8 rounded-full object-cover border-2 border-white" alt="" />
        <span className="text-white font-semibold text-sm flex-1">{story.label}</span>
        <button onClick={onClose} className="p-1"><Icon name="X" size={22} className="text-white" /></button>
      </div>

      {/* Media */}
      {story.type === "video" ? (
        <video
          ref={videoRef}
          key={story.id}
          src={story.url}
          className="w-full h-full object-cover"
          autoPlay
          muted={false}
          playsInline
          onPlay={startProgress}
          onLoadedData={() => videoRef.current?.play()}
        />
      ) : (
        <img
          key={story.id}
          src={story.url}
          className="w-full h-full object-cover"
          onLoad={startProgress}
          alt=""
        />
      )}

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-10">
        <div className="flex-1" onClick={goPrev} />
        <div className="flex-1" onClick={goNext} />
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [tab, setTab] = useState<"videos" | "posts">("videos");
  const [showSettings, setShowSettings] = useState(false);
  const [showScreen, setShowScreen] = useState<"followers" | "following" | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [viewingStory, setViewingStory] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleAddStory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    const now = new Date();
    const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setStories(s => [...s, { id: Date.now(), url, type, label }]);
    e.target.value = "";
  };

  const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>, mediaType: "video" | "image") => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const now = new Date();
      const label = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
      setStories(s => [...s, { id: Date.now() + Math.random(), url, type: mediaType, label }]);
    });
    e.target.value = "";
  };

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;
  if (showScreen === "followers") return <UserListScreen title="Подписчики" users={FOLLOWERS} onBack={() => setShowScreen(null)} />;
  if (showScreen === "following") return <UserListScreen title="Подписки" users={FOLLOWING} onBack={() => setShowScreen(null)} />;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {viewingStory !== null && (
        <StoryViewer stories={stories} startIndex={viewingStory} onClose={() => setViewingStory(null)} />
      )}

      {/* Avatar + stats */}
      <div className="flex items-center gap-4 px-4 pt-14 pb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#c084fc] to-[#8b5cf6] flex items-center justify-center">
          <img src={AVATAR} alt="avatar" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-1 justify-around">
          {[
            { value: "7", label: "Лайки", action: null },
            { value: "4", label: "Подписчики", action: "followers" },
            { value: "3", label: "Подписки", action: "following" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && <div className="w-px h-8 bg-gray-200 mr-4" />}
              <button
                onClick={() => s.action && setShowScreen(s.action as "followers" | "following")}
                className="flex flex-col items-center"
              >
                <span className="text-black font-bold text-xl leading-tight">{s.value}</span>
                <span className="text-gray-500 text-xs mt-0.5">{s.label}</span>
              </button>
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
        <button className="w-12 py-2.5 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon name="Share2" size={18} className="text-black" />
        </button>
      </div>

      {/* Stories row */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {/* Add story button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 flex flex-col items-center gap-1"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
            <Icon name="Plus" size={22} className="text-gray-400" />
          </div>
          <span className="text-[10px] text-gray-500">Добавить</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAddStory} />

        {/* Stories */}
        {stories.map((story, i) => (
          <button key={story.id} onClick={() => setViewingStory(i)} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#8b5cf6] p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                {story.type === "image" ? (
                  <img src={story.url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <video src={story.url} className="w-full h-full object-cover" muted playsInline />
                )}
              </div>
            </div>
            <span className="text-[10px] text-gray-500">{story.label}</span>
          </button>
        ))}
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
      <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={e => handleAddMedia(e, "video")} />
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleAddMedia(e, "image")} />

      {tab === "videos" ? (
        (() => {
          const videos = stories.filter(s => s.type === "video");
          return videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Video" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет загруженных видео</p>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold"
              >
                <Icon name="Plus" size={16} className="text-white" />
                Загрузить видео
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              {videos.map((item) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-200">
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/40 rounded-full p-2">
                      <Icon name="Play" size={16} className="text-white" />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => videoInputRef.current?.click()}
                className="aspect-square bg-gray-50 flex items-center justify-center border border-dashed border-gray-300"
              >
                <Icon name="Plus" size={24} className="text-gray-400" />
              </button>
            </div>
          );
        })()
      ) : (
        (() => {
          const photos = stories.filter(s => s.type === "image");
          return photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Image" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет загруженных фото</p>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b5cf6] text-white text-sm font-semibold"
              >
                <Icon name="Plus" size={16} className="text-white" />
                Загрузить фото
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              {photos.map((item) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-200">
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <button
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square bg-gray-50 flex items-center justify-center border border-dashed border-gray-300"
              >
                <Icon name="Plus" size={24} className="text-gray-400" />
              </button>
            </div>
          );
        })()
      )}

      <div className="pb-28" />
    </div>
  );
};

export default ProfilePage;