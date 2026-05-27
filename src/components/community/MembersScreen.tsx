import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

export interface CommunityMember {
  id: string;
  name: string;
  role: "owner" | "admin" | "member" | string;
  online: boolean;
  can_invite: boolean;
  can_pin: boolean;
  can_remove_messages: boolean;
  can_ban: boolean;
  can_change_info: boolean;
  can_add_admins: boolean;
  custom_title: string;
}

interface BannedUser {
  id: string;
  name: string;
  banned_at: string | null;
  reason: string;
}

interface Props {
  communityId: string;
  communityName: string;
  creatorId: string;
  onBack: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Создатель",
  admin: "Админ",
  member: "Участник",
};

const MembersScreen = ({ communityId, communityName, creatorId, onBack }: Props) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"members" | "admins" | "banned">("members");
  const [selected, setSelected] = useState<CommunityMember | null>(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logItems, setLogItems] = useState<Array<{ actor_name: string; action: string; target_name?: string; created_at: string | null }>>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const myRole = members.find(m => m.id === user?.id)?.role || "";
  const isOwner = user?.id === creatorId || myRole === "owner";
  const isAdmin = isOwner || myRole === "admin";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}?module=community&action=members&community_id=${encodeURIComponent(communityId)}`, {
        headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setMembers(data.members || []);
      setBanned(data.banned || []);
    } catch {
      // тихо
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load();   }, [communityId]);

  const callApi = async (action: string, payload: Record<string, unknown>) => {
    if (!user) return null;
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action, community_id: communityId, ...payload }),
      });
      const raw = await res.json();
      return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
    } catch {
      return null;
    }
  };

  const promote = async (m: CommunityMember, perms?: Partial<CommunityMember>) => {
    const data = await callApi("promote", {
      user_id: m.id,
      permissions: {
        can_invite: perms?.can_invite ?? true,
        can_pin: perms?.can_pin ?? true,
        can_remove_messages: perms?.can_remove_messages ?? true,
        can_ban: perms?.can_ban ?? true,
        can_change_info: perms?.can_change_info ?? false,
        can_add_admins: perms?.can_add_admins ?? false,
      },
      custom_title: perms?.custom_title || "",
    });
    if (data?.ok) load();
    else alert(data?.error === "forbidden" ? "Нет прав" : "Не удалось назначить");
    setSelected(null);
  };

  const demote = async (m: CommunityMember) => {
    if (!confirm(`Снять админ-права с ${m.name}?`)) return;
    const data = await callApi("demote", { user_id: m.id });
    if (data?.ok) load();
    else alert("Не удалось снять права");
    setSelected(null);
  };

  const kick = async (m: CommunityMember) => {
    if (!confirm(`Удалить ${m.name} из группы?`)) return;
    const data = await callApi("kick", { user_id: m.id });
    if (data?.ok) load();
    else alert("Не удалось удалить");
    setSelected(null);
  };

  const ban = async (m: CommunityMember) => {
    const reason = prompt(`Заблокировать ${m.name}? Причина (необязательно):`, "");
    if (reason === null) return;
    const data = await callApi("ban", { user_id: m.id, reason });
    if (data?.ok) load();
    else alert("Не удалось заблокировать");
    setSelected(null);
  };

  const unban = async (uid: string, name: string) => {
    if (!confirm(`Разблокировать ${name}?`)) return;
    const data = await callApi("unban", { user_id: uid });
    if (data?.ok) load();
    else alert("Не удалось разблокировать");
  };

  const transferOwnership = async (m: CommunityMember) => {
    if (!confirm(`Передать владельца группы пользователю ${m.name}? Ты станешь обычным админом.`)) return;
    const data = await callApi("transfer_ownership", { user_id: m.id });
    if (data?.ok) {
      alert("Владелец передан");
      load();
    } else {
      alert("Не удалось передать владельца");
    }
    setSelected(null);
  };

  const loadLog = async () => {
    const data = await callApi("admin_log", {});
    if (data?.items) setLogItems(data.items);
  };

  const openLog = () => {
    setShowLog(true);
    loadLog();
  };

  const openAddMember = async () => {
    setShowAddMember(true);
    if (contacts.length || !user) return;
    setContactsLoading(true);
    try {
      const res = await fetch(`${API}?module=chat&action=all_users`, {
        headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      const memberIds = new Set(members.map(m => m.id));
      const list = (data.users || []).filter((u: { id: string }) => u.id !== user.id && !memberIds.has(u.id));
      setContacts(list);
    } catch {
      // тихо
    } finally {
      setContactsLoading(false);
    }
  };

  const inviteUsers = async (ids: string[]) => {
    if (ids.length === 0) return;
    const data = await callApi("invite", { user_ids: ids });
    if (data?.ok) {
      load();
      setShowAddMember(false);
    } else {
      alert("Не удалось добавить");
    }
  };

  const filtered = (list: CommunityMember[]) =>
    list.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  const admins = filtered(members.filter(m => m.role === "owner" || m.role === "admin"));
  const regular = filtered(members.filter(m => m.role === "member"));

  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col">
      <div className="flex items-center gap-3 p-3 border-b border-white/8">
        <button onClick={onBack} className="text-white p-2 hover:bg-white/5 rounded-full">
          <Icon name="ArrowLeft" size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold truncate">Участники</div>
          <div className="text-white/40 text-xs truncate">{communityName}</div>
        </div>
        {isAdmin && (
          <button onClick={openLog} className="text-white/60 p-2 hover:bg-white/5 rounded-full" title="Журнал действий">
            <Icon name="ScrollText" size={20} />
          </button>
        )}
        {isAdmin && (
          <button onClick={openAddMember} className="text-[#61d4f0] p-2 hover:bg-white/5 rounded-full" title="Добавить">
            <Icon name="UserPlus" size={20} />
          </button>
        )}
      </div>

      <div className="flex border-b border-white/8">
        {[
          { id: "members", label: `Все · ${members.length}` },
          { id: "admins", label: `Админы · ${members.filter(m => m.role === "owner" || m.role === "admin").length}` },
          ...(isAdmin ? [{ id: "banned", label: `Бан · ${banned.length}` }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "members" | "admins" | "banned")}
            className={`flex-1 py-3 text-sm ${tab === t.id ? "text-white border-b-2 border-[#61d4f0]" : "text-white/50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-3 py-2 border-b border-white/8">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск участника"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="text-white/40 text-sm text-center py-8">Загрузка...</div>}

        {!loading && tab === "members" && (
          <>
            {admins.length > 0 && (
              <div>
                <div className="text-white/40 text-xs px-4 py-2 uppercase tracking-wide">Админы</div>
                {admins.map(m => (
                  <MemberRow key={m.id} m={m} onClick={() => setSelected(m)} isAdmin={isAdmin} />
                ))}
              </div>
            )}
            <div>
              <div className="text-white/40 text-xs px-4 py-2 uppercase tracking-wide">Участники</div>
              {regular.length === 0 && <div className="text-white/40 text-sm text-center py-4">Никого</div>}
              {regular.map(m => (
                <MemberRow key={m.id} m={m} onClick={() => setSelected(m)} isAdmin={isAdmin} />
              ))}
            </div>
          </>
        )}

        {!loading && tab === "admins" && (
          <div>
            {admins.map(m => <MemberRow key={m.id} m={m} onClick={() => setSelected(m)} isAdmin={isAdmin} />)}
            {admins.length === 0 && <div className="text-white/40 text-sm text-center py-8">Админов нет</div>}
            {(isOwner || myRole === "admin") && (
              <div className="p-4">
                <button
                  onClick={() => setShowAddAdmin(true)}
                  className="w-full py-2 rounded-lg bg-[#61d4f0] text-black font-medium text-sm"
                >
                  <Icon name="ShieldPlus" size={16} className="inline mr-1" />
                  Назначить нового админа
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && tab === "banned" && (
          <div>
            {banned.length === 0 && <div className="text-white/40 text-sm text-center py-8">Никто не заблокирован</div>}
            {banned.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className="w-10 h-10 flex-shrink-0">
                  <UserAvatar name={b.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{b.name}</div>
                  <div className="text-white/40 text-xs truncate">{b.reason || "Без причины"}</div>
                </div>
                <button
                  onClick={() => unban(b.id, b.name)}
                  className="text-[#61d4f0] text-xs px-3 py-1 hover:bg-white/5 rounded"
                >
                  Разбанить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <MemberActions
          member={selected}
          isOwner={isOwner}
          isAdmin={isAdmin}
          myRole={myRole}
          onClose={() => setSelected(null)}
          onPromote={(perms) => promote(selected, perms)}
          onDemote={() => demote(selected)}
          onKick={() => kick(selected)}
          onBan={() => ban(selected)}
          onTransfer={() => transferOwnership(selected)}
        />
      )}

      {showAddAdmin && (
        <SelectMemberModal
          title="Назначить админом"
          members={regular}
          onClose={() => setShowAddAdmin(false)}
          onSelect={(m) => { setShowAddAdmin(false); promote(m); }}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          contacts={contacts}
          loading={contactsLoading}
          onClose={() => setShowAddMember(false)}
          onInvite={inviteUsers}
        />
      )}

      {showLog && (
        <LogModal items={logItems} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
};

const MemberRow = ({ m, onClick, isAdmin }: { m: CommunityMember; onClick: () => void; isAdmin: boolean }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5">
    <div className="relative w-10 h-10 flex-shrink-0">
      <UserAvatar name={m.name} />
      {m.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f0f0f]" />}
    </div>
    <div className="flex-1 min-w-0 text-left">
      <div className="text-white text-sm truncate flex items-center gap-2">
        {m.name}
        {m.custom_title && <span className="text-[#61d4f0] text-xs">{m.custom_title}</span>}
      </div>
      <div className="text-white/40 text-xs">{ROLE_LABEL[m.role] || m.role}</div>
    </div>
    {isAdmin && <Icon name="ChevronRight" size={18} className="text-white/30" />}
  </button>
);

const MemberActions = ({
  member, isOwner, isAdmin, myRole, onClose, onPromote, onDemote, onKick, onBan, onTransfer,
}: {
  member: CommunityMember;
  isOwner: boolean;
  isAdmin: boolean;
  myRole: string;
  onClose: () => void;
  onPromote: (perms?: Partial<CommunityMember>) => void;
  onDemote: () => void;
  onKick: () => void;
  onBan: () => void;
  onTransfer: () => void;
}) => {
  const [editPerms, setEditPerms] = useState(false);
  const [perms, setPerms] = useState({
    can_invite: member.can_invite,
    can_pin: member.can_pin,
    can_remove_messages: member.can_remove_messages,
    can_ban: member.can_ban,
    can_change_info: member.can_change_info,
    can_add_admins: member.can_add_admins,
    custom_title: member.custom_title || "",
  });

  if (!isAdmin || member.role === "owner") {
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-end" onClick={onClose}>
        <div className="bg-[#1a1a1a] w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
          <div className="text-white font-semibold mb-2">{member.name}</div>
          <div className="text-white/50 text-sm mb-3">{ROLE_LABEL[member.role] || member.role}</div>
          <button onClick={onClose} className="w-full py-2 text-white/60 hover:bg-white/5 rounded">Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-[#1a1a1a] w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <div className="text-white font-semibold">{member.name}</div>
            <div className="text-white/50 text-xs">{ROLE_LABEL[member.role] || member.role}</div>
          </div>
          <button onClick={onClose} className="text-white/60"><Icon name="X" size={20} /></button>
        </div>

        {editPerms && member.role === "admin" && (
          <div className="p-4 space-y-2 border-b border-white/8">
            <div className="text-white/60 text-xs mb-1">Права админа</div>
            {[
              { key: "can_invite", label: "Приглашать участников" },
              { key: "can_pin", label: "Закреплять сообщения" },
              { key: "can_remove_messages", label: "Удалять сообщения" },
              { key: "can_ban", label: "Банить участников" },
              { key: "can_change_info", label: "Менять данные группы" },
              { key: "can_add_admins", label: "Назначать новых админов" },
            ].map(p => (
              <label key={p.key} className="flex items-center justify-between text-white text-sm py-1">
                <span>{p.label}</span>
                <input
                  type="checkbox"
                  checked={(perms as unknown as Record<string, boolean>)[p.key]}
                  onChange={e => setPerms({ ...perms, [p.key]: e.target.checked })}
                />
              </label>
            ))}
            <input
              value={perms.custom_title}
              onChange={e => setPerms({ ...perms, custom_title: e.target.value })}
              placeholder="Звание (например: Модератор)"
              maxLength={32}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none mt-2"
            />
            <button
              onClick={() => onPromote(perms)}
              className="w-full bg-[#61d4f0] text-black font-semibold py-2 rounded-lg mt-2"
            >
              Сохранить права
            </button>
          </div>
        )}

        <div className="p-2">
          {member.role === "member" && (
            <ActionBtn icon="ShieldCheck" label="Назначить админом" onClick={() => onPromote()} />
          )}
          {member.role === "admin" && (
            <>
              <ActionBtn icon="Settings2" label="Изменить права админа" onClick={() => setEditPerms(v => !v)} />
              <ActionBtn icon="ShieldOff" label="Снять админ-права" onClick={onDemote} danger />
            </>
          )}
          {(isOwner || myRole === "admin") && (
            <ActionBtn icon="UserMinus" label="Удалить из группы" onClick={onKick} danger />
          )}
          {(isOwner || myRole === "admin") && (
            <ActionBtn icon="Ban" label="Заблокировать" onClick={onBan} danger />
          )}
          {isOwner && member.role !== "owner" && (
            <ActionBtn icon="Crown" label="Передать владельца группы" onClick={onTransfer} danger />
          )}
        </div>
      </div>
    </div>
  );
};

const ActionBtn = ({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 ${danger ? "text-red-400" : "text-white"}`}
  >
    <Icon name={icon as "Settings"} size={18} />
    <span className="text-sm">{label}</span>
  </button>
);

const SelectMemberModal = ({
  title, members, onClose, onSelect,
}: {
  title: string;
  members: CommunityMember[];
  onClose: () => void;
  onSelect: (m: CommunityMember) => void;
}) => (
  <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <div className="text-white font-semibold">{title}</div>
        <button onClick={onClose} className="text-white/60"><Icon name="X" size={18} /></button>
      </div>
      <div>
        {members.length === 0 && <div className="text-white/40 text-sm text-center py-8">Нет подходящих участников</div>}
        {members.map(m => (
          <button key={m.id} onClick={() => onSelect(m)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5">
            <div className="w-9 h-9 flex-shrink-0"><UserAvatar name={m.name} /></div>
            <div className="text-white text-sm">{m.name}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const AddMemberModal = ({
  contacts, loading, onClose, onInvite,
}: {
  contacts: Array<{ id: string; name: string; avatar?: string }>;
  loading: boolean;
  onClose: () => void;
  onInvite: (ids: string[]) => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const filtered = contacts.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <div className="text-white font-semibold">Добавить участников</div>
          <button onClick={onClose} className="text-white/60"><Icon name="X" size={18} /></button>
        </div>
        <div className="p-3 border-b border-white/8">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Поиск"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-white/40 text-sm text-center py-8">Загрузка...</div>}
          {!loading && filtered.length === 0 && <div className="text-white/40 text-sm text-center py-8">Никого не найдено</div>}
          {filtered.map(c => {
            const checked = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5"
              >
                <div className="w-9 h-9 flex-shrink-0"><UserAvatar name={c.name} src={c.avatar} /></div>
                <div className="flex-1 text-left text-white text-sm">{c.name}</div>
                <Icon name={checked ? "CheckSquare" : "Square"} size={20} className={checked ? "text-[#61d4f0]" : "text-white/30"} />
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-white/8">
          <button
            onClick={() => onInvite(selected)}
            disabled={selected.length === 0}
            className="w-full bg-[#61d4f0] text-black font-semibold py-2 rounded-lg disabled:opacity-40"
          >
            Добавить ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
};

const ACTION_LABEL: Record<string, string> = {
  promote: "назначил админом",
  demote: "снял админ-права с",
  kick: "удалил из группы",
  ban: "заблокировал",
  unban: "разблокировал",
  transfer_ownership: "передал владельца",
  pin_message: "закрепил сообщение",
  unpin_message: "открепил сообщение",
};

const LogModal = ({
  items, onClose,
}: {
  items: Array<{ actor_name: string; action: string; target_name?: string; created_at: string | null }>;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-white/8 flex items-center justify-between">
        <div className="text-white font-semibold">Журнал действий</div>
        <button onClick={onClose} className="text-white/60"><Icon name="X" size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 && <div className="text-white/40 text-sm text-center py-8">Действий ещё не было</div>}
        {items.map((it, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3">
            <div className="text-white text-sm">
              <span className="font-medium">{it.actor_name || "Админ"}</span>{" "}
              {ACTION_LABEL[it.action] || it.action}
              {it.target_name && <> <span className="font-medium">{it.target_name}</span></>}
            </div>
            <div className="text-white/40 text-xs mt-1">
              {it.created_at ? new Date(it.created_at).toLocaleString() : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default MembersScreen;