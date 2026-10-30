import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { promptAuth } from "@/lib/promptAuth";
import { CHALLENGES_URL, useChallenge, useMyBadges, daysLeft, daysWord } from "@/hooks/useChallenge";
import { topicTitle } from "@/lib/topics";
import { GET_PHOTOS_URL } from "@/components/post-feed/PostFeedTypes";
import { mapPost } from "@/components/post-feed/mapPost";
import NoteViewer from "@/components/post-feed/NoteViewer";
import type { Post } from "@/components/post-feed/PostFeedTypes";

interface BestItem {
  id: number;
  url: string;
  thumbnail: string | null;
  type: string;
  title: string;
  handle: string;
  likes: number;
}

const ChallengeScreen = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { challenge, loading, join } = useChallenge();
  const badges = useMyBadges();
  const [best, setBest] = useState<BestItem[]>([]);
  const [opened, setOpened] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!challenge) return;
    fetch(`${CHALLENGES_URL}?action=best&id=${challenge.id}`)
      .then((r) => r.json())
      .then((raw) => {
        const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setBest(d.items || []);
      })
      .catch(() => {});
  }, [challenge?.id]);

  const participate = async () => {
    if (!user) { promptAuth(); return; }
    if (!challenge) return;
    setBusy(true);
    await join();
    setBusy(false);
    try {
      sessionStorage.setItem("pending_challenge_id", String(challenge.id));
      sessionStorage.setItem("pending_challenge_topic", challenge.topic || "");
    } catch { /* ignore */ }
    onBack();
    window.dispatchEvent(new CustomEvent("open-camera"));
  };

  const openBest = async (item: BestItem) => {
    const raw = await fetch(`${GET_PHOTOS_URL}?id=${item.id}`).then((r) => r.json()).catch(() => null);
    const d = raw && (typeof raw.body === "string" ? JSON.parse(raw.body) : raw);
    if (d?.video) setOpened(mapPost(d.video, d.video.type === "video", user));
  };

  const left = challenge ? daysLeft(challenge.ends_at) : 0;

  return (
    <div className="h-full bg-black overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={onBack} className="p-1" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <h2 className="text-white font-bold text-xl">Челлендж недели</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#FF5A3C] border-t-transparent rounded-full animate-spin" /></div>
      ) : !challenge ? (
        <div className="flex flex-col items-center py-20 gap-3 px-8 text-center">
          <Icon name="Trophy" size={48} className="text-white/20" />
          <p className="text-white/50 text-sm">Сейчас нет активного челленджа. Новый появится на следующей неделе.</p>
        </div>
      ) : (
        <div className="px-4 pb-28 flex flex-col gap-4">
          <div className="rounded-3xl p-5 bg-gradient-to-br from-[#FF5A3C] to-[#8b5cf6]">
            <p className="text-white/80 text-xs font-semibold uppercase mb-1">До конца: {left} {daysWord(left)}{challenge.topic ? ` · ${topicTitle(challenge.topic)}` : ""}</p>
            <h3 className="text-white font-bold text-2xl leading-tight mb-2">{challenge.title}</h3>
            <p className="text-white/90 text-sm leading-snug">{challenge.description}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4">
            <p className="text-white font-semibold text-sm mb-1 flex items-center gap-2"><Icon name="ListChecks" size={16} />Критерии</p>
            <p className="text-white/70 text-sm leading-snug">{challenge.criteria}</p>
            <p className="text-white/50 text-xs mt-3 flex items-center gap-1.5"><Icon name="Award" size={14} />Награда: бейдж «{challenge.badge_title}» · участников: {challenge.participants}</p>
          </div>

          <button
            onClick={participate}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-[#FF5A3C] text-white font-bold text-base disabled:opacity-60"
          >
            {challenge.joined ? "Добавить свой ответ" : "Участвовать"}
          </button>

          {badges.length > 0 && (
            <div>
              <p className="text-white font-bold text-base mb-2">Ваши бейджи</p>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span key={b.challenge_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold">
                    <Icon name="Award" size={13} />{b.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-white font-bold text-base mb-2">Лучшие ответы недели</p>
            {best.length === 0 ? (
              <p className="text-white/40 text-sm">Ответов пока нет. Станьте первым.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {best.map((b, i) => (
                  <button key={b.id} onClick={() => openBest(b)} className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                    <img src={b.thumbnail || b.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-white text-[10px] font-semibold truncate text-left">@{b.handle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {opened && <NoteViewer post={opened} onClose={() => setOpened(null)} />}
    </div>
  );
};

export default ChallengeScreen;
