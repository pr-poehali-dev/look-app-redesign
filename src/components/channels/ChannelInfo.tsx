import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import LinkifiedText from "@/components/ui/linkified-text";
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
  const [target, setTarget] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = !!channel.is_admin;

  const headers = {
    "Content-Type": "application/json",
    "X-User-Id": user?.id || "anon",
    "X-User-Name": encodeURIComponent(user?.name || ""),
  };

  const loadMembers = () =>
    fetch(`${API}?module=community&action=members&community_id=${channel.id}`, { headers })
      .then((r) => r.json())
      .then((raw) => { const d = parse(raw); setMembers(d.members || []); setBanned(d.banned || []); })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    loadMembers();
  }, [channel.id]);

  const [banned, setBanned] = useState<{ id: string; name: string }[]>([]);
  const myRole = members.find((m) => m.id === user?.id)?.role;
  const isOwner = myRole === "owner" || channel.creator_id === user?.id;

  const unban = async (id: string) => {
    const res = await fetch(`${API}?module=community`, {
      method: "POST", headers,
      body: JSON.stringify({ action: "unban", community_id: channel.id, user_id: id }),
    });
    if (parse(await res.json()).ok) loadMembers();
  };

  const runAction = async (action: "promote" | "demote" | "kick" | "ban") => {
    if (!target) return;
    if (action === "kick" && !confirm(`Удалить ${target.name} из канала?`)) return;
    if (action === "ban" && !confirm(`Заблокировать ${target.name}? Он не сможет подписаться снова.`)) return;
    setBusy(true);
    const body: Record<string, unknown> = { action, community_id: channel.id, user_id: target.id };
    if (action === "promote") {
      body.permissions = {
        can_invite: true, can_pin: true, can_remove_messages: true,
        can_ban: true, can_change_info: true, can_add_admins: false,
      };
    }
    const res = await fetch(`${API}?module=community`, { method: "POST", headers, body: JSON.stringify(body) });
    const data = parse(await res.json());
    setBusy(false);
    if (!data.ok) {
      alert("Не удалось выполнить действие");
      return;
    }
    setTarget(null);
    await loadMembers();
    onChanged({ members: members.length - (action === "kick" || action === "ban" ? 1 : 0) });
  };

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
              {channel.description && <p className="text-white/60 text-sm text-center break-words"><LinkifiedText text={channel.description} /></p>}
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
              <div
                key={m.id}
                onClick={() => { if (isAdmin && m.role !== "owner" && m.id !== user?.id) setTarget(m); }}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
              >
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
                {isAdmin && m.role !== "owner" && m.id !== user?.id && (
                  <Icon name="MoreVertical" size={16} className="text-white/30" />
                )}
              </div>
            ))}
          </div>
        )}

        {isAdmin && banned.length > 0 && (
          <>
            <p className="px-4 pt-6 pb-2 text-white/40 text-xs uppercase tracking-wide">Заблокированные: {banned.length}</p>
            {banned.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <p className="flex-1 text-white/70 text-sm truncate">{b.name}</p>
                <button onClick={() => unban(b.id)} className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">Разблокировать</button>
              </div>
            ))}
          </>
        )}
      </div>
      {target && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end" onClick={() => setTarget(null)}>
          <div className="w-full bg-zinc-900 rounded-t-2xl pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="px-5 py-4 text-white font-bold text-sm border-b border-white/10 truncate">{target.name}</p>
            {target.role === "admin" ? (
              isOwner && (
                <button disabled={busy} onClick={() => runAction("demote")} className="w-full text-left px-5 py-4 text-white text-sm flex items-center gap-3 disabled:opacity-50">
                  <Icon name="ShieldOff" size={18} /> Снять с админов
                </button>
              )
            ) : (
              <button disabled={busy} onClick={() => runAction("promote")} className="w-full text-left px-5 py-4 text-white text-sm flex items-center gap-3 disabled:opacity-50">
                <Icon name="ShieldCheck" size={18} /> Назначить админом
              </button>
            )}
            {(target.role !== "admin" || isOwner) && (
              <button disabled={busy} onClick={() => runAction("kick")} className="w-full text-left px-5 py-4 text-[#fe2c55] text-sm flex items-center gap-3 disabled:opacity-50">
                <Icon name="UserMinus" size={18} /> Удалить из канала
              </button>
            )}
            {(target.role !== "admin" || isOwner) && (
              <button disabled={busy} onClick={() => runAction("ban")} className="w-full text-left px-5 py-4 text-[#fe2c55] text-sm flex items-center gap-3 disabled:opacity-50">
                <Icon name="Ban" size={18} /> Заблокировать
              </button>
            )}
            <button onClick={() => setTarget(null)} className="w-full text-left px-5 py-4 text-white/50 text-sm">Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelInfo;