const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

type Resolver = (count: number) => void;

interface PendingItem {
  resolvers: Resolver[];
}

interface PendingMaps {
  likes: Map<string, PendingItem>;
  comments: Map<string, PendingItem>;
}

const pending: Record<string, PendingMaps> = {};
let timer: ReturnType<typeof setTimeout> | null = null;

const ensure = (targetType: string): PendingMaps => {
  if (!pending[targetType]) {
    pending[targetType] = { likes: new Map(), comments: new Map() };
  }
  return pending[targetType];
};

const flush = async () => {
  timer = null;
  const types = Object.keys(pending);
  for (const targetType of types) {
    const maps = pending[targetType];
    if (!maps) continue;
    const idSet = new Set<string>([...maps.likes.keys(), ...maps.comments.keys()]);
    if (idSet.size === 0) continue;
    const ids = Array.from(idSet);
    const likesMap = maps.likes;
    const commentsMap = maps.comments;
    delete pending[targetType];
    try {
      const url = `${COMMENTS_URL}?action=count&target_type=${encodeURIComponent(targetType)}&target_ids=${ids.map(encodeURIComponent).join(",")}`;
      const res = await fetch(url);
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      const likes: Record<string, number> = data?.likes || {};
      const comments: Record<string, number> = data?.comments || {};
      for (const id of ids) {
        const li = likesMap.get(id);
        if (li) {
          const cnt = Number(likes[id] || 0);
          for (const r of li.resolvers) r(cnt);
        }
        const ci = commentsMap.get(id);
        if (ci) {
          const cnt = Number(comments[id] || 0);
          for (const r of ci.resolvers) r(cnt);
        }
      }
    } catch {
      for (const id of ids) {
        const li = likesMap.get(id);
        if (li) for (const r of li.resolvers) r(0);
        const ci = commentsMap.get(id);
        if (ci) for (const r of ci.resolvers) r(0);
      }
    }
  }
};

const schedule = () => {
  if (!timer) timer = setTimeout(flush, 120);
};

export const fetchLikeCount = (targetType: string, targetId: string): Promise<number> => {
  return new Promise<number>((resolve) => {
    const maps = ensure(targetType);
    const existing = maps.likes.get(targetId);
    if (existing) existing.resolvers.push(resolve);
    else maps.likes.set(targetId, { resolvers: [resolve] });
    schedule();
  });
};

export const fetchCommentCount = (targetType: string, targetId: string): Promise<number> => {
  return new Promise<number>((resolve) => {
    const maps = ensure(targetType);
    const existing = maps.comments.get(targetId);
    if (existing) existing.resolvers.push(resolve);
    else maps.comments.set(targetId, { resolvers: [resolve] });
    schedule();
  });
};
