import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useCatalog } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import ProductMasonryCard from "@/components/products/ProductMasonryCard";

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
        <div className="columns-2 gap-3 px-4 pb-8">
          {products.map((p) => (
            <ProductMasonryCard key={p.id} p={p} onAdd={handleAdd} adding={addingId === p.id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogScreen;
