import { useState } from "react";
import Icon from "@/components/ui/icon";
import NoteCard from "./NoteCard";
import NoteViewer from "./NoteViewer";
import { Post } from "./PostFeedTypes";

const MasonryFeed = ({ posts, loading, topPad = 0 }: { posts: Post[]; loading: boolean; topPad?: number }) => {
  const [opened, setOpened] = useState<Post | null>(null);
  const left: Post[] = [];
  const right: Post[] = [];
  posts.forEach((p, i) => (i % 2 === 0 ? left : right).push(p));

  return (
    <div className="h-full overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {topPad > 0 && <div style={{ height: topPad }} aria-hidden />}
      <div className="px-2 md:px-4 pt-2 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Icon name="ImageOff" size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">Здесь пока ничего нет</p>
          </div>
        ) : (
          <>
            {/* Мобильная — как было, 2 колонки на всю ширину экрана */}
            <div className="flex gap-2 items-start md:hidden">
              <div className="flex-1 min-w-0">
                {left.map((p) => <NoteCard key={p.id} post={p} onOpen={() => setOpened(p)} />)}
              </div>
              <div className="flex-1 min-w-0">
                {right.map((p) => <NoteCard key={p.id} post={p} onOpen={() => setOpened(p)} />)}
              </div>
            </div>

            {/* ПК — мозаика на всю ширину монитора, колонок больше на широких экранах */}
            <div className="hidden md:block md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-3">
              {posts.map((p) => (
                <div key={p.id} style={{ breakInside: "avoid" }}>
                  <NoteCard post={p} onOpen={() => setOpened(p)} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {opened && <NoteViewer post={opened} onClose={() => setOpened(null)} />}
    </div>
  );
};

export default MasonryFeed;