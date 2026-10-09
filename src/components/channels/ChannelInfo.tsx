import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { Channel } from "./types";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const parse = (raw: { body?: unknown }) => (typeof raw.body === "string" ? JSON.parse(raw.body) : raw);

interface Member {
  id: string;
  name: string;
  role: string;
  online: boolean;
}

interface Props {
  channel: Channel;
  onClose: () => void;
  onChanged: (patch: Partial<Channel>) => void;
}

const ROLE_LABELS: Record<string, string> = { owner: "Владелец", admin: "Админ" };

const ChannelInfo = ({ channel, onClose, onChanged }: Props) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || "");
  const [img, setImg] = useState(channel.img || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAdmin = !!channel.is_admin;

  const headers = {
    "Content-Type": "application/json",
    "X-User-Id": user?.id || "anon",
    "X-User-Name": encodeURIComponent(user?.name || ""),
  };

  useEffect(() => {
    fetch(`${API}?module=community&action=members&community_id=${channel.id}`, { headers })
      .then((r) => r.json())
      .then((raw) => setMembers(parse(raw).members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [channel.id]);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImg(String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const body: Record<string, string> = { action: "update", community_id: channel.id, name, description };
    if (img !== (channel.img || "")) body.img = img;
    const res = await fetch(`${API}?module=community`, { method: "POST", headers, body: JSON.stringify(body) });
    const data = parse(await res.json());
    setSaving(false);
    if (data.ok) {
      onChanged({ name: name.trim(), description, img });
      onClose();
    } else {
      alert("Не удалось сохранить");
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col">
      <div className="flex items-center gap-3 px-3 pt-14 pb-3 border-b border-white/8">
        <button onClick={onClose}><Icon name="ChevronLeft" size={24} className="text-white" /></button>
        <p className="text-white font-bold text-base flex-1">О канале</p>
        {isAdmin && (
          <button onClick={save} disabled={saving || !name.trim()} className="px-4 py-1.5 rounded-full bg-[#fe2c55] text-white text-xs font-bold disabled:opacity-50">
            {saving ? "Сохраняю…" : "Сохранить"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col items-center gap-3 px-6 py-6">
          <button
            disabled={!isAdmin}
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center"
          >
            {img ? <img src={img} className="w-full h-full object-cover" alt="" /> : <Icon name="Megaphone" size={36} className="text-white" />}
            {isAdmin && (
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 flex justify-center">
                <Icon name="Camera" size={14} className="text-white" />
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />

          {isAdmin ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Название канала"
                className="w-full bg-white/8 text-white text-center font-bold rounded-xl px-4 py-3 outline-none"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Описание канала"
                className="w-full bg-white/8 text-white text-sm rounded-xl px-4 py-3 outline-none resize-none"
              />
            </>
          ) : (
            <>
              <p className="text-white font-bold text-lg">{channel.name}</p>
              {channel.description && <p className="text-white/60 text-sm text-center">{channel.description}</p>}
            </>
          )}
        </div>

        <p className="px-4 pb-2 text-white/40 text-xs uppercase tracking-wide">Подписчики: {members.length}</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                  {(m.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{m.name}</p>
                  <p className="text-white/40 text-xs">{m.online ? "в сети" : "не в сети"}</p>
                </div>
                {ROLE_LABELS[m.role] && (
                  <span className="text-[#fe2c55] text-xs font-semibold">{ROLE_LABELS[m.role]}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelInfo;
