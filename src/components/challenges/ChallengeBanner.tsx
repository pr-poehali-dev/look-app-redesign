import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useChallenge, daysLeft, daysWord } from "@/hooks/useChallenge";
import ChallengeScreen from "./ChallengeScreen";

const ChallengeBanner = () => {
  const { challenge } = useChallenge();
  const [open, setOpen] = useState(false);

  if (!challenge) return null;
  const left = daysLeft(challenge.ends_at);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] active:scale-[0.99] transition-transform"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon name="Trophy" size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-[11px] font-semibold uppercase tracking-wide">Челлендж недели</p>
          <p className="text-white font-bold text-sm truncate">{challenge.title}</p>
          <p className="text-white/80 text-xs">{challenge.joined ? "Вы участвуете" : "Нажмите, чтобы участвовать"} · осталось {left} {daysWord(left)}</p>
        </div>
        <Icon name="ChevronRight" size={18} className="text-white/80 flex-shrink-0" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[10000] bg-black">
          <ChallengeScreen onBack={() => setOpen(false)} />
        </div>
      )}
    </>
  );
};

export default ChallengeBanner;
