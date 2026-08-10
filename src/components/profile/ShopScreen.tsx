import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useMyProducts, uploadProductImage } from "@/hooks/useProducts";
import type { Product } from "@/hooks/useProducts";

const STATUS_LABELS: Record<string, string> = {
  draft: "Скрыт",
  pending: "На модерации",
  active: "Активен",
  blocked: "Заблокирован",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-600",
};

const CATEGORIES = [
  { id: "clothing", label: "Одежда" },
  { id: "shoes", label: "Обувь" },
  { id: "accessories", label: "Аксессуары" },
  { id: "beauty", label: "Красота" },
  { id: "electronics", label: "Электроника" },
  { id: "home", label: "Дом" },
  { id: "other", label: "Другое" },
];

interface FormState {
  id?: number;
  title: string;
  description: string;
  price: string;
  oldPrice: string;
  image: string;
  category: string;
  promoCode: string;
  productUrl: string;
  inStock: boolean;
}

const emptyForm: FormState = {
  title: "", description: "", price: "", oldPrice: "", image: "",
  category: "other", promoCode: "", productUrl: "", inStock: true,
};

const ShopScreen = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { products, loading, create, update, toggleVisibility, remove } = useMyProducts(user?.id);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editing || !user?.id) return;
    setUploadingImage(true);
    const url = await uploadProductImage(file, user.id);
    setUploadingImage(false);
    if (url) setEditing((s) => (s ? { ...s, image: url } : s));
  };

  const openCreate = () => setEditing({ ...emptyForm });
  const openEdit = (p: Product) => setEditing({
    id: p.id,
    title: p.title,
    description: p.description || "",
    price: String(p.price),
    oldPrice: p.old_price ? String(p.old_price) : "",
    image: p.image || "",
    category: p.category || "other",
    promoCode: p.promo_code || "",
    productUrl: p.product_url || "",
    inStock: p.in_stock ?? true,
  });

  const save = async () => {
    if (!editing || !editing.title.trim() || !editing.price) return;
    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      description: editing.description.trim(),
      price: Number(editing.price),
      old_price: editing.oldPrice ? Number(editing.oldPrice) : undefined,
      image: editing.image.trim() || undefined,
      category: editing.category,
      promo_code: editing.promoCode.trim() || undefined,
      product_url: editing.productUrl.trim() || undefined,
      in_stock: editing.inStock,
    };
    if (editing.id) await update(editing.id, payload);
    else await create(payload);
    setSaving(false);
    setEditing(null);
  };

  const del = async (id: number) => {
    if (!confirm("Удалить товар навсегда?")) return;
    await remove(id);
  };

  if (editing) {
    return (
      <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
          <button onClick={() => setEditing(null)} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
          <span className="flex-1 text-center text-black font-bold text-lg pr-7">{editing.id ? "Изменить товар" : "Новый товар"}</span>
        </div>
        <div className="px-4 py-4 space-y-3">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative flex items-center justify-center"
          >
            {editing.image ? (
              <img src={editing.image} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-gray-400">
                <Icon name="ImagePlus" size={28} />
                <span className="text-xs font-medium">Загрузить фото товара</span>
              </div>
            )}
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {editing.image && !uploadingImage && (
              <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1.5">
                <Icon name="Pencil" size={14} className="text-white" />
              </div>
            )}
          </button>
          <input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            placeholder="Название товара"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <textarea
            value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            placeholder="Описание"
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <div className="flex gap-2">
            <input
              value={editing.price}
              onChange={(e) => setEditing({ ...editing, price: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="Цена ₽"
              inputMode="decimal"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={editing.oldPrice}
              onChange={(e) => setEditing({ ...editing, oldPrice: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="Старая цена"
              inputMode="decimal"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditing({ ...editing, category: c.id })}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${editing.category === c.id ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}
              >{c.label}</button>
            ))}
          </div>
          <input
            value={editing.promoCode}
            onChange={(e) => setEditing({ ...editing, promoCode: e.target.value })}
            placeholder="Промокод (необязательно)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={editing.productUrl}
            onChange={(e) => setEditing({ ...editing, productUrl: e.target.value })}
            placeholder="Ссылка на товар (необязательно)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={() => setEditing({ ...editing, inStock: !editing.inStock })}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200"
          >
            <span className="text-sm text-gray-700">В наличии</span>
            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${editing.inStock ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"}`}>
              <div className="w-5 h-5 rounded-full bg-white" />
            </div>
          </button>
          <p className="text-xs text-gray-400">Товар уйдёт на модерацию и появится в ленте после проверки администратором.</p>
          <button
            onClick={save}
            disabled={!editing.title.trim() || !editing.price || saving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold disabled:opacity-40"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
          <div className="pb-28 md:pb-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">Магазин</span>
      </div>

      <div className="px-4 py-4">
        <button
          onClick={openCreate}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold mb-4"
        >
          <Icon name="Plus" size={18} />
          Добавить товар
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Icon name="Store" size={28} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Пока нет товаров</p>
            <p className="text-xs text-gray-400/70">Добавь товар — потом сможешь прикрепить его к видео в конструкторе</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                  {p.image && <img src={p.image} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-black text-sm font-semibold truncate">{p.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[p.status || "draft"]}`}>
                      {STATUS_LABELS[p.status || "draft"]}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">{p.price.toLocaleString("ru-RU")} ₽</p>
                  {p.moderation_note && p.status === "blocked" && (
                    <p className="text-red-500 text-[11px] mt-0.5">Причина: {p.moderation_note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-full hover:bg-gray-200"><Icon name="Pencil" size={15} className="text-gray-600" /></button>
                  <button
                    onClick={() => toggleVisibility(p.id, p.status !== "draft")}
                    className="p-2 rounded-full hover:bg-gray-200"
                    title={p.status === "draft" ? "Показать" : "Скрыть"}
                  >
                    <Icon name={p.status === "draft" ? "Eye" : "EyeOff"} size={15} className="text-gray-600" />
                  </button>
                  <button onClick={() => del(p.id)} className="p-2 rounded-full hover:bg-red-50"><Icon name="Trash2" size={15} className="text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopScreen;