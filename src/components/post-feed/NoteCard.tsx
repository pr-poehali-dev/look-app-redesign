import { useState } from "react";
import StickyImage from "./StickyImage";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post, formatLikes } from "./PostFeedTypes";
import { useLikes } from "@/hooks/useLikes";
import ProductDetailSheet from "@/components/products/ProductDetailSheet";
import { useProductsByVideos, openProductLink, hasProductLink, Product } from "@/hooks/useProducts";
import { useAuth } from "@/context/AuthContext";
import { useFollowingList } from "@/hooks/useFollowing";

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

const NoteCard = ({ post, onOpen, priority = false }: { post: Post; onOpen: () => void; priority?: boolean }) => {
  const aspect = ASPECTS[hashId(post.id) % ASPECTS.length];
  const { count: likeCount } = useLikes(post.article ? "article" : "post", post.article ? post.article.id : post.id, post.likes);
  const { user } = useAuth();
  const following = useFollowingList();
  const isFollowed = !!post.handle && following.some((h) => h.toLowerCase() === post.handle.toLowerCase());
  const [showProducts, setShowProducts] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const productVideoIds = post.hasProducts ? [post.id] : [];
  const productsByVideo = useProductsByVideos(productVideoIds);
  const products = productsByVideo[String(post.id)] || [];

  const handleGoToProduct = (p: Product) => {
    openProductLink(p, post.id, user?.id);
  };

  return (
    <div className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/5 border border-white/10 anim-card-in" style={{ breakInside: "avoid" }}>
      <button
        onClick={onOpen}
        className="block w-full text-left active:opacity-90 transition-opacity"
      >
        <div className="relative w-full bg-white/10" style={post.isText ? undefined : { aspectRatio: aspect }}>
          {post.isText ? (
            <div className="w-full px-3 py-4 bg-gradient-to-br from-[#2a1f3d] to-[#1a2a3a]">
              <p className="text-white text-[14px] leading-snug line-clamp-8 whitespace-pre-wrap break-words">{post.caption}</p>
            </div>
          ) : post.isVideo ? (
            post.thumbnail ? (
              <StickyImage fill eager={priority} src={post.thumbnail} alt={post.caption} className="w-full h-full object-cover" />
            ) : (
              <video src={post.image.includes("#") ? post.image : `${post.image}#t=0.001`} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
            )
          ) : (
            <StickyImage fill eager={priority} src={post.thumbnail || post.image} alt={post.caption} className="w-full h-full object-cover" />
          )}
          {post.article && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full pl-1.5 pr-2 py-1">
              <Icon name="ListChecks" size={11} className="text-white" />
              <span className="text-white text-[10px] font-semibold">Туториал · {post.article.steps_count || 0} шагов</span>
            </div>
          )}
          {post.isVideo && (
            <div className="absolute top-2 right-2 bg-black/40 rounded-full p-1.5">
              <Icon name="Play" size={12} className="text-white" />
            </div>
          )}
        </div>
        <div className={post.isText ? "px-2.5 pb-2.5 pt-1" : "p-2.5"}>
          {!post.isText && <p className={`text-white leading-snug line-clamp-2 mb-2 ${post.cardTitle ? "text-[14px] font-bold" : "text-[13px]"}`}>{post.cardTitle || post.caption}</p>}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={post.avatar} name={post.author || post.handle} alt={post.author} />
              </div>
              <span className="text-white/60 text-[11px] truncate">{post.handle}</span>
              {isFollowed && (
                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-[9px] font-semibold">
                  <Icon name="Check" size={8} />Вы подписаны
                </span>
              )}
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
          <span className="text-white text-[10px] font-semibold">Перейти</span>
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
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 cursor-pointer" onClick={() => setDetailProduct(p)}>
                      {p.image && <img loading="lazy" decoding="async" src={p.image} alt={p.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailProduct(p)}>
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
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {detailProduct && <ProductDetailSheet product={detailProduct} videoId={post.id} onClose={() => setDetailProduct(null)} />}
    </div>
  );
};

export default NoteCard;