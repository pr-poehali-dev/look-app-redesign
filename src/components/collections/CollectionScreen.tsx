import { useRef, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useMyBoards, addItemToBoard } from "@/hooks/useBoards";
import { useCollectionView, useCollections, type CollectionItem } from "@/hooks/useCollections";
import CollectionPlayer from "./CollectionPlayer";

interface Props {
  collectionId: number;
  onBack: () => void;
}

const CollectionScreen = ({ collectionId, onBack }: Props) => {
  const { user } = useAuth();
  const [onlyNew, setOnlyNew] = useState(false);
  const { title, isSystem, items, loading, setWatched, removeItem } = useCollectionView(collectionId, onlyNew);
  const { rename, remove } = useCollections();
  const { boards } = useMyBoards();
  const [playFrom, setPlayFrom] = useState<number | null>(null);
  const [menuItem, setMenuItem] = useState<CollectionItem | null>(null);
  const [moving, setMoving] = useState<CollectionItem | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const startPress = (it: CollectionItem) => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => { longPressed.current = true; setMenuItem(it); }, 500);
  };
  const endPress = () => { if (pressTimer.current) window.clearTimeout(pressTimer.current); };

  const doRename = async () => {
    const t = window.prompt("Название коллекции", title);
    if (t && t.trim()) { await rename(collectionId, t.trim()); toast("Название изменено"); }
  };
  const doRemove = async () => {
    if (!window.confirm("Убрать коллекцию? Видео из неё пропадут из сохранённого.")) return;
    await remove(collectionId);
    onBack();
  };

  const moveToBoard = async (boardId: number, boardTitle: string) => {
    if (!moving || !user?.id) return;
    await addItemToBoard(boardId, { itemType: moving.is_video ? "video" : "post", itemId: moving.item_id, image: moving.image || "", title: moving.title || "", sourceHandle: moving.handle || undefined }, user.id);
    toast.success(`В доске «${boardTitle}» 📌`);
    setMoving(null);
  };

  const unwatched = items.filter((i) => !i.watched).length;
  const playable = items;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg truncate">{title}</span>
        {!isSystem ? (
          <button onClick={doRename} className="p-1" aria-label="Переименовать"><Icon name="Pencil" size={20} className="text-black" /></button>
        ) : <span className="w-7" />}
      </div>

      <div className="px-4 pt-3 flex items-center gap-2">
        <button
          onClick={() => playable.length && setPlayFrom(0)}
          disabled={!playable.length}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold disabled:opacity-40"
        >
          <Icon name="Play" size={16} />Смотреть подряд
        </button>
        <button
          onClick={() => setOnlyNew((v) => !v)}
          className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold ${onlyNew ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
        >Непросмотренные</button>
      </div>
      <p className="px-4 pt-2 text-gray-500 text-xs">{`${items.length} видео · ${unwatched} не просмотрено`}</p>

      {loading ? (
        <div className="grid grid-cols-3 gap-1 p-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton-box aspect-[3/4]" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><Icon name="Clock" size={28} className="text-gray-400" /></div>
          <p className="text-sm text-gray-500">{onlyNew ? "Всё просмотрено" : "Здесь пока пусто. Сохраняй свайпом влево по видео в ленте"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-3 pb-28">
          {items.map((it, idx) => (
            <button
              key={it.id}
              onPointerDown={() => startPress(it)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onClick={() => { if (!longPressed.current) setPlayFrom(idx); }}
              onContextMenu={(e) => { e.preventDefault(); setMenuItem(it); }}
              className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100"
            >
              {it.image ? <img src={it.image} alt="" loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icon name="Play" size={22} className="text-gray-400" /></div>}
              {it.is_video && <span className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-black/55 flex items-center justify-center"><Icon name="Play" size={10} className="text-white" /></span>}
              {it.watched && <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"><Icon name="Check" size={12} className="text-white" /></span>}
              {it.watched && <span className="absolute inset-0 bg-black/20" />}
            </button>
          ))}
        </div>
      )}

      {!isSystem && (
        <div className="px-4 pb-28">
          <button onClick={doRemove} className="w-full py-2.5 rounded-xl bg-gray-100 text-red-500 text-sm font-semibold">Убрать коллекцию</button>
        </div>
      )}

      {playFrom !== null && (
        <CollectionPlayer
          items={playable}
          startIndex={playFrom}
          onWatched={(id) => { const it = items.find((x) => x.id === id); if (it && !it.watched) setWatched(id, true); }}
          onClose={() => setPlayFrom(null)}
        />
      )}

      {menuItem && (
        <div className="fixed inset-0 z-[10001] flex flex-col justify-end bg-black/50" onClick={() => setMenuItem(null)}>
          <div className="bg-white rounded-t-3xl px-4 pt-4 pb-8 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMoving(menuItem); setMenuItem(null); }} className="flex items-center gap-3 px-2 py-3 text-left text-black text-sm font-semibold"><Icon name="Layers" size={18} />Перенести в доску</button>
            <button onClick={() => { setWatched(menuItem.id, !menuItem.watched); setMenuItem(null); }} className="flex items-center gap-3 px-2 py-3 text-left text-black text-sm font-semibold"><Icon name="Check" size={18} />{menuItem.watched ? "Отметить непросмотренным" : "Отметить просмотренным"}</button>
            <button onClick={() => { removeItem(menuItem); setMenuItem(null); }} className="flex items-center gap-3 px-2 py-3 text-left text-red-500 text-sm font-semibold"><Icon name="Trash2" size={18} />Убрать из коллекции</button>
          </div>
        </div>
      )}

      {moving && (
        <div className="fixed inset-0 z-[10001] flex flex-col justify-end bg-black/50" onClick={() => setMoving(null)}>
          <div className="bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="text-black font-bold text-base mb-3">Перенести в доску</p>
            {boards.filter((b) => b.my_role !== "member").length === 0 ? (
              <p className="text-gray-500 text-sm py-4">У вас пока нет досок. Создайте доску в профиле, и переносить можно будет сюда.</p>
            ) : boards.filter((b) => b.my_role !== "member").map((b) => (
              <button key={b.id} onClick={() => moveToBoard(b.id, b.title)} className="w-full flex items-center gap-3 px-2 py-3 text-left">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {b.cover_image ? <img src={b.cover_image} alt="" className="w-full h-full object-cover" /> : <Icon name="Layers" size={16} className="text-gray-400" />}
                </div>
                <span className="text-black text-sm font-semibold truncate">{b.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionScreen;
