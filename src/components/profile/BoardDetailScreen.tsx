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
      <div className="h-full bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7 truncate">{board.title}</span>
      </div>

      <div className="px-4 py-3">
        {board.description && <p className="text-gray-500 text-sm mb-1">{board.description}</p>}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">{items.length} {items.length === 1 ? "пост" : "постов"}</span>
          {board.topic && <span className="text-gray-400 text-xs">· {topicTitle(board.topic)}</span>}
          {board.is_collab && (
            <span className="flex items-center gap-1 text-gray-400 text-xs"><Icon name="Users" size={11} />Общая</span>
          )}
          {!board.is_public && (
            <span className="flex items-center gap-1 text-gray-400 text-xs">
              <Icon name="Lock" size={11} />
              Приватная
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {canAdd && (
            <button onClick={() => setShowPicker(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-black text-white text-sm font-semibold">
              <Icon name="Plus" size={15} />Добавить пост
            </button>
          )}
          {(isOwner || board.is_collab) && (
            <button onClick={() => setShowMembers(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-black text-sm font-semibold">
              <Icon name="Users" size={15} />{isOwner ? "Пригласить" : "Участники"}
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
          <Icon name="LayoutGrid" size={48} className="text-gray-300" />
          <p className="text-gray-400 text-sm">В этой доске пока пусто</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 px-4 pb-8">
          {items.map((item) => {
            const isVideo = item.item_type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(item.image || "");
            return (
              <div key={item.id} className="mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-gray-50 relative group">
                <button onClick={() => item.image && setOpened({ image: item.image, isVideo })} className="w-full block">
                  {isVideo ? (
                    <video src={item.image || undefined} className="w-full h-auto object-cover block" muted playsInline preload="metadata" />
                  ) : (
                    item.image && <img src={item.image} alt={item.title || ""} className="w-full h-auto object-cover block" loading="lazy" />
                  )}
                </button>
                {item.title && (
                  <p className="text-black text-xs leading-snug line-clamp-2 px-2 pt-1.5">{item.title}</p>
                )}
                {board.is_collab && item.added_by_handle && (
                  <p className="text-gray-400 text-[10px] px-2 pb-1.5 pt-0.5">добавил @{item.added_by_handle}</p>
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
