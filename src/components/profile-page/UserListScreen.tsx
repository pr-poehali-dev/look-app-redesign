import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { UserItem } from "./shared";

const UserListScreen = ({ title, users, onBack, emptyText }: { title: string; users: UserItem[]; onBack: () => void; emptyText: string }) => {
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
            <div key={u.handle} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-black font-semibold text-sm">{u.name}</p>
                <p className="text-gray-400 text-xs">@{u.handle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserListScreen;
