import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const CATEGORIES = ["Фото", "Путешествия", "Спорт", "Игры", "Еда", "Музыка", "Другое"];

interface Community {
  id: string;
  name: string;
  description: string;
  type: "open" | "closed";
  category: string;
  img: string;
  members: number;
  joined: boolean;
  is_admin?: boolean;
  creator_id?: string;
}

interface Props {
  community: Community;
  onBack: () => void;
  onUpdated: (patch: Partial<Community>) => void;
  onDeleted: () => void;
}

const CommunitySettingsScreen = ({ community, onBack, onUpdated, onDeleted }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [type, setType] = useState<"open" | "closed">(community.type);
  const [category, setCategory] = useState(community.category);
  const [img, setImg] = useState(community.img);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isOwner = user && community.creator_id === user.id;

  const handlePickImage = () => fileRef.current?.click();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 5 МБ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImgPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !isOwner) return;
    if (!name.trim()) {
      alert("Название не может быть пустым");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        action: "update",
        community_id: community.id,
        name: name.trim(),
        description: description.trim(),
        type,
        category,
      };
      if (imgPreview) payload.img = imgPreview;

      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        const patch: Partial<Community> = { name: name.trim(), description: description.trim(), type, category };
        if (imgPreview) {
          patch.img = imgPreview;
          setImg(imgPreview);
          setImgPreview(null);
        }
        onUpdated(patch);
        alert("Сохранено");
      } else {
        alert(data.error === "only creator can edit" ? "Редактировать может только создатель" : "Не удалось сохранить");
      }
    } catch (e) {
      console.error("[CommunitySettings] save failed", e);
      alert("Не удалось сохранить. Проверь интернет.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !isOwner) return;
    if (!confirm(`Удалить сообщество «${community.name}»? Это действие нельзя отменить.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "delete", community_id: community.id }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        onDeleted();
      } else {
        alert(data.error === "only creator can delete" ? "Удалить может только создатель" : "Не удалось удалить");
      }
    } catch (e) {
      console.error("[CommunitySettings] delete failed", e);
      alert("Не удалось удалить. Проверь интернет.");
    } finally {
      setDeleting(false);
    }
  };

  const displayImg = imgPreview || img;

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack}>
            <Icon name="ChevronLeft" size={24} className="text-white" />
          </button>
          <h2 className="text-white font-bold text-xl">Настройки</h2>
        </div>
        {isOwner && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#fe2c55] px-4 py-1.5 rounded-full text-white text-xs font-bold disabled:opacity-40"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-scroll px-4 pb-28 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
        <div className="relative h-40 rounded-2xl overflow-hidden bg-[#111] border border-white/10">
          {displayImg ? (
            <img src={displayImg} className="w-full h-full object-cover" alt={name} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#fe2c55]/30 to-[#8b5cf6]/30" />
          )}
          {isOwner && (
            <button
              onClick={handlePickImage}
              className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-full flex items-center gap-1.5"
            >
              <Icon name="Camera" size={14} className="text-white" />
              <span className="text-white text-xs font-semibold">Изменить фото</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner}
            placeholder="Название сообщества"
            className="bg-[#111] rounded-xl px-3 py-3 text-white text-sm outline-none placeholder-zinc-500 border border-white/10 disabled:opacity-60"
            maxLength={80}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isOwner}
            placeholder="О чём это сообщество..."
            rows={3}
            className="bg-[#111] rounded-xl px-3 py-3 text-white text-sm outline-none placeholder-zinc-500 border border-white/10 resize-none disabled:opacity-60"
            maxLength={500}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Тип</label>
          <div className="flex gap-2">
            {(["open", "closed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => isOwner && setType(t)}
                disabled={!isOwner}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                  type === t ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/50"
                }`}
              >
                <Icon name={t === "open" ? "Globe" : "Lock"} size={14} />
                {t === "open" ? "Открытое" : "Закрытое"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Категория</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => isOwner && setCategory(c)}
                disabled={!isOwner}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-60 ${
                  category === c ? "bg-white text-black" : "bg-white/10 text-white/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Статистика</label>
          <div className="bg-[#111] rounded-xl border border-white/10 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fe2c55]/20 flex items-center justify-center">
              <Icon name="Users" size={18} className="text-[#fe2c55]" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">{community.members}</div>
              <div className="text-white/50 text-xs">участников</div>
            </div>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-bold hover:bg-red-500/25 transition-colors disabled:opacity-40"
          >
            <Icon name="Trash2" size={16} />
            {deleting ? "Удаляем..." : "Удалить сообщество"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CommunitySettingsScreen;
