import { useState } from "react";
import Icon from "@/components/ui/icon";
import { DEFAULT_FOLDER, useSavedFolders } from "@/hooks/useSaved";

interface Props {
  saved: boolean;
  onPick: (folder: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

const SaveToCollectionSheet = ({ saved, onPick, onRemove, onClose }: Props) => {
  const { folders, createFolder, itemsByFolder } = useSavedFolders();
  const [name, setName] = useState("");

  const create = () => {
    const n = name.trim();
    if (!n) return;
    createFolder(n);
    onPick(n);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 md:hidden" />
      <div className="sheet-theme relative rounded-t-3xl px-4 pt-5 pb-8 md:rounded-2xl md:mr-6 md:w-[340px] md:pb-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-bold text-base">Сохранить в коллекцию</span>
          <button onClick={onClose}><Icon name="X" size={20} className="text-white/60" /></button>
        </div>
        <div className="flex flex-col gap-1">
          {folders.map((f) => (
            <button key={f} onClick={() => onPick(f)} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 text-left">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <Icon name={f === DEFAULT_FOLDER ? "Bookmark" : "Folder"} size={18} className="text-white/80" />
              </div>
              <span className="flex-1 text-white text-sm font-semibold truncate">{f}</span>
              <span className="text-white/40 text-xs">{itemsByFolder(f).length}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); }}
            placeholder="Новая коллекция"
            className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-white text-sm placeholder:text-white/40 outline-none"
          />
          <button onClick={create} className="px-3 py-2 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold">Создать</button>
        </div>
        {saved && (
          <button onClick={onRemove} className="mt-3 w-full py-2.5 rounded-xl bg-white/5 text-red-400 text-sm font-semibold">Убрать из сохранённого</button>
        )}
      </div>
    </div>
  );
};

export default SaveToCollectionSheet;
