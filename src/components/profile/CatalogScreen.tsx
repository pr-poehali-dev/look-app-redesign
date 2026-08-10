import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useCatalog, Product } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";

const CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "clothing", label: "Одежда" },
  { id: "shoes", label: "Обувь" },
  { id: "accessories", label: "Аксессуары" },
  { id: "beauty", label: "Красота" },
  { id: "electronics", label: "Электроника" },
  { id: "home", label: "Дом" },
  { id: "other", label: "Другое" },
];

const ProductCard = ({ p, onAdd, adding }: { p: Product; onAdd: (id: number) => void; adding: boolean }) => {
  const [liked, setLiked] = useState(false);

  const openSeller = () => {
    if (p.owner_handle && !p.is_partner) {
      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: p.owner_handle } }));
    }
  };

  const handleLike = () => {
    setLiked(true);
    onAdd(p.id);
  };

  return (
    <div className="mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="relative bg-gray-100">
        {p.image && <img src={p.image} alt={p.title} className="w-full h-auto object-cover block" loading="lazy" />}

        {p.promo_code && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold">
            Промокод
          </span>
        )}

        <button
          onClick={handleLike}
          disabled={adding}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition-transform disabled:opacity-60"
        >
          {adding ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="Heart" size={16} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          )}
        </button>
      </div>

      <div className="p-2.5 flex flex-col gap-1.5">
        <p className="text-black text-[13px] leading-snug font-medium line-clamp-2">{p.title}</p>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[#fe2c55] text-base font-bold">{p.price.toLocaleString("ru-RU")} ₽</span>
          {p.old_price && p.old_price > p.price && (
            <span className="text-gray-400 text-[11px] line-through">{p.old_price.toLocaleString("ru-RU")} ₽</span>
          )}
        </div>

        {p.owner_handle && !p.is_partner ? (
          <button onClick={openSeller} className="flex items-center gap-1.5 pt-0.5">
            <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {p.owner_avatar && <img src={p.owner_avatar} alt="" className="w-full h-full object-cover" />}
            </div>
            <span className="text-gray-400 text-[11px] truncate">{p.owner_name || `@${p.owner_handle}`}</span>
          </button>
        ) : p.is_partner ? (
          <span className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] text-[10px] font-bold">
            <Icon name="BadgeCheck" size={11} />
            Партнёр
          </span>
        ) : null}
      </div>
    </div>
  );
};

const CatalogScreen = ({ onBack }: { onBack: () => void }) => {
  const [category, setCategory] = useState("all");
  const { products, loading } = useCatalog(category);
  const { addToCart } = useCart();
  const [addingId, setAddingId] = useState<number | null>(null);

  const handleAdd = async (id: number) => {
    setAddingId(id);
    await addToCart(id);
    setAddingId(null);
  };

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Каталог</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              category === c.id ? "bg-black text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && products.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon name="Store" size={28} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">В этой категории пока нет товаров</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 px-4 pb-8">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={handleAdd} adding={addingId === p.id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogScreen;
