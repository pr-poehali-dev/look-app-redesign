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
  description?: string;
  img?: string;
  members?: number;
  creatorId?: string;
  isMember: boolean;
  isAdmin: boolean;
  onChat?: () => void;
  onCall?: (mode: "audio" | "video") => void;
  onSettings?: () => void;
  onClose: () => void;
}

interface Person { id: string; name: string; role: string; online?: boolean }

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const TABS = [["feed", "Лента"], ["boards", "Доска кружка"], ["challenge", "Челленджи"], ["people", "Участники"]] as const;
type HubTab = (typeof TABS)[number][0];

const CircleHub = ({ communityId, name, description, img, members, isMember, isAdmin, onChat, onCall, onSettings, onClose }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<HubTab>("feed");
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
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
    Promise.all([
      fetch(`${BOARDS_API_URL}?action=circle_feed&community_id=${encodeURIComponent(communityId)}`).then(parse).then((d) => setFeed(d.items || [])).catch(() => {}),
      loadBoards(),
      loadChallenge(),
    ]).finally(() => setLoaded(true));
    if (user) {
      fetch(`${CHAT_API}?module=community&action=members&community_id=${encodeURIComponent(communityId)}`, {
        headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      }).then(parse).then((d) => setPeople(d.members || [])).catch(() => {});
    }
  }, [communityId, user?.id]);

  const share = async () => {
    const url = `${window.location.origin}/?community=${communityId}`;
    try {
      if (navigator.share) { await navigator.share({ title: name, url }); return; }
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка на кружок скопирована");
    } catch { /* ignore */ }
  };
  const tabIndex = TABS.findIndex(([id]) => id === tab);

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
      <div className="flex items-center gap-2 px-4 pt-14 pb-3">
        <button onClick={onClose} className="p-1" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <span className="flex-1" />
        <button onClick={share} className="h-8 px-3 rounded-full bg-[#FFE9E3] text-[#FF5A3C] text-xs font-semibold flex items-center gap-1.5">
          <Icon name="Share2" size={13} />Поделиться
        </button>
        {isMember && onChat && <button onClick={onChat} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Чат"><Icon name="MessageCircle" size={15} className="text-white/80" /></button>}
        {isMember && onCall && <button onClick={() => onCall("audio")} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Звонок"><Icon name="Phone" size={15} className="text-white/80" /></button>}
        {isAdmin && onSettings && <button onClick={onSettings} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Настройки"><Icon name="Settings" size={15} className="text-white/80" /></button>}
      </div>

      <div className="flex items-center gap-4 px-4 pb-4">
        <span className="w-[72px] h-[72px] rounded-full overflow-hidden bg-[#FFE9E3] text-[#FF5A3C] font-bold text-3xl flex items-center justify-center flex-shrink-0">
          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : (name[0] || "?").toUpperCase()}
        </span>
        <div className="min-w-0">
          <h2 className="text-white font-semibold text-[17px] leading-snug truncate">{name}</h2>
          {description && <p className="text-white/60 text-[13px] leading-snug line-clamp-2">{description}</p>}
          <p className="text-white/40 text-[11px] mt-0.5">{members ?? people.length} участников</p>
        </div>
      </div>

      <div className="relative flex border-b border-white/10 mx-4 mb-4">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors duration-200 ${tab === id ? "text-white" : "text-white/45"}`}>{label}</button>
        ))}
        <span
          className="absolute bottom-0 h-[3px] w-9 rounded-full bg-[#FF5A3C] transition-transform duration-200"
          style={{ left: `calc(${tabIndex} * 25% + 12.5% - 18px)`, transitionTimingFunction: "cubic-bezier(0.2,0,0,1)" }}
        />
      </div>

      <div className="px-4 pb-28">
        {!loaded && (
          <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-box aspect-[4/5]" />)}</div>
        )}
        {loaded && tab === "people" && (
          <div className="flex flex-col gap-3">
            {people.length === 0 && <p className="text-white/40 text-sm text-center py-10">Список участников пока пуст</p>}
            {people.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#FFE9E3] text-[#FF5A3C] font-bold flex items-center justify-center">{(m.name[0] || "?").toUpperCase()}</span>
                <span className="flex-1 text-white text-[13px] font-semibold truncate">{m.name}</span>
                <span className="text-white/40 text-[11px]">{m.role === "owner" ? "Создатель" : m.role === "admin" ? "Админ" : "Участник"}</span>
              </div>
            ))}
          </div>
        )}
        {loaded && tab === "feed" && (feed.length === 0 ? (
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

        {loaded && tab === "boards" && (
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

        {loaded && tab === "challenge" && (
          <div className="flex flex-col gap-3">
            {challenge ? (
              <div className="rounded-[20px] p-5 bg-gradient-to-br from-[#FF5A3C] to-[#8b5cf6]">
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
