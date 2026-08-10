import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useCatalog } from "@/hooks/useProducts";
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
        <div className="grid grid-cols-2 gap-3 px-4 pb-8">
          {products.map((p) => (
            <div key={p.id} className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex flex-col">
              <div className="aspect-square bg-gray-100">
                {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                <p className="text-black text-xs font-semibold truncate">{p.title}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-black text-sm font-bold">{p.price.toLocaleString("ru-RU")} ₽</span>
                  {p.old_price && p.old_price > p.price && (
                    <span className="text-gray-400 text-[11px] line-through">{p.old_price.toLocaleString("ru-RU")} ₽</span>
                  )}
                </div>
                {p.promo_code && (
                  <span className="inline-block w-fit px-2 py-0.5 rounded-full bg-[#fe2c55]/10 text-[#fe2c55] text-[10px] font-bold">
                    Промокод: {p.promo_code}
                  </span>
                )}
                {p.owner_handle && !p.is_partner && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: p.owner_handle } }))}
                    className="flex items-center gap-1 text-gray-400 active:text-gray-600 transition-colors"
                  >
                    <Icon name="Store" size={11} />
                    <span className="text-[10px] font-medium truncate">@{p.owner_handle}</span>
                  </button>
                )}
                <button
                  onClick={() => handleAdd(p.id)}
                  disabled={addingId === p.id}
                  className="mt-auto w-full py-1.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {addingId === p.id ? "Добавляем..." : "В корзину"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogScreen;