import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useMyBoards } from "@/hooks/useBoards";
import { TOPICS, topicTitle } from "@/lib/topics";
import BoardDetailScreen from "./BoardDetailScreen";
import BoardCollage from "@/components/post-feed/BoardCollage";

const BOARD_COVER_ICONS = ["LayoutGrid", "Heart", "Star", "Sparkles", "Palette", "Coffee", "Camera", "Plane"];

const postsWord = (n: number) => {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return "пост";
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return "поста";
  return "постов";
};

const BoardsScreen = ({ onBack, initialBoardId }: { onBack: () => void; initialBoardId?: number | null }) => {
  const { boards, loading, create, remove } = useMyBoards();
  const [openedId, setOpenedId] = useState<number | null>(initialBoardId ?? null);
  const [creating, setCreating] = useState<null | "own" | "collab">(null);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [saving, setSaving] = useState(false);

  if (openedId !== null) {
    return <BoardDetailScreen boardId={openedId} onBack={() => setOpenedId(null)} />;
  }

  const reset = () => { setCreating(null); setNewTitle(""); setNewIsPublic(false); setNewTopic(""); };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newTopic || saving || !creating) return;
    setSaving(true);
    const isCollab = creating === "collab";
    const id = await create(newTitle.trim().slice(0, 30), "", isCollab ? true : newIsPublic, { topic: newTopic, isCollab });
    setSaving(false);
    reset();
    if (isCollab && id) setOpenedId(id);
  };

  const usedTopics = Array.from(new Set(boards.map((b) => b.topic).filter(Boolean))) as string[];
  const shown = filterTopic ? boards.filter((b) => b.topic === filterTopic) : boards;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Доски</span>
        <button onClick={() => setCreating("own")} className="p-1" aria-label="Создать доску"><Icon name="Plus" size={22} className="text-black" /></button>
      </div>

      <div className="px-4 pt-3">
        <button
          onClick={() => setCreating("collab")}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5A3C] to-[#8b5cf6] text-white text-sm font-semibold"
        >
          <Icon name="Users" size={16} />Создать коллективную доску
        </button>
      </div>

      {creating && (
        <div className="mx-4 mt-3 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
          <p className="text-black font-semibold text-sm">{creating === "collab" ? "Новая коллективная доска" : "Новая доска"}</p>
          <input
            autoFocus
            value={newTitle}
            maxLength={30}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Название доски (до 30 символов)"
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-black text-sm outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setNewTopic(newTopic === t.slug ? "" : t.slug)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${newTopic === t.slug ? "bg-[#FF5A3C] text-white border-black" : "bg-white text-gray-600 border-gray-200"}`}
              >
                {t.title}
              </button>
            ))}
          </div>
          {creating === "collab" ? (
            <p className="flex items-center gap-2 text-sm text-gray-600"><Icon name="Globe" size={15} />Коллективная доска всегда публичная</p>
          ) : (
            <button onClick={() => setNewIsPublic((v) => !v)} className="flex items-center gap-2 text-sm text-gray-600 text-left">
              <Icon name={newIsPublic ? "Globe" : "Lock"} size={15} />
              {newIsPublic ? "Публичная — видят все" : "Только для себя"}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-2 rounded-xl bg-gray-100 text-black text-sm font-semibold">Отмена</button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newTopic || saving}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FF5A3C] to-[#8b5cf6] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Создаём..." : "Создать"}
            </button>
          </div>
        </div>
      )}

      {usedTopics.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {["", ...usedTopics].map((t) => (
            <button
              key={t || "all"}
              onClick={() => setFilterTopic(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filterTopic === t ? "bg-[#FF5A3C] text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {t ? topicTitle(t) : "Все"}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-box aspect-[4/5]" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
          <Icon name="LayoutGrid" size={48} className="text-gray-300" />
          <p className="text-gray-400 text-sm">Пока нет ни одной доски</p>
          <p className="text-xs text-gray-400/70">Собирайте идеи в подборки и делитесь ими</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {shown.map((b, i) => (
            <div key={b.id} className="relative rounded-[20px] overflow-hidden bg-gray-50 aspect-[4/5] border border-gray-200 anim-card-in">
              <button onClick={() => setOpenedId(b.id)} className="w-full h-full active:opacity-80">
                <BoardCollage images={b.collage} cover={b.cover_image} />
              </button>
              <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none">
                {b.is_collab && <span className="px-1.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold flex items-center gap-1"><Icon name="Users" size={10} />Общая</span>}
                {!b.is_public && <span className="px-1.5 py-0.5 rounded-full bg-black/55 text-white text-[10px] font-semibold flex items-center gap-1"><Icon name="Lock" size={10} />Личная</span>}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2.5 pointer-events-none">
                <p className="text-white text-sm font-bold truncate">{b.title}</p>
                <p className="text-white/70 text-[11px]">{`${b.items_count ?? 0} ${postsWord(b.items_count ?? 0)}${b.topic ? ` · ${topicTitle(b.topic)}` : ""}`}</p>
              </div>
              {b.my_role === "owner" && (
                <button
                  onClick={() => { if (confirm(`Удалить доску «${b.title}»?`)) remove(b.id); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
                  aria-label="Удалить доску"
                >
                  <Icon name="Trash2" size={12} className="text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="pb-8" />
    </div>
  );
};

export default BoardsScreen;
