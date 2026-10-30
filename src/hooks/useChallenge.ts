import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export const CHALLENGES_URL = "https://functions.poehali.dev/8ce65220-2d6f-4214-be2e-dbf4e210a720";

export interface Challenge {
  id: number;
  title: string;
  description: string;
  criteria: string;
  topic: string | null;
  badge_title: string;
  starts_at: string | null;
  ends_at: string | null;
  joined: boolean;
  participants: number;
}

export interface Badge {
  title: string;
  challenge_id: number;
  awarded_at?: string;
}

const parse = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

export const useChallenge = () => {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch(`${CHALLENGES_URL}?action=current`, { headers: user?.id ? { "X-User-Id": user.id } : {} })
      .then(parse)
      .then((d) => setChallenge(d.challenge || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const join = useCallback(async () => {
    if (!user?.id || !challenge) return false;
    const res = await fetch(`${CHALLENGES_URL}?action=join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ challenge_id: challenge.id }),
    }).catch(() => null);
    if (res?.ok) { refresh(); return true; }
    return false;
  }, [user?.id, challenge, refresh]);

  return { challenge, loading, refresh, join };
};

export const useMyBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  useEffect(() => {
    if (!user?.id) { setBadges([]); return; }
    fetch(`${CHALLENGES_URL}?action=my`, { headers: { "X-User-Id": user.id } })
      .then(parse)
      .then((d) => setBadges(d.badges || []))
      .catch(() => {});
  }, [user?.id]);
  return badges;
};

export const submitToChallenge = async (userId: string, challengeId: number, videoId: number) => {
  const res = await fetch(`${CHALLENGES_URL}?action=submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({ challenge_id: challengeId, video_id: videoId }),
  }).catch(() => null);
  if (!res?.ok) return null;
  const d = await parse(res);
  return (d.badge as string) || null;
};

export const daysLeft = (iso: string | null) => {
  if (!iso) return 0;
  const d = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z").getTime();
  return Math.max(0, Math.ceil((d - Date.now()) / 86400000));
};

export const daysWord = (n: number) => {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return "день";
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return "дня";
  return "дней";
};

export const submitPendingChallenge = async (userId: string | undefined, videoId: number | undefined) => {
  if (!userId || !videoId) return null;
  let id: string | null = null;
  try { id = sessionStorage.getItem("pending_challenge_id"); } catch { /* ignore */ }
  if (!id) return null;
  const badge = await submitToChallenge(userId, Number(id), videoId);
  if (badge) {
    try {
      sessionStorage.removeItem("pending_challenge_id");
      sessionStorage.removeItem("pending_challenge_topic");
    } catch { /* ignore */ }
  }
  return badge;
};
