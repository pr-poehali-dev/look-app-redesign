import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post, formatLikes } from "./PostFeedTypes";

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

const NoteCard = ({ post, onOpen }: { post: Post; onOpen: () => void }) => {
  const aspect = ASPECTS[hashId(post.id) % ASPECTS.length];
  const hasLikes = post.likes > 0;

  return (
    <button
      onClick={onOpen}
      className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/5 block text-left active:opacity-90 transition-opacity"
      style={{ breakInside: "avoid" }}
    >
      <div className="relative w-full bg-white/10" style={{ aspectRatio: aspect }}>
        <img src={post.image} alt={post.caption} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="p-2.5">
        <p className="text-white text-[13px] leading-snug line-clamp-2 mb-2">{post.caption}</p>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
              <UserAvatar src={post.avatar} name={post.author || post.handle} alt={post.author} />
            </div>
            <span className="text-white/60 text-[11px] truncate">{post.handle}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Icon name="Heart" size={13} className={hasLikes ? "text-[#fe2c55]" : "text-white/50"} />
            <span className={`text-[11px] ${hasLikes ? "text-[#fe2c55] font-medium" : "text-white/50"}`}>{formatLikes(post.likes)}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default NoteCard;