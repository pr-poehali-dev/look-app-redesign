import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useMyBoards, addItemToBoard } from "@/hooks/useBoards";
import { toast } from "sonner";

interface Props {
  itemType: "post" | "video";
  itemId: string | number;
  image: string;
  title?: string;
  onClose: () => void;
}

const AddToBoardSheet = ({ itemType, itemId, image, title, onClose }: Props) => {
  const { user } = useAuth();
  const { boards, loading, create } = useMyBoards();
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = async (boardId: number) => {
    if (!user?.id) { toast.error("Войди в аккаунт"); return; }
    setAddedIds((prev) => [...prev, boardId]);
    await addItemToBoard(boardId, { itemType, itemId, image, title }, user.id);
    toast.success("Добавлено на доску");
  };

  const handleCreateAndAdd = async () => {
    if (!newTitle.trim() || !user?.id) return;
    const id = await create(newTitle, "", true);
    setNewTitle("");
    setCreating(false);
    if (id) handleAdd(id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={onClose}>
      <div
        className="sheet-theme rounded-t-3xl px-4 pt-5 pb-8 md:rounded-2xl md:pb-5 md:mr-6 md:w-[360px] md:shadow-2xl max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-bold text-base flex items-center gap-2">
            <Icon name="Layers" size={18} />
            Добавить на доску
          </span>
          <button onClick={onClose}>
            <Icon name="X" size={20} className="text-white/60" />
          </button>
        </div>

        {creating ? (
          <div className="flex items-center gap-2 mb-3">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
              placeholder="Название доски"
              className="flex-1 bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/40"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={!newTitle.trim()}
              className="px-3 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold disabled:opacity-50"
            >
              Готово
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-3 bg-white/5 rounded-2xl p-3 mb-3"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <Icon name="Plus" size={18} className="text-white" />
            </div>
            <span className="text-white text-sm font-semibold">Новая доска</span>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : boards.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-4">Пока нет досок</p>
        ) : (
          <div className="flex flex-col gap-2">
            {boards.map((b) => {
              const added = addedIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => !added && handleAdd(b.id)}
                  className="flex items-center gap-3 bg-white/5 rounded-2xl p-3"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    {b.cover_image ? <img src={b.cover_image} className="w-full h-full object-cover" alt="" /> : <Icon name="Layers" size={16} className="text-white/40" />}
                  </div>
                  <span className="flex-1 text-left text-white text-sm font-medium truncate flex items-center gap-1.5">
                    {!b.is_public && <Icon name="Lock" size={11} className="text-white/40" />}
                    {b.title}
                  </span>
                  {added && <Icon name="Check" size={18} className="text-[#fe2c55]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AddToBoardSheet;
