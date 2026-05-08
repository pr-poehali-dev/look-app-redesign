import { useState } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";

interface UserItem {
  name: string;
  handle: string;
  avatar: string;
}

const UserListScreen = ({ title, users, onBack }: { title: string; users: UserItem[]; onBack: () => void }) => {
  const [followed, setFollowed] = useState<string[]>([]);
  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">{title}</span>
      </div>
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
            <button
              onClick={() => setFollowed(f => f.includes(u.handle) ? f.filter(x => x !== u.handle) : [...f, u.handle])}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${followed.includes(u.handle) ? "bg-gray-100 text-gray-500" : "bg-[#8b5cf6] text-white"}`}
            >
              {followed.includes(u.handle) ? "Подписан" : "Подписаться"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserListScreen;
