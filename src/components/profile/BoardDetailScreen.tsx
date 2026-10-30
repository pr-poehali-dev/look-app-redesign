import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useBoard } from "@/hooks/useBoards";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import { addItemToBoard } from "@/hooks/useBoards";
import BoardMembersSheet from "./BoardMembersSheet";
import { topicTitle } from "@/lib/topics";
import { toast } from "sonner";

const BoardDetailScreen = ({ boardId, onBack }: { boardId: number; onBack: () => void }) => {
  const { user } = useAuth();
  const { board, items, myRole, members, loading, error, refresh, removeItem } = useBoard(boardId);
  const { userVideos } = useUserMedia();
  const [opened, setOpened] = useState<{ image: string; isVideo: boolean } | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const isOwner = myRole === "owner";
  const canAdd = myRole === "owner" || myRole === "editor";
  const existing = new Set(items.map((i) => `${i.item_type}:${i.item_id}`));

  const addMine = async (m: (typeof userVideos)[number]) => {
    if (!user?.id) return;
    const isVideo = m.type === "video";
    await addItemToBoard(boardId, {
      itemType: isVideo ? "video" : "post",
      itemId: m.id,
      image: (isVideo ? (m.thumb || m.thumbnail) : m.url) || m.url,
      title: m.description || "",
    }, user.id);
    toast.success("Добавлено на доску");
    refresh();
  };

  if (loading && !board) {
    return (
      <div className="h-full bg-white px-4 pt-14">
        <div className="skeleton-box h-6 w-40 mx-auto mb-6" />
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-box aspect-[4/5]" />)}</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
          <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
          <span className="flex-1 text-center text-black font-bold text-lg pr-7">Доска</span>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
          <Icon name="LayoutGrid" size={48} className="text-gray-300" />
          <p className="text-gray-400 text-sm">{error === "private board" ? "Эта доска приватная" : "Доска не найдена"}</p>
        </div>
      </div>
    );
  }

  const subtitle = `${items.length} ${items.length === 1 ? "пост" : items.length >= 2 && items.length <= 4 ? "поста" : "постов"}${board.is_collab ? " · коллективная" : ""}${board.topic ? ` · ${topicTitle(board.topic)}` : ""}${!board.is_public ? " · приватная" : ""}`;
  const shown = members.slice(0, 4);

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-2 px-4 pt-14 pb-3 border-b border-gray-100">
        <button onClick={onBack} className="p-1 w-8" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-black font-semibold text-[15px] leading-tight truncate">{board.title}</p>
          <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
        </div>
        <div className="w-8 flex justify-end">
          {isOwner && (
            <button onClick={() => setShowMembers(true)} className="p-1" aria-label="Настройки доски"><Icon name="Settings" size={20} className="text-black" /></button>
          )}
        </div>
      </div>

      {board.description && <p className="px-4 pt-3 text-gray-500 text-sm">{board.description}</p>}

      {(isOwner || board.is_collab) && (
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setShowMembers(true)} className="flex items-center" aria-label="Участники">
            {shown.map((m, i) => (
              <span
                key={m.user_id}
                className="w-6 h-6 rounded-full border-2 border-white bg-[#FFE9E3] text-[#FF5A3C] text-[10px] font-bold flex items-center justify-center"
                style={{ marginLeft: i === 0 ? 0 : -8 }}
              >
                {((m.name || m.handle || "?")[0] || "?").toUpperCase()}
              </span>
            ))}
            {members.length > shown.length && <span className="ml-2 text-gray-500 text-xs">+{members.length - shown.length}</span>}
          </button>
          {isOwner && (
            <button onClick={() => setShowMembers(true)} className="h-8 px-4 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-[13px] font-semibold flex items-center gap-1.5">
              <Icon name="UserPlus" size={14} />Пригласить
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FFE9E3] flex items-center justify-center"><Icon name="LayoutGrid" size={36} className="text-[#FF5A3C]" /></div>
          <p className="text-gray-500 text-sm">Здесь пока пусто. Добавь первый пост{isOwner || board.is_collab ? " — или позови друзей" : ""}</p>
          {isOwner && (
            <button onClick={() => setShowMembers(true)} className="h-10 px-6 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-sm font-semibold">Пригласить</button>
          )}
        </div>
      ) : (
        <div className="columns-2 gap-3 px-4 pb-28">
          {items.map((item) => {
            const isVideo = item.item_type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(item.image || "");
            const who = item.added_by_handle || "";
            return (
              <div key={item.id} className="mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-gray-50 relative group anim-card-in">
                <button onClick={() => item.image && setOpened({ image: item.image, isVideo })} className="w-full block">
                  {isVideo ? (
                    <video src={item.image || undefined} className="w-full h-auto object-cover block" muted playsInline preload="metadata" />
                  ) : (
                    item.image && <img src={item.image} alt={item.title || ""} className="w-full h-auto object-cover block" loading="lazy" />
                  )}
                </button>
                {who && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-[8px] font-bold flex items-center justify-center border border-white" title={`@${who}`}>
                    {who[0].toUpperCase()}
                  </span>
                )}
                {item.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/55 backdrop-blur-sm px-2.5 py-1.5 pointer-events-none">
                    <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2">{item.title}</p>
                  </div>
                )}
                {(isOwner || (myRole === "editor" && item.added_by === user?.id)) && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="X" size={14} className="text-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canAdd && (
        <div className="sticky bottom-20 px-4 pb-2 pointer-events-none flex justify-center">
          <button onClick={() => setShowPicker(true)} className="pointer-events-auto h-11 px-8 rounded-full bg-[#FF5A3C] text-white text-[15px] font-semibold flex items-center gap-2 shadow-lg active:scale-95 transition-transform">
            <Icon name="Plus" size={16} />Добавить пост
          </button>
        </div>
      )}

      {showMembers && (
        <BoardMembersSheet boardId={boardId} members={members} isOwner={isOwner} onChanged={refresh} onClose={() => setShowMembers(false)} />
      )}

      {showPicker && (
        <div className="fixed inset-0 z-[10001] bg-white flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-gray-100">
            <button onClick={() => setShowPicker(false)} className="p-1"><Icon name="X" size={22} className="text-black" /></button>
            <span className="flex-1 text-center text-black font-bold text-lg pr-7">Выберите пост</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {userVideos.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-16 px-8">У вас пока нет публикаций. Чужой пост можно добавить кнопкой «В доску» под ним в ленте.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {userVideos.filter((m) => m.type !== "text").map((m) => {
                  const isVideo = m.type === "video";
                  const done = existing.has(`${isVideo ? "video" : "post"}:${m.id}`);
                  return (
                    <button key={m.id} disabled={done} onClick={() => addMine(m)} className="relative aspect-square bg-gray-100 overflow-hidden rounded-md">
                      <img src={(isVideo ? (m.thumb || m.thumbnail) : m.url) || ""} alt="" className="w-full h-full object-cover" loading="lazy" />
                      {done && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Icon name="Check" size={22} className="text-white" /></div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {opened && (
        <div className="fixed inset-0 z-[10001] bg-black flex flex-col" onClick={() => setOpened(null)}>
          <div className="flex items-center justify-end px-4 pt-12 pb-3">
            <button onClick={() => setOpened(null)} className="p-2 -mr-2">
              <Icon name="X" size={22} className="text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {opened.isVideo ? (
              <video src={opened.image} className="max-h-full max-w-full object-contain" controls autoPlay playsInline loop />
            ) : (
              <img loading="lazy" decoding="async" src={opened.image} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardDetailScreen;
