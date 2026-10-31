import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useCollections, createCollection } from "@/hooks/useCollections";
import CollectionScreen from "./CollectionScreen";

const CollectionsTab = () => {
  const { user } = useAuth();
  const { collections, loading } = useCollections();
  const [openedId, setOpenedId] = useState<number | null>(null);

  const addNew = async () => {
    if (!user?.id) return;
    const c = await createCollection(user.id);
    if (c.id) setOpenedId(c.id);
  };

  if (openedId !== null) {
    return (
      <div className="fixed inset-0 z-[9990] bg-white">
        <CollectionScreen collectionId={openedId} onBack={() => setOpenedId(null)} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-28">
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-500 text-xs">Сохраняй, чтобы посмотреть. Видите только вы.</p>
        <button onClick={addNew} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Новая коллекция"><Icon name="Plus" size={18} className="text-black" /></button>
      </div>
      {loading && collections.length === 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-[26px]">{[0, 1].map((i) => <div key={i} className="skeleton-box aspect-square !rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-[26px]">
          {collections.map((c) => (
            <button key={c.id} onClick={() => setOpenedId(c.id)} className="text-left anim-card-in">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {c.cover ? <img src={c.cover} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Icon name={c.is_system ? "Clock" : "Folder"} size={34} className="text-gray-300" />}
                <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><Icon name="Play" size={13} className="text-white" /></span>
              </div>
              <p className="text-black text-[13px] font-semibold mt-2 truncate">{c.title}</p>
              <p className="text-gray-500 text-[11px]">{`${c.total} видео · ${c.unwatched} не просмотрено`}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionsTab;
