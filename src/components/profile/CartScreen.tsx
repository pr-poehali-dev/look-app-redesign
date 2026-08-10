import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useCart } from "@/hooks/useCart";

const CartScreen = ({ onBack }: { onBack: () => void }) => {
  const { items, total, loading, updateQuantity, removeItem, checkout } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [done, setDone] = useState(false);

  const handleCheckout = async () => {
    setCheckingOut(true);
    const res = await checkout();
    setCheckingOut(false);
    if (res?.order_id) {
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Корзина</span>
      </div>

      {done && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <Icon name="CheckCircle2" size={18} className="text-green-600" />
          <span className="text-green-700 text-sm font-semibold">Заказ оформлен!</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon name="ShoppingCart" size={28} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Корзина пуста</p>
          <p className="text-xs text-gray-400/70">Добавляй товары из видео в ленте — они появятся здесь</p>
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                  {item.image && <img src={item.image} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-black text-sm font-semibold truncate">{item.title}</p>
                  <p className="text-gray-500 text-xs">{item.price.toLocaleString("ru-RU")} ₽</p>
                  {item.promo_code && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#fe2c55]/10 text-[#fe2c55] text-[10px] font-bold">
                      Промокод: {item.promo_code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <Icon name="Minus" size={14} className="text-black" />
                  </button>
                  <span className="text-black font-semibold text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <Icon name="Plus" size={14} className="text-black" />
                  </button>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-red-400 flex-shrink-0"><Icon name="Trash2" size={16} /></button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 mb-3 px-1">
            <span className="text-gray-500 text-sm">Итого</span>
            <span className="text-black font-bold text-lg">{total.toLocaleString("ru-RU")} ₽</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={checkingOut}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold disabled:opacity-50"
          >
            {checkingOut ? "Оформляем..." : "Оформить заказ"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CartScreen;
