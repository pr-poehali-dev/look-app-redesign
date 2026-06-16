import Icon from "@/components/ui/icon";
import { ContactUser } from "./types";

interface Props {
  contacts: ContactUser[];
  contactsLoading: boolean;
  selectedIds: string[];
  inviteSearch: string;
  setInviteSearch: (v: string) => void;
  toggleSelect: (id: string) => void;
  onClose: () => void;
  onInvite: () => void;
  inviting: boolean;
}

const InviteModal = ({
  contacts,
  contactsLoading,
  selectedIds,
  inviteSearch,
  setInviteSearch,
  toggleSelect,
  onClose,
  onInvite,
  inviting,
}: Props) => {
  const filteredContacts = contacts.filter((c) =>
    !inviteSearch.trim() ? true : c.name.toLowerCase().includes(inviteSearch.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-md bg-[#111] rounded-t-3xl sm:rounded-3xl border border-white/10 flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="text-white font-bold text-base">Пригласить друзей</h3>
            <p className="text-white/40 text-xs">Выбрано: {selectedIds.length}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Закрыть"
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

        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.3) transparent" }}>
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    checked ? "bg-[#fe2c55]/15" : "hover:bg-white/5"
                  }`}
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
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      checked ? "bg-[#fe2c55] border-[#fe2c55]" : "border-white/30"
                    }`}
                  >
                    {checked && <Icon name="Check" size={12} className="text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onInvite}
            disabled={selectedIds.length === 0 || inviting}
            className="w-full py-3 rounded-xl bg-[#fe2c55] text-white font-bold text-sm disabled:opacity-40"
          >
            {inviting ? "Приглашаем..." : selectedIds.length > 0 ? `Пригласить (${selectedIds.length})` : "Выбери друзей"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;