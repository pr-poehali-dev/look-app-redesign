import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Clip } from "./editorTypes";

export interface PendingProduct {
  title: string;
  price: number;
  oldPrice?: number;
  promoCode?: string;
  productUrl?: string;
}

const VIDEO_CATEGORIES = [
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
];

interface Props {
  active: Clip | undefined;
  cssFilter: string;
  transform: string;
  destination: "home" | "feed" | "both";
  setDestination: (v: "home" | "feed" | "both") => void;
  category: string;
  setCategory: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  hashtags: string;
  setHashtags: (v: string) => void;
  publishing: boolean;
  publishProgress: { stage: "compress" | "upload" | "save"; percent: number } | null;
  onBack: () => void;
  onPublish: () => void;
  products: PendingProduct[];
  setProducts: (p: PendingProduct[]) => void;
}

const EditorPublishStep = ({
  active,
  cssFilter,
  transform,
  destination,
  setDestination,
  category,
  setCategory,
  description,
  setDescription,
  hashtags,
  setHashtags,
  publishing,
  publishProgress,
  onBack,
  onPublish,
  products,
  setProducts,
}: Props) => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newOldPrice, setNewOldPrice] = useState("");
  const [newPromo, setNewPromo] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const resetForm = () => {
    setNewTitle(""); setNewPrice(""); setNewOldPrice(""); setNewPromo(""); setNewUrl("");
    setShowAddProduct(false);
  };

  const addProduct = () => {
    if (!newTitle.trim() || !newPrice) return;
    setProducts([...products, {
      title: newTitle.trim(),
      price: Number(newPrice) || 0,
      oldPrice: newOldPrice ? Number(newOldPrice) : undefined,
      promoCode: newPromo.trim() || undefined,
      productUrl: newUrl.trim() || undefined,
    }]);
    resetForm();
  };

  const removeProduct = (idx: number) => {
    setProducts(products.filter((_, i) => i !== idx));
  };
  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-white/10 sticky top-0 bg-zinc-950 z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" title="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <p className="text-white font-bold">Публикация</p>
        <div className="w-9" />
      </div>

      <div className="p-4 space-y-4">
        {/* Preview */}
        <div className="mx-auto w-40 aspect-[9/16] bg-black rounded-xl overflow-hidden flex items-center justify-center">
          {active && (active.type === "image"
            ? <img src={active.url} alt="" className="w-full h-full object-cover" style={{ filter: cssFilter, transform }} />
            : <video src={active.url} className="w-full h-full object-cover" style={{ filter: cssFilter, transform }} muted autoPlay loop />)}
        </div>

        {/* Destination */}
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Куда публиковать</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "both", icon: "Sparkles", label: "Везде" },
              { id: "home", icon: "Home", label: "Главная" },
              { id: "feed", icon: "LayoutList", label: "Лента" },
            ] as const).map((d) => (
              <button
                key={d.id}
                onClick={() => setDestination(d.id)}
                className={`py-3 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${destination === d.id ? "bg-[#fe2c55] text-white" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                <Icon name={d.icon} size={18} />
                <span className="text-xs font-semibold">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        {destination !== "feed" && (
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase mb-2">Категория для Главной</p>
            <div className="flex flex-wrap gap-2">
              {VIDEO_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${category === c.id ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
                >{c.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Описание</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Расскажи о своём ролике..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
          />
        </div>

        {/* Hashtags */}
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase mb-2">Хэштеги</p>
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#вайб #москва"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
          />
        </div>

        {/* Товары в кадре */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/60 text-xs font-semibold uppercase flex items-center gap-1.5">
              <Icon name="ShoppingBag" size={13} /> Товары в кадре
            </p>
            {!showAddProduct && (
              <button onClick={() => setShowAddProduct(true)} className="text-[#fe2c55] text-xs font-semibold flex items-center gap-1">
                <Icon name="Plus" size={13} /> Добавить
              </button>
            )}
          </div>

          {products.length > 0 && (
            <div className="flex flex-col gap-2 mb-2">
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.title}</p>
                    <p className="text-white/50 text-xs">{p.price.toLocaleString("ru-RU")} ₽{p.promoCode ? ` · промо ${p.promoCode}` : ""}</p>
                  </div>
                  <button onClick={() => removeProduct(i)} className="text-red-400 flex-shrink-0"><Icon name="Trash2" size={16} /></button>
                </div>
              ))}
            </div>
          )}

          {showAddProduct ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название товара"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
              />
              <div className="flex gap-2">
                <input
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="Цена ₽"
                  inputMode="decimal"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
                />
                <input
                  value={newOldPrice}
                  onChange={(e) => setNewOldPrice(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="Старая цена (если скидка)"
                  inputMode="decimal"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
                />
              </div>
              <input
                value={newPromo}
                onChange={(e) => setNewPromo(e.target.value)}
                placeholder="Промокод (необязательно)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Ссылка на товар (необязательно)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
              />
              <div className="flex gap-2 pt-1">
                <button onClick={resetForm} className="flex-1 py-2 rounded-lg bg-white/10 text-white/70 text-sm font-semibold">Отмена</button>
                <button onClick={addProduct} disabled={!newTitle.trim() || !newPrice} className="flex-1 py-2 rounded-lg bg-[#fe2c55] text-white text-sm font-semibold disabled:opacity-40">Добавить</button>
              </div>
            </div>
          ) : products.length === 0 && (
            <p className="text-white/30 text-xs">Добавь товары — под видео появится значок «Товары в кадре», зрители смогут купить прямо из ленты.</p>
          )}
        </div>

        {publishing && publishProgress ? (
          <div className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6]">
            <div className="flex items-center gap-2 text-white mb-2">
              <Icon name="Loader" size={18} className="animate-spin" />
              <span className="font-semibold text-sm">
                {publishProgress.stage === "compress" && "Сжимаем видео..."}
                {publishProgress.stage === "upload" && "Загружаем..."}
                {publishProgress.stage === "save" && "Сохраняем..."}
              </span>
              <span className="ml-auto font-bold text-sm">{publishProgress.percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white transition-all" style={{ width: `${publishProgress.percent}%` }} />
            </div>
          </div>
        ) : (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-white font-bold disabled:opacity-50"
          >
            {publishing ? "Публикуем..." : "Опубликовать"}
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorPublishStep;