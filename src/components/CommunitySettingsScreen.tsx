import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

interface ContactUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

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
  const [showInvite, setShowInvite] = useState(false);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const inviteLink = `${window.location.origin}/?community=${community.id}`;

  useEffect(() => {
    if (!showInvite || !user || contacts.length > 0) return;
    setContactsLoading(true);
    fetch(`${API}?module=chat&action=all_users`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const list: ContactUser[] = (data.users || []).filter((u: ContactUser) => u.id !== user.id);
        setContacts(list);
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, [showInvite, user, contacts.length]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleInvite = async () => {
    if (!user || selectedIds.length === 0) return;
    setInviting(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "invite", community_id: community.id, user_ids: selectedIds }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        onUpdated({ members: community.members + (data.added || selectedIds.length) });
        setSelectedIds([]);
        setShowInvite(false);
        alert(`Приглашено: ${data.added || selectedIds.length}`);
      } else {
        alert("Не удалось пригласить");
      }
    } catch (e) {
      console.error("[CommunitySettings] invite failed", e);
      alert("Не удалось пригласить. Проверь интернет.");
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      alert("Не удалось скопировать. Скопируй вручную: " + inviteLink);
    }
  };

  const shareLink = async () => {
    const text = `Присоединяйся к сообществу «${community.name}»`;
    if (navigator.share) {
      try {
        await navigator.share({ title: community.name, text, url: inviteLink });
        return;
      } catch {
        // отменено
      }
    }
    copyLink();
  };

  const filteredContacts = contacts.filter((c) =>
    !inviteSearch.trim() ? true : c.name.toLowerCase().includes(inviteSearch.trim().toLowerCase()),
  );

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

        <div className="flex flex-col gap-2 mt-2">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wide">Пригласить друзей</label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-bold"
            >
              <Icon name="UserPlus" size={16} />
              Выбрать друзей
            </button>
            <button
              onClick={shareLink}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center gap-2"
              title="Поделиться ссылкой"
            >
              <Icon name="Share2" size={16} />
            </button>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center gap-2"
              title="Скопировать ссылку"
            >
              <Icon name={linkCopied ? "Check" : "Link"} size={16} className={linkCopied ? "text-green-400" : ""} />
            </button>
          </div>
          {linkCopied && (
            <span className="text-green-400 text-xs">Ссылка скопирована</span>
          )}
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

      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-white font-bold text-base">Пригласить друзей</h3>
                <p className="text-white/40 text-xs">Выбрано: {selectedIds.length}</p>
              </div>
              <button
                onClick={() => { setShowInvite(false); setSelectedIds([]); setInviteSearch(""); }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <Icon name="X" size={16} className="text-white" />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="relative">
                <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full bg-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white text-sm outline-none placeholder-zinc-500 border border-white/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
              {contactsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-sm">
                  {inviteSearch ? "Никого не найдено" : "Нет контактов"}
                </div>
              ) : (
                filteredContacts.map((c) => {
                  const checked = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleSelect(c.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${checked ? "bg-[#fe2c55]/15" : "hover:bg-white/5"}`}
                    >
                      <div className="relative">
                        {c.avatar ? (
                          <img src={c.avatar} className="w-10 h-10 rounded-full object-cover" alt={c.name} />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center text-white text-sm font-bold">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {c.online && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#111]" />
                        )}
                      </div>
                      <span className="flex-1 text-left text-white text-sm">{c.name}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked ? "bg-[#fe2c55] border-[#fe2c55]" : "border-white/30"}`}>
                        {checked && <Icon name="Check" size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleInvite}
                disabled={selectedIds.length === 0 || inviting}
                className="w-full py-3 rounded-xl bg-[#fe2c55] text-white font-bold text-sm disabled:opacity-40"
              >
                {inviting ? "Приглашаем..." : selectedIds.length > 0 ? `Пригласить (${selectedIds.length})` : "Выбери друзей"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitySettingsScreen;