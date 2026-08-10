import Icon from "@/components/ui/icon";
import { useNotificationsList, AppNotification } from "@/hooks/useNotifications";

const TYPE_ICON: Record<string, string> = {
  product_moderation: "ShoppingBag",
  system: "Bell",
};

const timeAgo = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} дн назад`;
  return d.toLocaleDateString("ru-RU");
};

const NotificationRow = ({ n, onRead }: { n: AppNotification; onRead: (id: number) => void }) => {
  const isBlocked = n.type === "product_moderation" && n.title.includes("отклон");
  return (
    <button
      onClick={() => !n.is_read && onRead(n.id)}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 ${!n.is_read ? "bg-purple-50/50" : "bg-white"}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isBlocked ? "bg-red-50" : "bg-gray-100"}`}>
        <Icon name={TYPE_ICON[n.type] || "Bell"} size={18} className={isBlocked ? "text-red-500" : "text-[#8b5cf6]"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-black text-sm font-semibold">{n.title}</p>
          {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#fe2c55] flex-shrink-0" />}
        </div>
        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
        <p className="text-gray-300 text-[11px] mt-1">{timeAgo(n.created_at)}</p>
      </div>
    </button>
  );
};

const NotificationsScreen = ({ onBack }: { onBack: () => void }) => {
  const { notifications, loading, markRead, markAllRead } = useNotificationsList();
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Уведомления</span>
        {hasUnread && (
          <button onClick={markAllRead} className="absolute right-4 text-xs text-[#8b5cf6] font-semibold">
            Прочитать всё
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon name="Bell" size={28} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Пока нет уведомлений</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <NotificationRow key={n.id} n={n} onRead={markRead} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsScreen;
