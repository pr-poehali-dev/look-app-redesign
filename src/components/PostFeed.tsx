import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import StoryViewer from "./post-feed/StoryViewer";
import PostCard from "./post-feed/PostCard";
import { Post, Story, MOCK_POSTS, GET_PHOTOS_URL, formatTime } from "./post-feed/PostFeedTypes";

const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addMedia } = useUserMedia();
  const myStoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${GET_PHOTOS_URL}?type=image`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbPosts: Post[] = (data.videos || []).map((v: any) => {
          const desc: string = v.description || "";
          const hashtagsField: string = v.hashtags || "";
          const tags = hashtagsField
            ? (hashtagsField.match(/#\S+/g) || hashtagsField.split(/[\s,]+/).filter(Boolean).map((t: string) => t.replace(/^#/, ""))).map((t: string) => t.replace(/^#/, ""))
            : (desc.match(/#\S+/g) || []).map((t: string) => t.slice(1));
          const caption = desc || "Фото";
          return {
            id: v.id,
            author: (v.author === "Я" || !v.author) ? (user?.name || "Пользователь") : v.author,
            handle: (v.handle === "user" || !v.handle) ? (user?.handle || user?.name || "user") : v.handle,
            avatar: user?.avatar || `https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg`,
            image: v.url,
            caption,
            hashtags: tags,
            likes: parseInt(v.likes) || 0,
            comments: parseInt(v.comments) || 0,
            time: formatTime(v.created_at),
          };
        });
        setPosts([...dbPosts, ...MOCK_POSTS]);
      })
      .catch(() => setPosts(MOCK_POSTS))
      .finally(() => setLoading(false));
  }, [user]);

  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  const storySource = posts.length > 0 ? posts : MOCK_POSTS;
  const storyUsers = storySource.slice(0, 6);
  const stories: Story[] = storyUsers.map(p => ({ id: p.id, handle: p.handle, avatar: p.avatar, image: p.image }));

  return (
    <div className="h-full overflow-y-scroll bg-black" style={{ scrollbarWidth: "none" }}>
      {/* Story viewer */}
      {storyIndex !== null && (
        <StoryViewer stories={stories} startIndex={storyIndex} onClose={() => setStoryIndex(null)} />
      )}

      {/* Stories row */}
      <div className="flex gap-4 px-3 py-3 overflow-x-scroll border-b border-white/8" style={{ scrollbarWidth: "none" }}>
        {/* "Your story" first */}
        <input
          ref={myStoryInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addMedia(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => myStoryInputRef.current?.click()}
          className="flex flex-col items-center gap-1 flex-shrink-0"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-[62px] h-[62px] rounded-full border-2 border-white/20 flex items-center justify-center relative overflow-hidden">
            {user?.avatar
              ? <img src={user.avatar} className="w-full h-full object-cover opacity-70" />
              : <div className="w-full h-full bg-white/10" />
            }
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-black">
              <Icon name="Plus" size={11} className="text-white" />
            </div>
          </div>
          <span className="text-white/80 text-[10px] w-16 text-center truncate">Ваша история</span>
        </button>
        {storyUsers.map((post, i) => (
          <button key={post.id} onClick={() => setStoryIndex(i)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-[62px] h-[62px] rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img src={post.avatar} alt={post.handle} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-white/80 text-[10px] w-16 text-center truncate">{post.handle}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      )}

      <div className="pb-24" />
    </div>
  );
};

export default PostFeed;
