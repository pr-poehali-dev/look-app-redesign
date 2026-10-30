import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { BOARDS_API_URL, Board, boardsPost } from "@/hooks/useBoards";
import { CHALLENGES_URL, Challenge, daysLeft, daysWord } from "@/hooks/useChallenge";
import BoardCollage from "@/components/post-feed/BoardCollage";
import BoardDetailScreen from "@/components/profile/BoardDetailScreen";
import { toast } from "sonner";

interface FeedItem { id: number; url: string; thumbnail: string | null; title: string; handle: string }

const parse = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

interface Props {
  communityId: string;
  name: string;
  isMember: boolean;
  isAdmin: boolean;
  onClose: () => void;
}

const CircleHub = ({ communityId, name, isMember, isAdmin, onClose }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"feed" | "boards" | "challenge">("feed");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [boardId, setBoardId] = useState<number | null>(null);
  const [newBoard, setNewBoard] = useState("");
  const [chTitle, setChTitle] = useState("");
  const [chDesc, setChDesc] = useState("");

  const loadBoards = () =>
    fetch(`${BOARDS_API_URL}?action=circle_boards&community_id=${encodeURIComponent(communityId)}`).then(parse).then((d) => setBoards(d.boards || [])).catch(() => {});
  const loadChallenge = () =>
    fetch(`${CHALLENGES_URL}?action=circle&community_id=${encodeURIComponent(communityId)}`, { headers: user?.id ? { "X-User-Id": user.id } : {} })
      .then(parse).then((d) => setChallenge(d.challenge || null)).catch(() => {});

  useEffect(() => {
    fetch(`${BOARDS_API_URL}?action=circle_feed&community_id=${encodeURIComponent(communityId)}`).then(parse).then((d) => setFeed(d.items || [])).catch(() => {});
    loadBoards();
    loadChallenge();
  }, [communityId, user?.id]);

  const createBoard = async () => {
    if (!user || !newBoard.trim()) return;
    const { ok } = await boardsPost("create", user.id, { title: newBoard, community_id: communityId, is_public: true }).catch(() => ({ ok: false }));
    if (ok) { setNewBoard(""); loadBoards(); toast.success("Доска кружка создана"); }
    else toast.error("Доски кружка создают участники");
  };

  const createChallenge = async () => {
    if (!user || !chTitle.trim()) return;
    const { ok } = await boardsPostChallenge(user.id, { community_id: communityId, title: chTitle, description: chDesc, criteria: "Свой пост по теме челленджа" });
    if (ok) { setChTitle(""); setChDesc(""); loadChallenge(); toast.success("Челлендж запущен на 7 дней"); }
    else toast.error("Не удалось запустить челлендж");
  };

  const joinChallenge = async () => {
    if (!user || !challenge) return;
    await fetch(`${CHALLENGES_URL}?action=join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ challenge_id: challenge.id }),
    }).catch(() => null);
    try {
      sessionStorage.setItem("pending_challenge_id", String(challenge.id));
    } catch { /* ignore */ }
    onClose();
    window.dispatchEvent(new CustomEvent("open-camera"));
  };

  if (boardId !== null) return (
    <div className="fixed inset-0 z-[10001] bg-white"><BoardDetailScreen boardId={boardId} onBack={() => setBoardId(null)} /></div>
  );

  const left = challenge ? daysLeft(challenge.ends_at) : 0;

  return (
    <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
      <div className="flex items-center gap-3 px-4 pt-14 pb-3">
        <button onClick={onClose} className="p-1" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <h2 className="flex-1 text-white font-bold text-xl truncate">{name}</h2>
      </div>
      <div className="flex gap-2 px-4 pb-3">
        {([["feed", "Лента"], ["boards", "Доски"], ["challenge", "Челлендж"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${tab === id ? "bg-white text-black" : "bg-white/10 text-white/70"}`}>{label}</button>
        ))}
      </div>

      <div className="px-4 pb-28">
        {tab === "feed" && (feed.length === 0 ? (
          <p className="text-white/40 text-sm py-10 text-center">Здесь появятся публикации участников кружка</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {feed.map((f) => (
              <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                <img src={f.thumbnail || f.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-white text-[10px] font-semibold truncate">{f.title}</span>
              </div>
            ))}
          </div>
        ))}

        {tab === "boards" && (
          <div className="flex flex-col gap-3">
            {isMember && (
              <div className="flex gap-2">
                <input value={newBoard} onChange={(e) => setNewBoard(e.target.value)} placeholder="Новая доска кружка" className="flex-1 bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/40" />
                <button onClick={createBoard} disabled={!newBoard.trim()} className="px-4 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold disabled:opacity-50">Создать</button>
              </div>
            )}
            {boards.length === 0 ? (
              <p className="text-white/40 text-sm py-8 text-center">У кружка пока нет общих досок</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {boards.map((b) => (
                  <button key={b.id} onClick={() => setBoardId(b.id)} className="relative aspect-[4/5] rounded-[20px] overflow-hidden bg-white/10">
                    <BoardCollage images={b.collage} cover={b.cover_image} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 text-left">
                      <p className="text-white text-sm font-bold truncate">{b.title}</p>
                      <p className="text-white/70 text-[11px]">{b.items_count ?? 0} постов</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "challenge" && (
          <div className="flex flex-col gap-3">
            {challenge ? (
              <div className="rounded-3xl p-5 bg-gradient-to-br from-[#FF5A3C] to-[#8b5cf6]">
                <p className="text-white/80 text-xs font-semibold uppercase mb-1">Осталось {left} {daysWord(left)} · участвуют {challenge.participants}</p>
                <h3 className="text-white font-bold text-xl mb-1">{challenge.title}</h3>
                <p className="text-white/90 text-sm mb-3">{challenge.description}</p>
                {isMember && (
                  <button onClick={joinChallenge} className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-sm">
                    {challenge.joined ? "Добавить свой ответ" : "Участвовать"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-white/40 text-sm py-6 text-center">Сейчас в кружке нет челленджа</p>
            )}
            {isAdmin && !challenge && (
              <div className="flex flex-col gap-2 bg-white/5 rounded-2xl p-4">
                <p className="text-white font-semibold text-sm">Запустить челлендж кружка</p>
                <input value={chTitle} onChange={(e) => setChTitle(e.target.value)} placeholder="Название" className="bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/40" />
                <textarea value={chDesc} onChange={(e) => setChDesc(e.target.value)} rows={2} placeholder="Что нужно сделать" className="bg-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-white/40" />
                <button onClick={createChallenge} disabled={!chTitle.trim()} className="py-2.5 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold disabled:opacity-50">Запустить на 7 дней</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const boardsPostChallenge = async (userId: string, body: Record<string, unknown>) => {
  const res = await fetch(`${CHALLENGES_URL}?action=create_circle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify(body),
  }).catch(() => null);
  return { ok: !!res?.ok };
};

export default CircleHub;
