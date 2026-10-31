import HoverPreviewThumb from "./HoverPreviewThumb";
import type { Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import UserArticlesList from "./UserArticlesList";
import { useUserMedia } from "@/context/UserMediaContext";
import { useUserArticles } from "@/hooks/useArticles";
import { categoryLabel } from "./videoCategories";
import ProfileExtraTabs from "./ProfileExtraTabs";
import CollectionsTab from "@/components/collections/CollectionsTab";

type UserMedia = ReturnType<typeof useUserMedia>;

export type ProfileTab = "videos" | "posts" | "articles" | "reposts" | "collections" | "boards" | "circles" | "challenges";
export type MediaViewerState = { tab: "video" | "image" | "text"; id: number; onlyReposts?: boolean } | null;

interface ProfileMediaTabsProps {
  tab: ProfileTab;
  setTab: Dispatch<SetStateAction<ProfileTab>>;
  stories: UserMedia["userVideos"];
  setMediaViewer: Dispatch<SetStateAction<MediaViewerState>>;
  setCategoryEditId: Dispatch<SetStateAction<number | null>>;
  setShowArticles: Dispatch<SetStateAction<boolean>>;
  myArticles: ReturnType<typeof useUserArticles>["articles"];
  myArticlesLoading: boolean;
  onOpenBoard: (id: number) => void;
  onOpenBoards: () => void;
  onOpenGuide: () => void;
}

const ProfileMediaTabs = ({ tab, setTab, stories, setMediaViewer, setCategoryEditId, setShowArticles, myArticles, myArticlesLoading, onOpenBoard, onOpenBoards, onOpenGuide }: ProfileMediaTabsProps) => {
  return (
    <>
      <div className="relative flex border-b border-gray-200">
        {([
          { id: "collections", label: "Коллекции" },
          { id: "videos", label: "Лента" },
          { id: "boards", label: "Доски" },
          { id: "circles", label: "Кружки" },
          { id: "challenges", label: "Челленджи" },
        ] as const).map(({ id, label }) => {
          const active = id === "videos" ? (tab === "videos" || tab === "posts" || tab === "articles" || tab === "reposts") : tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-[12px] font-semibold transition-colors duration-200 ${active ? "text-black" : "text-gray-400"}`}
            >
              {label}
            </button>
          );
        })}
        <span
          className="absolute bottom-0 h-[3px] w-9 rounded-full bg-[#FF5A3C] transition-all duration-200"
          style={{
            left: `calc(${tab === "collections" ? 0 : ["videos", "posts", "articles", "reposts"].includes(tab) ? 1 : tab === "boards" ? 2 : tab === "circles" ? 3 : 4} * 20% + 10% - 18px)`,
            transitionTimingFunction: "cubic-bezier(0.2,0,0,1)",
          }}
        />
      </div>

      {(["videos", "posts", "articles", "reposts"] as const).includes(tab as "videos") && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {([
            { id: "videos", icon: "Play", label: "Видео" },
            { id: "posts", icon: "LayoutGrid", label: "Фото" },
            { id: "articles", icon: "FileText", label: "Статьи" },
            { id: "reposts", icon: "Repeat2", label: "Репосты" },
          ] as const).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${tab === id ? "bg-[#FFE9E3] text-[#FF5A3C]" : "bg-gray-100 text-gray-600"}`}
            >
              <Icon name={icon} size={13} />{label}
            </button>
          ))}
          <button onClick={() => setShowArticles(true)} className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            <Icon name="PenLine" size={13} />Написать
          </button>
          <button onClick={onOpenGuide} className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            <Icon name="BookOpen" size={13} />Инструкция
          </button>
        </div>
      )}

      {tab === "collections" ? (
        <CollectionsTab />
      ) : tab === "boards" || tab === "circles" || tab === "challenges" ? (
        <ProfileExtraTabs tab={tab} onOpenBoard={onOpenBoard} onOpenBoards={onOpenBoards} />
      ) : tab === "videos" ? (
        (() => {
          const videos = stories.filter(s => s.type === "video" && !s.is_repost);
          return videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Video" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет загруженных видео</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1 bg-gray-200 p-1">
              {videos.map((item, idx) => (
                <div key={item.id} className="relative aspect-square overflow-hidden cursor-pointer" style={{ background: "linear-gradient(135deg, #2E2E2B 0%, #1a1a1a 100%)" }} onClick={() => setMediaViewer({ tab: "video", id: item.id })}>
                  {(item.thumb || item.thumbnail) ? (
                    <HoverPreviewThumb src={(item.thumb || item.thumbnail) as string} videoUrl={item.url} eager={idx < 12} />
                  ) : (item.url ? (
                    <video
                      src={`${item.url}#t=0.1`}
                      className="w-full h-full object-cover rounded-md pointer-events-none"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : null)}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-2.5 md:p-2">
                      <Icon name="Play" size={18} className="text-white ml-0.5" />
                    </div>
                  </div>
                  {item.is_repost && (
                    <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FF5A3C]">
                      <Icon name="Repeat2" size={10} className="text-white" />
                      <span className="text-white text-[8px] font-semibold">Репост</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setCategoryEditId(item.id); }}
                    className="absolute bottom-1 left-1 right-1 flex items-center gap-1 px-2 py-1 rounded-md bg-black/55 backdrop-blur"
                  >
                    <Icon name="Tag" size={11} className="text-white/80 flex-shrink-0" />
                    <span className="text-white text-[10px] font-medium truncate">{categoryLabel(item.category)}</span>
                  </button>
                </div>
              ))}
            </div>
          );
        })()
      ) : tab === "articles" ? (
        <div className="relative">
          <button
            onClick={() => setShowArticles(true)}
            className="m-3 mb-0 px-4 py-2 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold flex items-center gap-1.5"
          >
            <Icon name="Plus" size={14} /> Написать статью или туториал
          </button>
          <UserArticlesList articles={myArticles} loading={myArticlesLoading} emptyText="Вы ещё не написали ни одной статьи" />
        </div>
      ) : tab === "posts" ? (
        (() => {
          const photos = stories.filter(s => (s.type === "image" || s.type === "text") && !s.is_repost);
          return photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Image" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет фото и постов</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1 bg-gray-200 p-1">
              {photos.map((item, idx) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-200 cursor-pointer" onClick={() => setMediaViewer({ tab: item.type === "text" ? "text" : "image", id: item.id })}>
                  {item.type === "text" ? (
                    <div className="w-full h-full rounded-md p-2 bg-gradient-to-br from-[#2a1f3d] to-[#1a2a3a] flex items-center">
                      <p className="text-white text-[11px] leading-snug line-clamp-6 break-words">{item.description}</p>
                    </div>
                  ) : (
                    <img loading={idx < 12 ? "eager" : "lazy"} decoding="async" src={item.url} alt="" className="w-full h-full object-cover rounded-md" />
                  )}
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        (() => {
          const reposts = stories.filter(s => s.is_repost);
          return reposts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Repeat2" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет репостов</p>
              <p className="text-xs text-gray-400/70 text-center px-8">Нажми «Репост к себе» под чужим видео — оно появится здесь</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1 bg-gray-200 p-1">
              {reposts.map((item, idx) => (
                <div
                  key={item.id}
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #2E2E2B 0%, #1a1a1a 100%)" }}
                  onClick={() => setMediaViewer({ tab: item.type, id: item.id, onlyReposts: true })}
                >
                  {(item.thumb || item.thumbnail) ? (
                    <img loading={idx < 12 ? "eager" : "lazy"} decoding="async" src={item.thumb || item.thumbnail} alt="" className="w-full h-full object-cover rounded-md" />
                  ) : item.type === "image" ? (
                    <img loading={idx < 12 ? "eager" : "lazy"} decoding="async" src={item.url} alt="" className="w-full h-full object-cover rounded-md" />
                  ) : item.url ? (
                    <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover rounded-md pointer-events-none" muted playsInline preload="metadata" />
                  ) : null}
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-2.5 md:p-2">
                        <Icon name="Play" size={18} className="text-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FF5A3C]">
                    <Icon name="Repeat2" size={10} className="text-white" />
                    <span className="text-white text-[8px] font-semibold">Репост</span>
                  </div>
                  {item.handle && (
                    <div className="absolute bottom-1 left-1 right-1 px-2 py-1 rounded-md bg-black/55 backdrop-blur">
                      <span className="text-white text-[10px] font-medium truncate block">@{item.handle}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()
      )}
    </>
  );
};

export default ProfileMediaTabs;
