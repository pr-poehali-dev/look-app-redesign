import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post, formatLikes } from "./PostFeedTypes";
import { useLikes } from "@/hooks/useLikes";
import { useProductsByVideos, trackProductClick } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const ASPECTS = [3 / 4, 1, 4 / 5, 5 / 6, 4 / 3, 2 / 3];

function hashId(id: number | string): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const NoteCard = ({ post, onOpen }: { post: Post; onOpen: () => void }) => {
  const aspect = ASPECTS[hashId(post.id) % ASPECTS.length];
  const { count: likeCount } = useLikes("post", post.id, post.likes);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [showProducts, setShowProducts] = useState(false);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  const productVideoIds = post.hasProducts ? [post.id] : [];
  const productsByVideo = useProductsByVideos(productVideoIds);
  const products = productsByVideo[String(post.id)] || [];

  const handleBuyNow = async (productId: number) => {
    setAddingProductId(productId);
    trackProductClick(productId, post.id, user?.id);
    const ok = await addToCart(productId);
    setAddingProductId(null);
    if (ok) {
      setShowProducts(false);
      window.dispatchEvent(new CustomEvent("open-cart"));
    } else {
      toast.error("Войди в аккаунт, чтобы купить");
    }
  };

  return (
    <div className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/5" style={{ breakInside: "avoid" }}>
      <button
        onClick={onOpen}
        className="block w-full text-left active:opacity-90 transition-opacity"
      >
        <div className="relative w-full bg-white/10" style={{ aspectRatio: aspect }}>
          {post.isVideo ? (
            <video src={post.image} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={post.image} alt={post.caption} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          )}
          {post.isVideo && (
            <div className="absolute top-2 right-2 bg-black/40 rounded-full p-1.5">
              <Icon name="Play" size={12} className="text-white" />
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-white text-[13px] leading-snug line-clamp-2 mb-2">{post.caption}</p>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={post.avatar} name={post.author || post.handle} alt={post.author} />
              </div>
              <span className="text-white/60 text-[11px] truncate">{post.handle}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Icon name="Heart" size={13} className="text-white/50" />
              <span className="text-[11px] text-white/50">{formatLikes(likeCount)}</span>
            </div>
          </div>
        </div>
      </button>

      {post.hasProducts && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowProducts(true); }}
          className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full pl-1.5 pr-2 py-1 active:scale-95 transition-transform"
        >
          <Icon name="ShoppingBag" size={11} className="text-white" />
          <span className="text-white text-[10px] font-semibold">Купить</span>
        </button>
      )}

      {showProducts && createPortal(
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
                Товары из этого поста
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
                  <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                      {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" />}
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
                    <button
                      onClick={() => handleBuyNow(p.id)}
                      disabled={addingProductId === p.id}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#fe2c55] text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 whitespace-nowrap"
                    >
                      {addingProductId === p.id
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : "Купить"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NoteCard;