import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { hasProductLink, type Product } from "@/hooks/useProducts";

interface Props {
  products: Product[];
  setShowProducts: (v: boolean) => void;
  handleGoToProduct: (product: Product) => void;
}

const VideoProductsSheet = ({ products, setShowProducts, handleGoToProduct }: Props) => {
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
                      <span className="text-[#FF5A3C] font-bold text-sm">{p.price.toLocaleString("ru-RU")} ₽</span>
                      {p.old_price && p.old_price > p.price && (
                        <span className="text-white/40 text-xs line-through">{p.old_price.toLocaleString("ru-RU")} ₽</span>
                      )}
                    </div>
                    {p.promo_code && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#FF5A3C]/20 text-[#FF5A3C] text-[10px] font-bold">
                        Промокод: {p.promo_code}
                      </span>
                    )}
                  </div>
                  {hasProductLink(p) && (
                    <button
                      onClick={() => handleGoToProduct(p)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#FF5A3C] text-white text-xs font-bold active:scale-95 transition-transform whitespace-nowrap"
                    >
                      Перейти
                    </button>
                  )}
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
