import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useBoard } from "@/hooks/useBoards";
import { useAuth } from "@/context/AuthContext";

const BoardDetailScreen = ({ boardId, onBack }: { boardId: number; onBack: () => void }) => {
  const { user } = useAuth();
  const { board, items, loading, error, removeItem } = useBoard(boardId);
  const [opened, setOpened] = useState<{ image: string; isVideo: boolean } | null>(null);
  const isOwner = !!user?.id && board?.owner_user_id === user.id;

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
          <span className="text-gray-400 text-xs">{items.length} {items.length === 1 ? "элемент" : "элементов"}</span>
          {!board.is_public && (
            <span className="flex items-center gap-1 text-gray-400 text-xs">
              <Icon name="Lock" size={11} />
              Приватная
            </span>
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
                  <p className="text-black text-xs leading-snug line-clamp-2 px-2 py-1.5">{item.title}</p>
                )}
                {isOwner && (
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
              <img src={opened.image} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardDetailScreen;
