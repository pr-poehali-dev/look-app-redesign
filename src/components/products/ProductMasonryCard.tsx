import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Product, generateReferralLink } from "@/hooks/useProducts";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  p: Product;
  onAdd: (id: number) => void;
  adding: boolean;
  hideOwner?: boolean;
}

const ProductMasonryCard = ({ p, onAdd, adding, hideOwner }: Props) => {
  const [liked, setLiked] = useState(false);
  const { user } = useAuth();
  const [gettingLink, setGettingLink] = useState(false);

  const openSeller = () => {
    if (p.owner_handle && !p.is_partner) {
      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: p.owner_handle } }));
    }
  };

  const handleLike = () => {
    setLiked(true);
    onAdd(p.id);
  };

  const shareReferral = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) { toast.error("Войди в аккаунт, чтобы получить партнёрскую ссылку"); return; }
    setGettingLink(true);
    const code = await generateReferralLink(p.id, user.id);
    setGettingLink(false);
    if (!code) { toast.error("Не удалось создать ссылку"); return; }
    const url = `${window.location.origin}/?product=${p.id}&ref=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Партнёрская ссылка скопирована!");
    } catch {
      toast.success(url);
    }
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

        {!hideOwner && p.owner_handle && !p.is_partner ? (
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

        <button
          onClick={shareReferral}
          disabled={gettingLink}
          className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-gray-100 mt-0.5 text-gray-500 active:text-black transition-colors disabled:opacity-50"
        >
          {gettingLink ? (
            <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="Link" size={12} />
          )}
          <span className="text-[11px] font-medium">Партнёрская ссылка</span>
        </button>
      </div>
    </div>
  );
};

export default ProductMasonryCard;