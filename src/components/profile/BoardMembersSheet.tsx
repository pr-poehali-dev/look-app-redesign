import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { BoardMember, boardsPost } from "@/hooks/useBoards";
import { copyText } from "@/lib/copyText";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = { owner: "Владелец", editor: "Редактор", member: "Участник" };

interface Props {
  boardId: number;
  members: BoardMember[];
  isOwner: boolean;
  onChanged: () => void;
  onClose: () => void;
}

const BoardMembersSheet = ({ boardId, members, isOwner, onChanged, onClose }: Props) => {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<"editor" | "member">("editor");
  const [busy, setBusy] = useState(false);

  const inviteByHandle = async () => {
    if (!user || !handle.trim()) return;
    setBusy(true);
    const { ok, data } = await boardsPost("invite_handle", user.id, { board_id: boardId, handle, role }).catch(() => ({ ok: false, data: {} as Record<string, string> }));
    setBusy(false);
    if (ok) { toast.success("Участник добавлен"); setHandle(""); onChanged(); }
    else toast.error(data.error === "user not found" ? "Пользователь с таким ником не найден" : "Не удалось добавить");
  };

  const inviteByLink = async () => {
    if (!user) return;
    setBusy(true);
    const { ok, data } = await boardsPost("invite_link", user.id, { board_id: boardId, role }).catch(() => ({ ok: false, data: {} as Record<string, string> }));
    setBusy(false);
    if (!ok || !data.token) { toast.error("Не удалось создать ссылку"); return; }
    copyText(`${window.location.origin}/?board_invite=${data.token}`);
    toast.success("Ссылка скопирована. Отправьте её друзьям");
    onChanged();
  };

  const changeRole = async (userId: string, next: string) => {
    if (!user) return;
    await boardsPost("set_role", user.id, { board_id: boardId, user_id: userId, role: next }).catch(() => null);
    onChanged();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={onClose}>
      <div className="sheet-theme rounded-t-3xl px-4 pt-5 pb-8 md:rounded-2xl md:pb-5 md:mr-6 md:w-[380px] md:shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-bold text-base flex items-center gap-2"><Icon name="Users" size={18} />Участники доски</span>
          <button onClick={onClose}><Icon name="X" size={20} className="text-white/60" /></button>
        </div>

        {isOwner && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-1.5">
              {(["editor", "member"] as const).map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${role === r ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/10 border-white/15 text-white/70"}`}>
                  {r === "editor" ? "Может добавлять" : "Только смотрит"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="Ник, например @anna"
                className="flex-1 bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/40" />
              <button onClick={inviteByHandle} disabled={busy || !handle.trim()} className="px-3 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold disabled:opacity-50">Добавить</button>
            </div>
            <button onClick={inviteByLink} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold">
              <Icon name="Link" size={15} />Скопировать ссылку-приглашение
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(m.name || m.handle || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{m.name || m.handle || "Пользователь"}</p>
                <p className="text-white/40 text-xs">{m.handle ? `@${m.handle} · ` : ""}{ROLE_LABEL[m.role]}</p>
              </div>
              {isOwner && m.role !== "owner" && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeRole(m.user_id, m.role === "editor" ? "member" : "editor")} className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-[11px] font-semibold">
                    {m.role === "editor" ? "Только смотрит" : "Сделать редактором"}
                  </button>
                  <button onClick={() => changeRole(m.user_id, "remove")} aria-label="Убрать"><Icon name="X" size={16} className="text-white/50" /></button>
                </div>
              )}
            </div>
          ))}
          {members.length === 0 && <p className="text-white/40 text-sm text-center py-4">Пока только вы. Пригласите друзей по нику или ссылке.</p>}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BoardMembersSheet;
