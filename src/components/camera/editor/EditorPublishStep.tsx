import { useWeeklyTags } from "@/hooks/useWeeklyTags";
import ComplianceFields, { PublishCompliance } from "@/components/camera/ComplianceFields";
import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Clip } from "./editorTypes";
import { uploadProductImage, useMyProducts, usePartnerCatalog, type Product } from "@/hooks/useProducts";

export interface PendingProduct {
  title: string;
  price: number;
  oldPrice?: number;
  promoCode?: string;
  productUrl?: string;
  image?: string;
  sourceProductId?: number;
  isPartner?: boolean;
}

const VIDEO_CATEGORIES = [
  { id: "lifehacks", label: "Советы по образу жизни" },
  { id: "traveldiary", label: "Дневник путешествий" },
  { id: "review", label: "Обзоры" },
  { id: "tutorial", label: "Туториалы" },
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "fashion", label: "Мода" },
  { id: "makeup", label: "Макияж" },
  { id: "movies", label: "Кино и ТВ" },
  { id: "kpop", label: "KPOP" },
  { id: "career", label: "Карьера" },
  { id: "home", label: "Дом" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
  { id: "nature", label: "Природа" },
  { id: "animals", label: "Животные" },
  { id: "beauty", label: "Красота" },
  { id: "diy", label: "Сделай сам" },
  { id: "science", label: "Наука" },
  { id: "auto", label: "Авто" },
  { id: "singdance", label: "Пение и танцы" },
  { id: "anime", label: "Аниме и комиксы" },
  { id: "relations", label: "Отношения" },
  { id: "show", label: "Шоу" },
  { id: "lipsync", label: "Липсинк" },
  { id: "everyday", label: "Повседневность" },
  { id: "society", label: "Общество" },
  { id: "family", label: "Семья" },
  { id: "drama", label: "Драма" },
  { id: "fitness", label: "Фитнес и здоровье" },
  { id: "education", label: "Образование" },
  { id: "tech", label: "Технологии" },
  { id: "services", label: "Услуги и сервисы" },
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
  userId?: string;
  isAd: boolean;
  setIsAd: (v: boolean) => void;
  clipsCount?: number;
  compliance: PublishCompliance;
  onComplianceChange: (v: PublishCompliance) => void;
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
  userId,
  isAd,
  setIsAd,
  clipsCount = 1,
  compliance,
  onComplianceChange,
}: Props) => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addTab, setAddTab] = useState<"mine" | "partner" | "new">("mine");
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newOldPrice, setNewOldPrice] = useState("");
  const [newPromo, setNewPromo] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newImage, setNewImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { products: myProducts } = useMyProducts(userId);
  const weeklyTags = useWeeklyTags();

  const resetForm = () => {
    setNewTitle(""); setNewPrice(""); setNewOldPrice(""); setNewPromo(""); setNewUrl(""); setNewImage("");
    setShowAddProduct(false);
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setUploadingImage(true);
    const url = await uploadProductImage(file, userId);
    setUploadingImage(false);
    if (url) setNewImage(url);
  };

  const addProduct = () => {
    if (!newTitle.trim() || !newPrice) return;
    setProducts([...products, {
      title: newTitle.trim(),
      price: Number(newPrice) || 0,
      oldPrice: newOldPrice ? Number(newOldPrice) : undefined,
      promoCode: newPromo.trim() || undefined,
      productUrl: newUrl.trim() || undefined,
      image: newImage || undefined,
    }]);
    resetForm();
  };

  const pickExistingProduct = (p: Product) => {
    setProducts([...products, {
      title: p.title,
      price: p.price,
      oldPrice: p.old_price || undefined,
      promoCode: p.promo_code || undefined,
      productUrl: p.product_url || undefined,
      image: p.image || undefined,
      sourceProductId: p.id,
      isPartner: !!p.is_partner,
    }]);
    setShowAddProduct(false);
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
            ? <img loading="lazy" decoding="async" src={active.url} alt="" className="w-full h-full object-cover" style={{ filter: cssFilter, transform }} />
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
                className={`py-3 rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${destination === d.id ? "bg-[#FF5A3C] text-white" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                <Icon name={d.icon} size={18} />
                <span className="text-xs font-semibold">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
            <p className="text-white/60 text-xs font-semibold uppercase mb-2">{destination === "feed" ? "Тема для Ленты" : "Категория для Главной"}</p>
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
          {weeklyTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {weeklyTags.slice(0, 6).filter((t) => !hashtags.toLowerCase().includes("#" + t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHashtags(`${hashtags.trim()} #${t}`.trim())}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs"
                >
                  <span className="text-white/30">↑</span> #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        <ComplianceFields isAd={isAd} setIsAd={setIsAd} value={compliance} onChange={onComplianceChange} isImage={!!active && active.type === "image" && clipsCount <= 1} />

        {publishing && publishProgress ? (
          <div className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FF5A3C] to-[#8b5cf6]">
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
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5A3C] to-[#8b5cf6] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-white font-bold disabled:opacity-50"
          >
            {publishing ? "Публикуем..." : "Опубликовать"}
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorPublishStep;