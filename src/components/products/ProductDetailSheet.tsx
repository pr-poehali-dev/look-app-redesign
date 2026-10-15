import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { Product, openProductLink, hasProductLink, buildProductLink } from "@/hooks/useProducts";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ReviewsSheet from "./ReviewsSheet";

interface Props {
  product: Product;
  videoId?: number;
  onClose: () => void;
}

const ProductDetailSheet = ({ product: p, videoId, onClose }: Props) => {
  const { user } = useAuth();
  const [showReviews, setShowReviews] = useState(false);

  const isExternal = hasProductLink(p);

  const goExternal = () => {
    openProductLink(p, videoId, user?.id);
  };

  const openShop = () => {
    if (!p.owner_handle) return;
    onClose();
    window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: p.owner_handle, tab: "shop" } }));
  };

  const writeToSeller = () => {
    if (!p.owner_handle) return;
    if (!user) {
      toast.error("Войди в аккаунт, чтобы написать продавцу");
      return;
    }
    onClose();
    const draft = `Здравствуйте! Интересует товар «${p.title}»\n${buildProductLink(p.id)}`;
    window.dispatchEvent(new CustomEvent("open-direct-message", { detail: { handle: p.owner_handle, draft } }));
  };

  const isOwn = !!user && p.owner_user_id === user.id;

  const discount = p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex flex-col justify-end md:justify-center md:items-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="sheet-theme rounded-t-3xl md:rounded-2xl w-full md:w-[440px] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white/5">
          {p.image ? (
            <img loading="lazy" decoding="async" src={p.image} alt={p.title} className="w-full max-h-[48vh] object-cover" />
          ) : (
            <div className="w-full h-48 flex items-center justify-center">
              <Icon name="ShoppingBag" size={40} className="text-white/30" />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          >
            <Icon name="X" size={18} className="text-white" />
          </button>
          {discount > 0 && (
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#fe2c55] text-white text-xs font-bold">
              -{discount}%
            </span>
          )}
        </div>

        <div className="px-4 pt-4 pb-6 flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[#fe2c55] text-2xl font-extrabold">{p.price > 0 ? `${p.price.toLocaleString("ru-RU")} ₽` : "Бесплатно"}</span>
            {discount > 0 && p.old_price && (
              <span className="text-white/40 text-sm line-through">{p.old_price.toLocaleString("ru-RU")} ₽</span>
            )}
          </div>

          <h3 className="text-white text-base font-semibold leading-snug">{p.title}</h3>

          {p.promo_code && (
            <span className="inline-block w-fit px-2.5 py-1 rounded-full bg-[#fe2c55]/20 text-[#fe2c55] text-xs font-bold">
              Промокод: {p.promo_code}
            </span>
          )}

          {p.description && (
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap break-words">{p.description}</p>
          )}

          {p.in_stock === false && <p className="text-amber-400 text-sm font-medium">Нет в наличии</p>}

          {p.owner_handle && !p.is_partner && (
            <button onClick={openShop} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 active:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {p.owner_avatar && <img loading="lazy" decoding="async" src={p.owner_avatar} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white text-sm font-semibold truncate">{p.owner_name || `@${p.owner_handle}`}</p>
                <p className="text-white/50 text-xs flex items-center gap-1">
                  <Icon name="Store" size={12} />
                  Перейти в магазин
                </p>
              </div>
              <Icon name="ChevronRight" size={18} className="text-white/40" />
            </button>
          )}

          <button onClick={() => setShowReviews(true)} className="flex items-center gap-2 text-white/70 text-sm w-fit">
            <Icon name="Star" size={15} />
            Отзывы о товаре
          </button>

          {p.owner_handle && !p.is_partner && !isOwn && (
            <button
              onClick={writeToSeller}
              className="flex items-center justify-center gap-2 h-11 rounded-full bg-white/10 text-white text-sm font-semibold active:scale-95 transition-transform"
            >
              <Icon name="MessageCircle" size={17} />
              Написать продавцу
            </button>
          )}

          {isExternal && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={goExternal}
                disabled={p.in_stock === false}
                className="flex-1 h-12 rounded-full bg-[#fe2c55] text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Icon name="ExternalLink" size={17} />
                Перейти на сайт продавца
              </button>
            </div>
          )}
        </div>
      </div>
      {showReviews && <ReviewsSheet productId={p.id} title={p.title} onClose={() => setShowReviews(false)} />}
    </div>,
    document.body
  );
};

export default ProductDetailSheet;