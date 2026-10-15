import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import type { Product } from "@/hooks/useProducts";

interface Props {
  products: Product[];
  addingProductId: number | null;
  setShowProducts: (v: boolean) => void;
  handleBuyNow: (productId: number) => void;
  handleAddToCart: (productId: number) => void;
}

const VideoProductsSheet = ({ products, addingProductId, setShowProducts, handleBuyNow, handleAddToCart }: Props) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40"
      onClick={() => setShowProducts(false)}
    >
      <div
        className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[380px] md:shadow-2xl max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-bold text-base flex items-center gap-2">
            <Icon name="ShoppingBag" size={18} />
            Товары из этого видео
          </span>
          <button onClick={() => setShowProducts(false)}>
            <Icon name="X" size={20} className="text-white/60" />
          </button>
        </div>
        {products.length === 0 ? (
          <p className="text-white/40 text-sm py-6 text-center">Загружаем товары...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 bg-white/5 rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                    {p.image && <img loading="lazy" decoding="async" src={p.image} alt={p.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[#fe2c55] font-bold text-sm">{p.price.toLocaleString("ru-RU")} ₽</span>
                      {p.old_price && p.old_price > p.price && (
                        <span className="text-white/40 text-xs line-through">{p.old_price.toLocaleString("ru-RU")} ₽</span>
                      )}
                    </div>
                    {p.promo_code && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#fe2c55]/20 text-[#fe2c55] text-[10px] font-bold">
                        Промокод: {p.promo_code}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleBuyNow(p.id)}
                      disabled={addingProductId === p.id}
                      className="px-3 py-1.5 rounded-full bg-[#fe2c55] text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 whitespace-nowrap"
                    >
                      Перейти
                    </button>
                    <button
                      onClick={() => handleAddToCart(p.id)}
                      disabled={addingProductId === p.id}
                      className="w-9 h-9 mx-auto rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                      title="В корзину"
                    >
                      {addingProductId === p.id
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Icon name="ShoppingCart" size={15} className="text-white" />}
                    </button>
                  </div>
                </div>
                {p.owner_handle && !p.is_partner && (
                  <button
                    onClick={() => {
                      setShowProducts(false);
                      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: p.owner_handle } }));
                    }}
                    className="flex items-center gap-1.5 self-start pl-1 text-white/60 active:text-white/90 transition-colors"
                  >
                    <Icon name="Store" size={12} />
                    <span className="text-[11px] font-medium">Магазин @{p.owner_handle}</span>
                    <Icon name="ChevronRight" size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default VideoProductsSheet;
