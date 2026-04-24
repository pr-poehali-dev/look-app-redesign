import { useState } from "react";
import Icon from "@/components/ui/icon";
import SettingsScreen from "./SettingsScreen";
import { useUserMedia } from "@/context/UserMediaContext";

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

const MediaViewer = ({ items, startIndex, onClose, onDelete }: { items: Story[]; startIndex: number; onClose: () => void; onDelete: (id: number) => void }) => {
  const [index, setIndex] = useState(startIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const item = items[index];
  const goNext = () => index < items.length - 1 ? setIndex(i => i + 1) : onClose();
  const goPrev = () => index > 0 ? setIndex(i => i - 1) : null;

  const handleDelete = () => {
    onDelete(item.id);
    setConfirmDelete(false);
    setDeleted(true);
    setTimeout(() => {
      if (items.length === 1) { onClose(); return; }
      if (index >= items.length - 1) setIndex(i => i - 1);
      setDeleted(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-black/60 to-transparent z-10">
        <button onClick={onClose} className="p-1"><Icon name="ArrowLeft" size={24} className="text-white" /></button>
        <span className="text-white text-sm font-medium">{index + 1} / {items.length}</span>
        <button onClick={() => setConfirmDelete(true)} className="p-1"><Icon name="Trash2" size={20} className="text-white" /></button>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-end justify-center pb-16">
          <div className="bg-white rounded-2xl mx-4 w-full max-w-sm overflow-hidden">
            <div className="p-5 text-center">
              <p className="font-bold text-black text-base">Удалить?</p>
              <p className="text-gray-500 text-sm mt-1">Это действие нельзя отменить</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3.5 text-gray-500 font-medium text-sm border-r border-gray-100">Отмена</button>
              <button onClick={handleDelete} className="flex-1 py-3.5 text-red-500 font-semibold text-sm">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {deleted && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2 shadow-lg">
          <Icon name="Trash2" size={16} className="text-red-500" />
          <span className="text-black text-sm font-medium">Удалено</span>
        </div>
      )}

      {/* Media */}
      <div className="flex-1 flex items-center justify-center">
        {item.type === "video" ? (
          <video
            key={item.id}
            src={item.url}
            className="w-full h-full object-contain"
            autoPlay
            controls
            playsInline
          />
        ) : (
          <img key={item.id} src={item.url} className="w-full h-full object-contain" alt="" />
        )}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        <div className="flex-1 pointer-events-auto" onClick={goPrev} />
        <div className="w-16" />
        <div className="flex-1 pointer-events-auto" onClick={goNext} />
      </div>

      {/* Arrows */}
      {index > 0 && (
        <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2">
          <Icon name="ChevronLeft" size={24} className="text-white" />
        </button>
      )}
      {index < items.length - 1 && (
        <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2">
          <Icon name="ChevronRight" size={24} className="text-white" />
        </button>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const [tab, setTab] = useState<"videos" | "posts">("videos");
  const [showSettings, setShowSettings] = useState(false);
  const [showScreen, setShowScreen] = useState<"followers" | "following" | null>(null);
  const { userVideos: stories, removeMedia } = useUserMedia();
  const [viewingStory, setViewingStory] = useState<number | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{ items: Story[]; index: number } | null>(null);

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;
  if (showScreen === "followers") return <UserListScreen title="Подписчики" users={FOLLOWERS} onBack={() => setShowScreen(null)} />;
  if (showScreen === "following") return <UserListScreen title="Подписки" users={FOLLOWING} onBack={() => setShowScreen(null)} />;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {viewingStory !== null && (
        <StoryViewer stories={stories} startIndex={viewingStory} onClose={() => setViewingStory(null)} />
      )}
      {mediaViewer !== null && (
        <MediaViewer
          items={mediaViewer.items}
          startIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
          onDelete={(id) => {
            removeMedia(id);
            setMediaViewer(null);
          }}
        />
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

      {tab === "videos" ? (
        (() => {
          const videos = stories.filter(s => s.type === "video");
          return videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Video" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет загруженных видео</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              {videos.map((item, i) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-200 cursor-pointer" onClick={() => setMediaViewer({ items: videos, index: i })}>
                  <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/40 rounded-full p-2">
                      <Icon name="Play" size={16} className="text-white" />
                    </div>
                  </div>
                </div>
              ))}
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
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              {photos.map((item, i) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-200 cursor-pointer" onClick={() => setMediaViewer({ items: photos, index: i })}>
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          );
        })()
      )}

      <div className="pb-28" />
    </div>
  );
};

export default ProfilePage;