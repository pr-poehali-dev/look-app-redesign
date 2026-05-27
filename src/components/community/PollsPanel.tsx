import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface PollOption {
  id: number;
  text: string;
  votes: number;
}

interface Poll {
  id: number;
  author_id: string;
  author_name: string;
  question: string;
  is_multi: boolean;
  is_anonymous: boolean;
  is_closed: boolean;
  options: PollOption[];
  total_votes: number;
  my_votes: number[];
}

interface Props {
  communityId: string;
  isAdmin: boolean;
  onClose: () => void;
}

const PollsPanel = ({ communityId, isAdmin, onClose }: Props) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isMulti, setIsMulti] = useState(false);
  const [isAnon, setIsAnon] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "poll_list", community_id: communityId }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setPolls(data.polls || []);
    } catch {
      // тихо
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const vote = async (poll: Poll, optionId: number) => {
    if (!user || poll.is_closed) return;
    let next: number[];
    if (poll.is_multi) {
      next = poll.my_votes.includes(optionId)
        ? poll.my_votes.filter((x) => x !== optionId)
        : [...poll.my_votes, optionId];
      if (next.length === 0) return;
    } else {
      next = [optionId];
    }
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "poll_vote", poll_id: poll.id, option_ids: next }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) load();
    } catch {
      // тихо
    }
  };

  const closePoll = async (pollId: number) => {
    if (!user) return;
    if (!confirm("Завершить опрос? Голосовать больше будет нельзя.")) return;
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "poll_close", poll_id: pollId }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) load();
    } catch {
      // тихо
    }
  };

  const submitCreate = async () => {
    if (!user) return;
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      alert("Введи вопрос и минимум 2 варианта");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({
          action: "poll_create",
          community_id: communityId,
          question: q,
          options: opts,
          is_multi: isMulti,
          is_anonymous: isAnon,
        }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        setShowCreate(false);
        setQuestion("");
        setOptions(["", ""]);
        setIsMulti(false);
        setIsAnon(false);
        load();
      } else {
        alert(data.error === "only admin can create polls" ? "Только админ может создавать опросы" : "Не удалось создать опрос");
      }
    } catch {
      alert("Не удалось создать опрос. Проверь интернет.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="relative bg-[#1a1a1a] w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <div className="text-white font-semibold">Опросы группы</div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 text-[#61d4f0] text-sm px-2 py-1 rounded hover:bg-white/5"
              >
                <Icon name="Plus" size={16} />
                Новый
              </button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <Icon name="X" size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && <div className="text-white/40 text-sm text-center">Загрузка...</div>}
          {!loading && polls.length === 0 && (
            <div className="text-white/40 text-sm text-center py-8">
              Опросов ещё нет{isAdmin ? ". Создай первый!" : ""}
            </div>
          )}
          {polls.map((poll) => {
            const total = poll.total_votes || 0;
            return (
              <div key={poll.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-white font-medium">{poll.question}</div>
                    <div className="text-white/40 text-xs mt-1">
                      {poll.author_name} · {poll.is_multi ? "несколько вариантов" : "один вариант"}
                      {poll.is_anonymous ? " · анонимно" : ""}
                      {poll.is_closed ? " · завершён" : ""}
                    </div>
                  </div>
                  {isAdmin && !poll.is_closed && (
                    <button
                      onClick={() => closePoll(poll.id)}
                      className="text-white/40 hover:text-red-400 text-xs"
                      title="Завершить"
                    >
                      Завершить
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {poll.options.map((opt) => {
                    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                    const checked = poll.my_votes.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => vote(poll, opt.id)}
                        disabled={poll.is_closed}
                        className="w-full text-left relative overflow-hidden rounded-lg border border-white/10 hover:border-white/30 disabled:opacity-60"
                      >
                        <div
                          className={`absolute inset-y-0 left-0 ${checked ? "bg-[#61d4f0]/30" : "bg-white/5"}`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2 text-white text-sm">
                            <Icon name={checked ? "CheckCircle2" : "Circle"} size={16} className={checked ? "text-[#61d4f0]" : "text-white/40"} />
                            {opt.text}
                          </div>
                          <div className="text-white/60 text-xs">{pct}% · {opt.votes}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-white/40 text-xs mt-2">Всего голосов: {total}</div>
              </div>
            );
          })}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-4 space-y-3 max-h-[90vh] overflow-y-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold">Новый опрос</div>
                <button onClick={() => setShowCreate(false)} className="text-white/60">
                  <Icon name="X" size={18} />
                </button>
              </div>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={300}
                placeholder="Вопрос"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
              />
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      maxLength={120}
                      placeholder={`Вариант ${i + 1}`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        className="text-white/40 hover:text-red-400"
                      >
                        <Icon name="X" size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <button
                    onClick={() => setOptions([...options, ""])}
                    className="text-[#61d4f0] text-sm flex items-center gap-1"
                  >
                    <Icon name="Plus" size={14} />
                    Добавить вариант
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                <input type="checkbox" checked={isMulti} onChange={(e) => setIsMulti(e.target.checked)} />
                Можно выбрать несколько
              </label>
              <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)} />
                Анонимный
              </label>
              <button
                onClick={submitCreate}
                disabled={creating}
                className="w-full bg-[#61d4f0] text-black font-semibold py-2 rounded-lg disabled:opacity-50"
              >
                {creating ? "Создаём..." : "Создать опрос"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PollsPanel;