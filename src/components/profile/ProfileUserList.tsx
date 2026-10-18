import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useFollowing } from "@/hooks/useFollowing";

export interface UserItem { name: string; handle: string; avatar: string }

const UserListRow = ({ u, showUnfollow }: { u: UserItem; showUnfollow: boolean }) => {
  const { following, unfollow } = useFollowing(u.handle);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
        <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-black font-semibold text-sm">{u.name}</p>
        <p className="text-gray-400 text-xs">@{u.handle}</p>
      </div>
      {showUnfollow && following && (
        <button
          onClick={unfollow}
          className="flex-shrink-0 px-3 py-1.5 rounded-full border border-gray-300 text-black text-xs font-semibold active:scale-95 transition-transform"
        >
          Отписаться
        </button>
      )}
    </div>
  );
};

export const ProfileUserList = ({ title, users, onBack, emptyText, showUnfollow }: { title: string; users: UserItem[]; onBack: () => void; emptyText: string; showUnfollow?: boolean }) => {
  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">{title}</span>
      </div>
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Icon name="Users" size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">{emptyText}</p>
        </div>
      ) : (
        <div>
          {users.map((u) => (
            <UserListRow key={u.handle} u={u} showUnfollow={!!showUnfollow} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileUserList;
