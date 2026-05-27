import { useEffect, useState, useCallback } from "react";
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
  pollId: number;
  communityId: string;
  isMe: boolean;
  time: string;
}

const PollMessage = ({ pollId, communityId, isMe, time }: Props) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
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
      const found = (data.polls || []).find((p: Poll) => p.id === pollId);
      setPoll(found || null);
    } catch {
      // тихо
    } finally {
      setLoading(false);
    }
  }, [user, communityId, pollId]);

  useEffect(() => {
    load();
  }, [load]);

  const vote = async (optionId: number) => {
    if (!user || !poll || poll.is_closed || busy) return;
    let next: number[];
    if (poll.is_multi) {
      next = poll.my_votes.includes(optionId)
        ? poll.my_votes.filter((x) => x !== optionId)
        : [...poll.my_votes, optionId];
      if (next.length === 0) return;
    } else {
      next = [optionId];
    }
    setBusy(true);
    try {
      await fetch(`${API}?module=community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "poll_vote", poll_id: poll.id, option_ids: next }),
      });
      await load();
    } catch {
      // тихо
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`px-4 py-3 rounded-2xl max-w-[85%] w-[280px] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
        <div className="text-white/60 text-xs">Загрузка опроса...</div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className={`px-4 py-3 rounded-2xl max-w-[85%] w-[280px] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
        <div className="text-white/70 text-xs">Опрос недоступен</div>
        <div className="text-white/40 text-[10px] mt-1 text-right">{time}</div>
      </div>
    );
  }

  const total = poll.total_votes || 0;

  return (
    <div className={`rounded-2xl max-w-[85%] w-[300px] overflow-hidden ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon name="BarChart3" size={14} className="text-white/70" />
          <span className="text-white/70 text-[10px] uppercase tracking-wider">
            {poll.is_anonymous ? "Анонимный опрос" : "Опрос"}
            {poll.is_multi ? " · несколько вариантов" : ""}
            {poll.is_closed ? " · завершён" : ""}
          </span>
        </div>
        <div className="text-white text-sm font-medium leading-snug">{poll.question}</div>
      </div>
      <div className="px-3 pb-2 space-y-1.5">
        {poll.options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
          const checked = poll.my_votes.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={poll.is_closed || busy}
              className="w-full text-left relative overflow-hidden rounded-lg bg-black/20 hover:bg-black/30 disabled:opacity-70 transition-colors"
            >
              <div
                className={`absolute inset-y-0 left-0 ${checked ? "bg-white/25" : "bg-white/10"} transition-all`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center gap-2 px-3 py-2">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${checked ? "border-white bg-white" : "border-white/40"}`}>
                  {checked && <Icon name="Check" size={10} className={isMe ? "text-[#fe2c55]" : "text-black"} />}
                </div>
                <div className="text-white text-xs flex-1 truncate">{opt.text}</div>
                <div className="text-white/70 text-[10px] flex-shrink-0">{pct}%</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className="text-white/50 text-[10px]">Голосов: {total}</div>
        <div className="text-white/40 text-[10px]">{time}</div>
      </div>
    </div>
  );
};

export default PollMessage;
