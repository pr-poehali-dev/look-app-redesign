import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const ANALYTICS_URL = "https://functions.poehali.dev/7b5c6c18-7098-4f9b-bf3c-e6ac50574c06";

interface Summary {
  total_views: number;
  product_clicks: number;
  products_count: number;
  template_uses_by_others: number;
  live_count: number;
  videos_count: number;
  top_videos: { id: number; thumbnail?: string; url: string; description: string; views: number }[];
}

const StatCard = ({ icon, label, value }: { icon: string; label: string; value: number | string }) => (
  <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1">
    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
      <Icon name={icon} size={18} className="text-[#8b5cf6]" />
    </div>
    <span className="text-black font-bold text-xl mt-1">{value}</span>
    <span className="text-gray-500 text-xs">{label}</span>
  </div>
);

const AnalyticsScreen = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    fetch(`${ANALYTICS_URL}?action=summary`, { headers: { "X-User-Id": user.id } })
      .then((r) => r.json())
      .then((raw) => {
        const body = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setData(body);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Аналитика</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
          <Icon name="BarChart3" size={28} className="text-gray-300" />
          <p className="text-sm text-gray-400">Войди в аккаунт, чтобы видеть статистику</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon="Eye" label="Просмотров всего" value={data.total_views} />
            <StatCard icon="ShoppingBag" label="Переходов по товарам" value={data.product_clicks} />
            <StatCard icon="Wand2" label="Твои шаблоны использовали" value={data.template_uses_by_others} />
            <StatCard icon="Radio" label="Проведено эфиров" value={data.live_count} />
          </div>

          <p className="text-gray-400 text-xs mt-5 mb-2 uppercase font-semibold">Твои публикации</p>
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <span className="text-gray-600 text-sm">Всего видео/фото</span>
            <span className="text-black font-bold">{data.videos_count}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <span className="text-gray-600 text-sm">Товаров создано</span>
            <span className="text-black font-bold">{data.products_count}</span>
          </div>

          {data.top_videos.length > 0 && (
            <>
              <p className="text-gray-400 text-xs mb-2 uppercase font-semibold">Топ по просмотрам</p>
              <div className="flex flex-col gap-2">
                {data.top_videos.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                      {v.thumbnail && <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <span className="flex-1 text-sm text-gray-700 truncate">{v.description || "Без описания"}</span>
                    <span className="text-black font-bold text-sm flex-shrink-0">{v.views} 👁</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsScreen;
