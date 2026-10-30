import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useMyBoards } from "@/hooks/useBoards";
import { useChallenge, useMyBadges, daysLeft, daysWord } from "@/hooks/useChallenge";
import { topicTitle } from "@/lib/topics";
import ChallengeScreen from "@/components/challenges/ChallengeScreen";
import BoardCollage from "@/components/post-feed/BoardCollage";
import CommunitiesScreen from "@/components/CommunitiesScreen";

export type ExtraTab = "boards" | "circles" | "challenges";

interface Props {
  tab: ExtraTab;
  onOpenBoard: (id: number) => void;
  onOpenBoards: () => void;
}

const ProfileExtraTabs = ({ tab, onOpenBoard, onOpenBoards }: Props) => {
  const { boards, loading } = useMyBoards();
  const { challenge } = useChallenge();
  const badges = useMyBadges();
  const [showChallenge, setShowChallenge] = useState(false);
  const [showCircles, setShowCircles] = useState(false);

  if (tab === "boards") {
    return (
      <div className="p-3">
        <button onClick={onOpenBoards} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white text-sm font-semibold mb-3">
          <Icon name="Plus" size={15} />Создать или управлять досками
        </button>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">{[0, 1].map((i) => <div key={i} className="skeleton-box aspect-[4/5]" />)}</div>
        ) : boards.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Пока нет досок</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {boards.map((b) => (
              <button key={b.id} onClick={() => onOpenBoard(b.id)} className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100">
                <BoardCollage images={b.collage} cover={b.cover_image} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-left">
                  <p className="text-white text-sm font-bold truncate flex items-center gap-1">
                    {!b.is_public && <Icon name="Lock" size={10} />}{b.title}
                  </p>
                  <p className="text-white/70 text-[11px]">{b.items_count ?? 0} постов{b.topic ? ` · ${topicTitle(b.topic)}` : ""}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === "circles") {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><Icon name="Users" size={28} className="text-gray-400" /></div>
        <p className="text-sm text-gray-500">Кружки — сообщества по интересам со своей лентой, досками и челленджами</p>
        <button onClick={() => setShowCircles(true)} className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-semibold">Открыть кружки</button>
        {showCircles && (
          <div className="fixed inset-0 z-[10000] bg-black">
            <CommunitiesScreen onBack={() => setShowCircles(false)} />
          </div>
        )}
      </div>
    );
  }

  const left = challenge ? daysLeft(challenge.ends_at) : 0;
  return (
    <div className="p-3 flex flex-col gap-3">
      {challenge ? (
        <button onClick={() => setShowChallenge(true)} className="rounded-2xl p-4 text-left bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6]">
          <p className="text-white/80 text-[11px] font-semibold uppercase">Челлендж недели · осталось {left} {daysWord(left)}</p>
          <p className="text-white font-bold text-base">{challenge.title}</p>
          <p className="text-white/80 text-xs mt-0.5">{challenge.joined ? "Вы участвуете" : "Нажмите, чтобы участвовать"}</p>
        </button>
      ) : (
        <p className="text-center text-sm text-gray-400 py-6">Сейчас нет активного челленджа</p>
      )}
      <div>
        <p className="text-black font-bold text-sm mb-2">Мои бейджи</p>
        {badges.length === 0 ? (
          <p className="text-sm text-gray-400">Участвуйте в челленджах и собирайте бейджи</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.challenge_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <Icon name="Award" size={13} />{b.title}
              </span>
            ))}
          </div>
        )}
      </div>
      {showChallenge && (
        <div className="fixed inset-0 z-[10000] bg-black"><ChallengeScreen onBack={() => setShowChallenge(false)} /></div>
      )}
    </div>
  );
};

export default ProfileExtraTabs;
