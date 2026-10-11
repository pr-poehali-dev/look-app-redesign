import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Product, useProductsByVideos } from "@/hooks/useProducts";
import ProductDetailSheet from "./ProductDetailSheet";

interface Props {
  postId: number;
  products?: Product[];
  className?: string;
}

const PostProductStrip = ({ postId, products: given, className = "" }: Props) => {
  const byVideo = useProductsByVideos(given ? [] : [postId]);
  const products = given || byVideo[String(postId)] || [];
  const [open, setOpen] = useState<Product | null>(null);

  if (products.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {products.map((p) => (
          <button
            key={p.id}
            onClick={(e) => { e.stopPropagation(); setOpen(p); }}
            className="flex items-center gap-2.5 flex-shrink-0 w-[230px] bg-white/5 rounded-xl p-2 text-left active:bg-white/10 transition-colors"
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium line-clamp-2 leading-snug">{p.title}</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[#fe2c55] text-sm font-bold">{p.price.toLocaleString("ru-RU")} ₽</span>
                {p.old_price && p.old_price > p.price && (
                  <span className="text-white/40 text-[10px] line-through">{p.old_price.toLocaleString("ru-RU")}</span>
                )}
              </div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-white/40 flex-shrink-0" />
          </button>
        ))}
      </div>
      {open && <ProductDetailSheet product={open} videoId={postId} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default PostProductStrip;
