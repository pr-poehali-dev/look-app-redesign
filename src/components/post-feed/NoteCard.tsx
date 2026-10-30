import { useState } from "react";
import StickyImage from "./StickyImage";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post, formatLikes } from "./PostFeedTypes";
import { useLikes } from "@/hooks/useLikes";
import { useFollowingList } from "@/hooks/useFollowing";

const ASPECTS = [3 / 4, 1, 4 / 5, 5 / 6, 4 / 3, 2 / 3];

function hashId(id: number | string): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const NoteCard = ({ post, onOpen, priority = false }: { post: Post; onOpen: () => void; priority?: boolean }) => {
  const aspect = ASPECTS[hashId(post.id) % ASPECTS.length];
  const { count: likeCount } = useLikes(post.article ? "article" : "post", post.article ? post.article.id : post.id, post.likes);
  const following = useFollowingList();
  const isFollowed = !!post.handle && following.some((h) => h.toLowerCase() === post.handle.toLowerCase());

  return (
    <div className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/5 border border-white/10 anim-card-in" style={{ breakInside: "avoid" }}>
      <button
        onClick={onOpen}
        className="block w-full text-left active:opacity-90 transition-opacity"
      >
        <div className="relative w-full bg-white/10" style={post.isText ? undefined : { aspectRatio: aspect }}>
          {post.isText ? (
            <div className="w-full px-3 py-4 bg-gradient-to-br from-[#2a1f3d] to-[#1a2a3a]">
              <p className="text-white text-[14px] leading-snug line-clamp-8 whitespace-pre-wrap break-words">{post.caption}</p>
            </div>
          ) : post.isVideo ? (
            post.thumbnail ? (
              <StickyImage fill eager={priority} src={post.thumbnail} alt={post.caption} className="w-full h-full object-cover" />
            ) : (
              <video src={post.image.includes("#") ? post.image : `${post.image}#t=0.001`} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
            )
          ) : (
            <StickyImage fill eager={priority} src={post.thumbnail || post.image} alt={post.caption} className="w-full h-full object-cover" />
          )}
          {post.article && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full pl-1.5 pr-2 py-1">
              <Icon name="ListChecks" size={11} className="text-white" />
              <span className="text-white text-[10px] font-semibold">Туториал · {post.article.steps_count || 0} шагов</span>
            </div>
          )}
          {post.isVideo && (
            <div className="absolute top-2 right-2 bg-black/40 rounded-full p-1.5">
              <Icon name="Play" size={12} className="text-white" />
            </div>
          )}
        </div>
        <div className={post.isText ? "px-2.5 pb-2.5 pt-1" : "p-2.5"}>
          {!post.isText && <p className={`text-white leading-snug line-clamp-2 mb-2 ${post.cardTitle ? "text-[14px] font-bold" : "text-[13px]"}`}>{post.cardTitle || post.caption}</p>}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={post.avatar} name={post.author || post.handle} alt={post.author} />
              </div>
              <span className="text-white/60 text-[11px] truncate">{post.handle}</span>
              {isFollowed && (
                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-[9px] font-semibold">
                  <Icon name="Check" size={8} />Вы подписаны
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Icon name="Bookmark" size={13} className="text-[#FF5A3C]" />
                <span className="text-[11px] text-white/70 font-semibold">{formatLikes(post.saves || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Icon name="Heart" size={13} className="text-white/50" />
                <span className="text-[11px] text-white/50">{formatLikes(likeCount)}</span>
              </div>
            </div>
          </div>
        </div>
      </button>

    </div>
  );
};

export default NoteCard;