import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useMyBoards, addItemToBoard } from "@/hooks/useBoards";
import { useCollections, saveToCollection, createCollection, type CollectionPayload } from "@/hooks/useCollections";
import { TOPICS } from "@/lib/topics";
import { trackEvent } from "@/lib/track";

interface Props {
  payload: CollectionPayload;
  saved: boolean;
  onSavedToCollection: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const SaveToCollectionSheet = ({ payload, saved, onSavedToCollection, onRemove, onClose }: Props) => {
  const { user } = useAuth();
  const { collections } = useCollections();
  const { boards: allBoards, create } = useMyBoards();
  const boards = allBoards.filter((b) => b.my_role !== "member");
  const [addedBoards, setAddedBoards] = useState<number[]>([]);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardTopic, setBoardTopic] = useState("");

  const pickCollection = async (id: number, title: string) => {
    if (!user?.id) return;
    await saveToCollection(user.id, payload, id);
    onSavedToCollection();
    toast(`Сохранено в «${title}»`);
    onClose();
  };

  const newCollection = async () => {
    if (!user?.id) return;
    const c = await createCollection(user.id);
    if (c.id) await pickCollection(c.id, c.title || "Коллекция");
  };

  const addToBoard = async (id: number, title: string) => {
    if (!user?.id || addedBoards.includes(id)) return;
    setAddedBoards((p) => [...p, id]);
    await addItemToBoard(id, { itemType: payload.itemType === "video" ? "video" : "post", itemId: payload.itemId, image: payload.image, title: payload.title, sourceHandle: payload.handle }, user.id);
    trackEvent("board_saved", user.id);
    toast.success(`В доске «${title}» 📌`);
  };

  const createBoardAndAdd = async () => {
    const t = boardTitle.trim().slice(0, 30);
    if (!t || !boardTopic) return;
    const id = await create(t, "", false, { topic: boardTopic });
    setBoardTitle("");
    setBoardTopic("");
    setCreatingBoard(false);
    if (id) addToBoard(id, t);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 md:hidden" />
      <div className="sheet-theme relative rounded-t-3xl px-4 pt-5 pb-8 md:rounded-2xl md:mr-6 md:w-[360px] md:pb-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-bold text-base">Сохранить</span>
          <button onClick={onClose}><Icon name="X" size={20} className="text-white/60" /></button>
        </div>

        <p className="text-white/50 text-xs mb-2">Сохраняй, чтобы посмотреть</p>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {collections.map((c) => (
            <button key={c.id} onClick={() => pickCollection(c.id, c.title)} className="flex-shrink-0 w-[84px] text-left active:scale-95 transition-transform">
              <div className="relative w-[84px] h-[84px] rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                {c.cover ? <img src={c.cover} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Icon name={c.is_system ? "Clock" : "Folder"} size={22} className="text-white/60" />}
                {c.is_system && <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/55 flex items-center justify-center"><Icon name="Clock" size={11} className="text-white" /></span>}
              </div>
              <p className="text-white text-[11px] font-semibold mt-1 truncate">{c.title}</p>
            </button>
          ))}
          <button onClick={newCollection} className="flex-shrink-0 w-[84px] text-left active:scale-95 transition-transform">
            <div className="w-[84px] h-[84px] rounded-xl border border-dashed border-white/25 flex items-center justify-center">
              <Icon name="Plus" size={22} className="text-white/70" />
            </div>
            <p className="text-white/70 text-[11px] font-semibold mt-1">Новая</p>
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-white/10">
          <p className="text-[#FF5A3C] text-xs font-semibold mb-2 flex items-center gap-1.5"><Icon name="Layers" size={13} />Собирай, чтобы делиться</p>
          {creatingBoard ? (
            <div className="flex flex-col gap-2 mb-2">
              <input
                autoFocus
                value={boardTitle}
                maxLength={30}
                onChange={(e) => setBoardTitle(e.target.value)}
                placeholder="Название доски (до 30 символов)"
                className="w-full bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/40"
              />
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => setBoardTopic(boardTopic === t.slug ? "" : t.slug)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${boardTopic === t.slug ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"}`}
                  >{t.title}</button>
                ))}
              </div>
              <button
                onClick={createBoardAndAdd}
                disabled={!boardTitle.trim() || !boardTopic}
                className="w-full py-2.5 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold disabled:opacity-40"
              >Создать и добавить</button>
            </div>
          ) : (
            <button onClick={() => setCreatingBoard(true)} className="w-full flex items-center gap-3 bg-white/5 rounded-2xl p-2.5 mb-2">
              <div className="w-9 h-9 rounded-full bg-[#FF5A3C]/20 flex items-center justify-center"><Icon name="Plus" size={16} className="text-[#FF5A3C]" /></div>
              <span className="text-white text-sm font-semibold">Новая доска</span>
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            {boards.map((b) => {
              const added = addedBoards.includes(b.id);
              return (
                <button key={b.id} onClick={() => addToBoard(b.id, b.title)} className="flex items-center gap-3 bg-white/5 rounded-2xl p-2.5 text-left">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    {b.cover_image ? <img src={b.cover_image} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Icon name="Layers" size={15} className="text-white/40" />}
                  </div>
                  <span className="flex-1 text-white text-sm font-medium truncate flex items-center gap-1.5">
                    {!b.is_public && <Icon name="Lock" size={11} className="text-white/40" />}{b.title}
                  </span>
                  {added && <Icon name="Check" size={16} className="text-[#FF5A3C]" />}
                </button>
              );
            })}
          </div>
        </div>

        {saved && (
          <button onClick={onRemove} className="mt-4 w-full py-2.5 rounded-xl bg-white/5 text-red-400 text-sm font-semibold">Убрать из сохранённого</button>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SaveToCollectionSheet;
