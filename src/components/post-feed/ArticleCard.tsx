import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Article } from "@/hooks/useArticles";
import { useLikes } from "@/hooks/useLikes";
import { useComments } from "@/hooks/useComments";
import { useSavedItem } from "@/hooks/useSaved";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ArticleShareSheet from "@/components/profile/ArticleShareSheet";

const ArticleCard = ({ a, onOpen }: { a: Article; onOpen: () => void }) => {
  const { user } = useAuth();
  const needAuth = () => toast("Зарегистрируйтесь, чтобы ставить лайки и сохранять");
  const likes = useLikes("article", a.id);
  const { count: commentCount } = useComments("article", a.id, false);
  const payload = useMemo(() => ({ image: a.cover_image || "", title: a.title, handle: a.author_handle || undefined }), [a]);
  const save = useSavedItem("article", a.id, payload);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
      <button onClick={onOpen} className="text-left w-full">
        {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-44 object-cover" loading="lazy" />}
        <div className="p-3 flex flex-col gap-1">
          <p className="text-white font-bold text-base leading-snug line-clamp-2">{a.title}</p>
          <p className="text-white/60 text-sm line-clamp-2">{a.body}</p>
          <p className="text-white/40 text-[11px] pt-1">{a.author_name} · {a.read_minutes} мин · {a.views} просм.</p>
        </div>
      </button>
      <div className="flex items-center gap-5 px-3 pb-3 pt-1">
        <button onClick={user ? likes.toggle : needAuth} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <Icon name="Heart" size={22} className={likes.liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          <span className="text-white text-xs font-semibold">{likes.count}</span>
        </button>
        <button onClick={onOpen} className="flex items-center gap-1.5 active:scale-90 transition-transform">
          <Icon name="MessageCircle" size={22} className="text-white" />
          <span className="text-white text-xs font-semibold">{commentCount}</span>
        </button>
        <div className="ml-auto flex items-center gap-5">
          <button onClick={() => setShowShare(true)} className="active:scale-90 transition-transform">
            <Icon name="ShareForward" size={22} className="text-white" />
          </button>
          <button onClick={user ? save.toggle : needAuth} className="active:scale-90 transition-transform">
            <Icon name="Bookmark" size={22} className={save.saved ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          </button>
        </div>
      </div>
      {showShare && <ArticleShareSheet articleId={a.id} title={a.title} authorName={a.author_name} onClose={() => setShowShare(false)} />}
    </div>
  );
};

export default ArticleCard;
