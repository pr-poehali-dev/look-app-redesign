import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useMyReferrals, deleteReferralLink } from "@/hooks/useProducts";

const ReferralsScreen = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { referrals, loading, refresh } = useMyReferrals(user?.id);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const totalEarned = referrals.reduce((sum, r) => sum + r.earned, 0);
  const totalClicks = referrals.reduce((sum, r) => sum + r.clicks, 0);

  const copyLink = async (productId: number, code: string) => {
    const url = `${window.location.origin}/?product=${productId}&ref=${code}`;
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
  };

  const handleDelete = async (productId: number) => {
    if (!user?.id) return;
    setDeletingId(productId);
    await deleteReferralLink(productId, user.id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    refresh();
  };

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Партнёрские ссылки</span>
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Переходов</p>
            <p className="text-black text-xl font-bold">{totalClicks}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">Заработано</p>
            <p className="text-[#fe2c55] text-xl font-bold">{totalEarned.toLocaleString("ru-RU")} ₽</p>
          </div>
        </div>

        <p className="text-gray-400 text-xs mb-3">
          Продвигай товары из каталога — жми «Партнёрская ссылка» на карточке товара, делись ссылкой,
          и получай комиссию с каждой покупки по ней.
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Icon name="Link" size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Пока нет партнёрских ссылок</p>
            <p className="text-xs text-gray-400/70">Найди товар в каталоге и создай на него ссылку</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {referrals.map((r) => (
              <div key={r.product_id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                  {r.image && <img src={r.image} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-black text-sm font-semibold truncate">{r.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-500 text-xs">{r.clicks} переходов</span>
                    <span className="text-gray-500 text-xs">{r.orders_count} покупок</span>
                  </div>
                  <span className="text-[#fe2c55] text-xs font-bold">{r.earned.toLocaleString("ru-RU")} ₽ заработано</span>
                </div>
                <button
                  onClick={() => copyLink(r.product_id, r.referral_code)}
                  className="p-2.5 rounded-full bg-white shadow-sm flex-shrink-0"
                  title="Скопировать ссылку"
                >
                  <Icon name="Copy" size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(r.product_id)}
                  className="p-2.5 rounded-full bg-white shadow-sm flex-shrink-0"
                  title="Удалить ссылку"
                >
                  <Icon name="Trash2" size={16} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-sm p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-center font-semibold text-gray-800">Удалить партнёрскую ссылку?</p>
            <p className="text-center text-gray-400 text-xs -mt-1">Уже начисленный заработок по прошлым продажам сохранится</p>
            <button
              disabled={deletingId === confirmDeleteId}
              className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-60"
              onClick={() => handleDelete(confirmDeleteId)}
            >
              {deletingId === confirmDeleteId ? "Удаляем..." : "Удалить"}
            </button>
            <button
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
              onClick={() => setConfirmDeleteId(null)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralsScreen;