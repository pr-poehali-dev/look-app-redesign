import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useMyBoards } from "@/hooks/useBoards";
import BoardDetailScreen from "./BoardDetailScreen";

const BOARD_COVER_ICONS = ["LayoutGrid", "Heart", "Star", "Sparkles", "Palette", "Coffee", "Camera", "Plane"];

const BoardsScreen = ({ onBack }: { onBack: () => void }) => {
  const { boards, loading, create, remove } = useMyBoards();
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  if (openedId !== null) {
    return <BoardDetailScreen boardId={openedId} onBack={() => setOpenedId(null)} />;
  }

  const handleCreate = async () => {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    await create(newTitle, "", newIsPublic);
    setSaving(false);
    setNewTitle("");
    setNewIsPublic(true);
    setCreating(false);
  };

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Мои доски</span>
        <button onClick={() => setCreating(true)} className="p-1"><Icon name="Plus" size={22} className="text-black" /></button>
      </div>

      {creating && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-col gap-2.5">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Название доски"
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-black text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setNewIsPublic((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <Icon name={newIsPublic ? "Globe" : "Lock"} size={15} />
              {newIsPublic ? "Публичная — видят все" : "Приватная — видите только вы"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setNewTitle(""); }}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-black text-sm font-semibold"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || saving}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Создаём..." : "Создать"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
          <Icon name="LayoutGrid" size={48} className="text-gray-300" />
          <p className="text-gray-400 text-sm">Пока нет ни одной доски</p>
          <p className="text-xs text-gray-400/70">Создавайте подборки сохранённых постов и делитесь ими</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {boards.map((b, i) => (
            <div key={b.id} className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-square shadow-sm">
              <button onClick={() => setOpenedId(b.id)} className="w-full h-full active:opacity-80">
                {b.cover_image ? (
                  <img src={b.cover_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Icon name={BOARD_COVER_ICONS[i % BOARD_COVER_ICONS.length]} size={32} className="text-gray-300" />
                  </div>
                )}
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center justify-between pointer-events-none">
                <span className="text-white text-xs font-semibold truncate flex items-center gap-1">
                  {!b.is_public && <Icon name="Lock" size={10} />}
                  {b.title}
                </span>
              </div>
              <button
                onClick={() => { if (confirm(`Удалить доску «${b.title}»?`)) remove(b.id); }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
              >
                <Icon name="Trash2" size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="pb-8" />
    </div>
  );
};

export default BoardsScreen;
