import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post, formatLikes } from "./PostFeedTypes";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { useSavedItem } from "@/hooks/useSaved";
import { useFollowing } from "@/hooks/useFollowing";
import { useAuth } from "@/context/AuthContext";
import { useProductsByVideos, trackProductClick } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import ReportButton from "@/components/ReportButton";

const PostCard = ({ post }: { post: Post }) => {
  const { user } = useAuth();
  const { saved, toggle: toggleSaved } = useSavedItem("post", post.id, {
    image: post.image,
    title: post.caption,
    handle: post.handle,
  });
  const { following, toggle: toggleFollow, isSelf } = useFollowing(post.handle);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [copied, setCopied] = useState(false);

  const { liked, count: likes, toggle: handleLike } = useLikes("post", post.id, post.likes);
  // enabled=true — превью последних комментариев грузится сразу, чтобы показать 2 штуки под постом
  const { comments: allComments, count: commentCount, send } = useComments("post", post.id, true, post.comments || 0);
  const previewComments = allComments.slice(0, 2);

  // Товары грузим ТОЛЬКО если у поста реально есть привязанные товары (экономим трафик)
  const productVideoIds = post.hasProducts ? [post.id] : [];
  const productsByVideo = useProductsByVideos(productVideoIds);
  const products = productsByVideo[String(post.id)] || [];
  const { addToCart } = useCart();

  const useTemplate = () => {
    try { sessionStorage.setItem("pending_template_id", post.templateId || ""); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("use-template", { detail: { templateId: post.templateId } }));
  };

  const handleAddToCart = async (productId: number) => {
    setAddingProductId(productId);
    trackProductClick(productId, post.id, user?.id);
    const ok = await addToCart(productId);
    setAddingProductId(null);
    if (ok) toast.success("Добавлено в корзину");
    else toast.error("Войди в аккаунт, чтобы добавить в корзину");
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    send(commentText);
    setCommentText("");
  };

  const goToChat = () => {
    window.dispatchEvent(new CustomEvent("open-direct-message", { detail: { handle: post.handle } }));
  };

  return (
    <div className="bg-black border-b border-white/8 flex flex-col h-full max-h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
              <UserAvatar src={post.avatar} name={post.author || post.handle} alt={post.author} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-[13px]">{post.handle}</span>
              <Icon name="BadgeCheck" size={12} className="text-[#61d4f0]" />
              {isSelf ? null : !following ? (
                <button
                  onClick={toggleFollow}
                  className="ml-1 px-2 py-0.5 rounded-full bg-[#fe2c55] text-white text-[11px] font-semibold leading-none active:scale-95 transition-transform"
                >
                  Подписаться
                </button>
              ) : (
                <button
                  onClick={toggleFollow}
                  className="ml-1 px-2 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold leading-none active:scale-95 transition-transform"
                >
                  Вы подписаны
                </button>
              )}
            </div>
            {post.location && (
              <span className="text-white/40 text-[11px]">{post.location}</span>
            )}
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setShowMenu(true)} title="Ещё действия">
          <Icon name="MoreHorizontal" size={20} className="text-white" />
        </button>
      </div>

      {/* Photo / Video */}
      <div className="w-full flex-1 min-h-0 overflow-hidden bg-black flex items-center justify-center">
        {post.isVideo ? (
          <video src={post.image} className="max-w-full max-h-full w-auto h-auto object-contain" controls playsInline loop />
        ) : (
          <img src={post.image} alt={post.caption} className="max-w-full max-h-full w-auto h-auto object-contain" />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center px-3 pt-2.5 pb-1 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="flex items-center justify-center active:scale-90 transition-transform">
            <Icon
              name="Heart"
              size={26}
              className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "action-icon-glyph transition-all duration-150"}
            />
          </button>
          <button onClick={() => setShowComments(true)} className="flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="MessageDots" size={26} className="action-icon-glyph" />
          </button>
          <button onClick={() => setShowShare(true)} className="flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="ShareForward" size={26} className="action-icon-glyph" />
          </button>
        </div>
        {(post.hasProducts || post.templateId) && (
          <div className="ml-auto flex items-center gap-2">
            {post.hasProducts && (
              <button
                onClick={() => setShowProducts(true)}
                className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1.5 active:scale-95 transition-transform"
              >
                <Icon name="ShoppingBag" size={13} className="text-white" />
                <span className="text-white text-[11px] font-semibold">Товары в кадре</span>
              </button>
            )}
            {post.templateId && (
              <button
                onClick={useTemplate}
                className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1.5 active:scale-95 transition-transform"
              >
                <Icon name="Wand2" size={13} className="text-white" />
                <span className="text-white text-[11px] font-semibold">Использовать шаблон</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Текстовый блок — ограничен по высоте, при длинной подписи прокручивается */}
      <div className="flex-shrink-0 max-h-[22%] overflow-y-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {/* Likes count */}
        <div className="px-3 pb-1">
          <span className="text-white font-semibold text-[13px]">{formatLikes(likes)} отметок «Нравится»</span>
        </div>

        {/* Caption */}
        <div className="px-3 pb-1">
          <span className="text-white font-semibold text-[13px] mr-1.5">{post.handle}</span>
          <span className="text-white text-[13px]">
            {expanded ? post.caption : post.caption.slice(0, 90) + (post.caption.length > 90 ? "…" : "")}
          </span>
          {post.caption.length > 90 && !expanded && (
            <button onClick={() => setExpanded(true)} className="text-white/40 text-[13px] ml-1">ещё</button>
          )}
          {post.caption.length > 90 && expanded && (
            <button onClick={() => setExpanded(false)} className="text-white/40 text-[13px] ml-1">свернуть</button>
          )}
        </div>

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="px-3 pb-1 flex flex-row flex-wrap gap-x-1">
            {post.hashtags.map(tag => (
              <span key={tag} className="text-[#00a2ff] text-[13px]">#{tag}</span>
            ))}
          </div>
        )}

        {/* Превью последних комментариев — чтобы не гадать, обсуждают ли пост */}
        {previewComments.length > 0 && (
          <div className="px-3 pb-1">
            {previewComments.map((c) => (
              <p key={c.id} className="text-[13px] leading-snug">
                <span className="text-white font-semibold mr-1.5">{c.name}</span>
                <span className="text-white/70">{c.text}</span>
              </p>
            ))}
          </div>
        )}

        {/* View comments + переход в чат обсуждения */}
        {commentCount > 0 && (
          <div className="px-3 pb-1 flex items-center gap-3">
            <button onClick={() => setShowComments(true)}>
              <span className="text-white/40 text-[13px]">Посмотреть все комментарии ({commentCount})</span>
            </button>
            <button onClick={goToChat} className="flex items-center gap-1 text-[#61d4f0]">
              <Icon name="MessageCircle" size={12} />
              <span className="text-[13px] font-medium">Перейти в чат</span>
            </button>
          </div>
        )}

        {/* Time */}
        <div className="px-3 pb-3 pt-0.5">
          <span className="text-white/30 text-[11px] uppercase tracking-wide">{post.time}</span>
        </div>
      </div>

      {/* Menu popup */}
      {showMenu && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={() => setShowMenu(false)}>
          <div className="sheet-theme rounded-t-3xl overflow-hidden pb-8 md:rounded-2xl md:pb-0 md:mr-6 md:w-[300px] md:shadow-2xl" onClick={e => e.stopPropagation()}>
            {[
              { icon: "Bookmark", label: saved ? "Убрать из сохранённых" : "Сохранить", action: () => { toggleSaved(); setShowMenu(false); }, active: saved },
              { icon: "User", label: "Перейти в профиль", action: () => { setShowMenu(false); window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: post.handle } })); } },
              { icon: "BellOff", label: "Выключить уведомления", action: () => setShowMenu(false) },
              { icon: "Link", label: "Скопировать ссылку", action: () => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setShowMenu(false); } },
              { icon: "Share2", label: "Поделиться", action: () => { setShowMenu(false); setShowShare(true); } },
              { icon: "Flag", label: "Пожаловаться", action: () => { setShowMenu(false); setShowReport(true); } },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0 active:bg-white/5"
              >
                <Icon
                  name={item.icon}
                  size={20}
                  className={item.icon === "Flag" ? "text-[#fe2c55]" : item.active ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"}
                />
                <span className={`text-sm font-medium ${item.icon === "Flag" ? "text-[#fe2c55]" : "text-white"}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      <ReportButton
        targetType="post"
        targetId={post.id}
        variant="controlled"
        open={showReport}
        onOpenChange={setShowReport}
      />

      {/* Comments popup */}
      {showComments && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:bg-black/40" onPointerDown={() => setShowComments(false)}>
          <div className="sheet-theme rounded-t-3xl flex flex-col max-h-[70%] md:rounded-t-none md:rounded-l-3xl md:max-h-none md:h-full md:w-[400px] md:ml-auto md:shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300" onPointerDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
              <span className="text-white font-bold text-base">{commentCount} комментариев</span>
              <button onPointerDown={() => setShowComments(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
              {allComments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 flex-shrink-0">
                    <UserAvatar name={c.name} />
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-semibold text-sm mr-2">{c.name}</span>
                    <span className="text-white/80 text-sm">{c.text}</span>
                    <div className="text-white/30 text-xs mt-1">{c.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10 pb-8">
              <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
                  onKeyDown={e => e.key === "Enter" && handleSendComment()}
                />
              </div>
              <button onClick={handleSendComment} className="w-9 h-9 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0">
                <Icon name="Send" size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share popup */}
      {showShare && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40" onClick={() => setShowShare(false)}>
          <div className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[360px] md:shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-white font-bold text-base">Поделиться</span>
              <button onClick={() => setShowShare(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: "MessageCircle", label: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`@${post.handle}: ${post.caption}`)}` },
                { icon: "Send", label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(`@${post.handle}: ${post.caption}\n${window.location.href}`)}` },
                { icon: "Share2", label: "VK", color: "#0077FF", href: `https://vk.com/share.php?url=${encodeURIComponent(window.location.href)}` },
                { icon: "MessageSquare", label: "МАКС", color: "#7C66FC", href: `https://max.ru/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`@${post.handle}: ${post.caption}`)}` },
              ].map(opt => (
                <a key={opt.label} href={opt.href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2" onClick={() => setShowShare(false)}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: opt.color + "22", border: `1.5px solid ${opt.color}55` }}>
                    <Icon name={opt.icon} size={24} style={{ color: opt.color }} />
                  </div>
                  <span className="text-white/70 text-xs">{opt.label}</span>
                </a>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setCopied(true); setTimeout(() => { setCopied(false); setShowShare(false); }, 1500); }}
              className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon name={copied ? "Check" : "Link"} size={20} className={copied ? "text-green-400" : "text-white"} />
              </div>
              <span className="text-white text-sm font-medium">{copied ? "Скопировано!" : "Скопировать ссылку"}</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Products popup */}
      {showProducts && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40"
          onClick={() => setShowProducts(false)}
        >
          <div
            className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[380px] md:shadow-2xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-bold text-base flex items-center gap-2">
                <Icon name="ShoppingBag" size={18} />
                Товары из этого поста
              </span>
              <button onClick={() => setShowProducts(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>
            {products.length === 0 ? (
              <p className="text-white/40 text-sm py-6 text-center">Загружаем товары...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                      {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-white font-bold text-sm">{p.price.toLocaleString("ru-RU")} ₽</span>
                        {p.old_price && p.old_price > p.price && (
                          <span className="text-white/40 text-xs line-through">{p.old_price.toLocaleString("ru-RU")} ₽</span>
                        )}
                      </div>
                      {p.promo_code && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#fe2c55]/20 text-[#fe2c55] text-[10px] font-bold">
                          Промокод: {p.promo_code}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(p.id)}
                      disabled={addingProductId === p.id}
                      className="flex-shrink-0 w-9 h-9 rounded-full bg-[#fe2c55] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                      title="В корзину"
                    >
                      {addingProductId === p.id
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Icon name="Plus" size={18} className="text-white" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PostCard;