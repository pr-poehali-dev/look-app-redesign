import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Product } from "@/hooks/useProducts";
import ProductMasonryCard from "./ProductMasonryCard";

const CATEGORY_LABELS: Record<string, string> = {
  clothing: "Одежда",
  shoes: "Обувь",
  accessories: "Аксессуары",
  beauty: "Красота",
  electronics: "Электроника",
  home: "Дом",
  other: "Другое",
};

type Sort = "new" | "cheap" | "expensive";

const SORTS: { id: Sort; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "cheap", label: "Дешевле" },
  { id: "expensive", label: "Дороже" },
];

interface Props {
  products: Product[];
  onAdd: (id: number) => void;
  addingId: number | null;
}

const ShopProductsGrid = ({ products, onAdd, addingId }: Props) => {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<Sort>("new");

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "other"));
    return Array.from(set);
  }, [products]);

  const visible = useMemo(() => {
    const list = category === "all" ? products : products.filter((p) => (p.category || "other") === category);
    const copy = [...list];
    if (sort === "cheap") copy.sort((a, b) => a.price - b.price);
    else if (sort === "expensive") copy.sort((a, b) => b.price - a.price);
    return copy;
  }, [products, category, sort]);

  const chip = (active: boolean) =>
    `flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      active ? "bg-[#2AABEE] text-white" : "bg-gray-100 text-gray-600"
    }`;

  return (
    <div className="bg-white">
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-3" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setCategory("all")} className={chip(category === "all")}>Все</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {CATEGORY_LABELS[c] || c}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 px-3 pt-3">
        <Icon name="ArrowUpDown" size={14} className="text-gray-400" />
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`px-2 py-1 text-xs font-medium rounded-md ${sort === s.id ? "text-[#2AABEE]" : "text-gray-500"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">В этой категории пока нет товаров</p>
      ) : (
        <div className="columns-2 gap-3 p-3">
          {visible.map((p) => (
            <ProductMasonryCard key={p.id} p={p} onAdd={onAdd} adding={addingId === p.id} hideOwner />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopProductsGrid;
