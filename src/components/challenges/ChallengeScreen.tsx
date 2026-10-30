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
  mine?: boolean;
}

const GOAL = 5;

const ChallengeScreen = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { challenge, loading, join } = useChallenge();
  const badges = useMyBadges();
  const [best, setBest] = useState<BestItem[]>([]);
  const [mine, setMine] = useState<BestItem[]>([]);
  const [opened, setOpened] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!challenge) return;
    fetch(`${CHALLENGES_URL}?action=best&id=${challenge.id}`, { headers: user?.id ? { "X-User-Id": user.id } : {} })
      .then((r) => r.json())
      .then((raw) => {
        const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setBest(d.items || []);
        setMine(d.mine || []);
      })
      .catch(() => {});
  }, [challenge?.id, user?.id]);

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
  const finished = !!challenge?.finished;
  const myPosts = challenge?.my_posts ?? 0;
  const total = Math.max(1, left + 0);
  const spent = challenge?.starts_at && challenge?.ends_at
    ? Math.min(1, Math.max(0, (Date.now() - new Date(challenge.starts_at + "Z").getTime()) / (new Date(challenge.ends_at + "Z").getTime() - new Date(challenge.starts_at + "Z").getTime())))
    : (7 - Math.min(left, 7)) / 7;
  const progress = finished ? 100 : Math.max(6, Math.round(spent * 100));
  const conditions = (challenge?.criteria || "").split(/[\n;•]+/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
  const list = [...mine.map((m) => ({ ...m, mine: true })), ...best.filter((b) => !mine.some((m) => m.id === b.id))];
  void total;

  return (
    <div className="h-full bg-black overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={onBack} className="p-1" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <h2 className="text-white font-semibold text-[15px]">Челлендж недели</h2>
      </div>

      {loading ? (
        <div className="px-4 flex flex-col gap-3">
          <div className="skeleton-box h-36" />
          <div className="skeleton-box h-24" />
        </div>
      ) : !challenge ? (
        <div className="flex flex-col items-center py-20 gap-3 px-8 text-center">
          <Icon name="Trophy" size={48} className="text-white/20" />
          <p className="text-white/50 text-sm">Сейчас нет активного челленджа. Новый появится на следующей неделе.</p>
        </div>
      ) : (
        <div className="px-4 pb-28 flex flex-col gap-4">
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold text-[15px] leading-snug line-clamp-2 mb-3">{challenge.title}</h3>
            <div className="h-2 rounded-full bg-[#FFE9E3]/20 overflow-hidden">
              <div className="h-full rounded-full bg-[#FF5A3C] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-white/60 text-[11px] mt-2">
              {finished
                ? `Челлендж завершён · ${challenge.works ?? 0} ${(challenge.works ?? 0) % 10 === 1 && (challenge.works ?? 0) % 100 !== 11 ? "работа" : "работ"}`
                : `Осталось ${left} ${daysWord(left)} · ${challenge.participants} участников${challenge.topic ? ` · ${topicTitle(challenge.topic)}` : ""}`}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {(conditions.length ? conditions : [challenge.description]).map((c, i) => (
              <p key={i} className="flex gap-2.5 text-white/80 text-xs leading-snug">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A3C] mt-1 flex-shrink-0" />{c}
              </p>
            ))}
            <p className="text-white/50 text-xs flex items-center gap-1.5 mt-1"><Icon name="Award" size={13} />Награда: бейдж «{challenge.badge_title}»</p>
          </div>

          {finished ? (
            <div className="rounded-[20px] bg-[#FFE9E3]/10 border border-[#FF5A3C]/30 p-4 text-center">
              <p className="text-white font-semibold text-sm">Приём работ закрыт</p>
              <p className="text-white/60 text-xs mt-1">Смотрите лучшие ответы ниже. Новый челлендж появится скоро.</p>
            </div>
          ) : challenge.joined && myPosts > 0 ? (
            <button
              onClick={participate}
              disabled={busy}
              className="w-full h-11 rounded-full bg-[#FFE9E3] text-[#FF5A3C] font-semibold text-[15px] flex items-center justify-center gap-2"
            >
              <Icon name="Check" size={16} />Твоя доска: {Math.min(myPosts, GOAL)} из {GOAL} фото
            </button>
          ) : (
            <button
              onClick={participate}
              disabled={busy}
              className="w-full h-11 rounded-full bg-[#FF5A3C] text-white font-semibold text-[15px] disabled:opacity-60"
            >
              {challenge.joined ? "Добавить свой ответ" : "Участвовать"}
            </button>
          )}

          {badges.length > 0 && (
            <div>
              <p className="text-white font-semibold text-[15px] mb-2">Ваши бейджи</p>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span key={b.challenge_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-xs font-semibold">
                    <Icon name="Award" size={13} />{b.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-white font-semibold text-[15px] mb-2">Лучшие ответы недели</p>
            {list.length === 0 ? (
              <p className="text-white/40 text-sm">Ответов пока нет. Станьте первым.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {list.map((b, i) => (
                  <button key={b.id} onClick={() => openBest(b)} className="relative w-24 flex-shrink-0 text-left">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white/10">
                      <img src={b.thumbnail || b.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      {b.mine ? (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-[9px] font-bold">Твоя работа</span>
                      ) : (
                        <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#FF5A3C] text-white text-[10px] font-bold flex items-center justify-center">{i + 1 - mine.length}</span>
                      )}
                    </div>
                    <p className="text-white/70 text-[11px] mt-1 truncate">@{b.handle}</p>
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
