const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

type Resolver = (count: number) => void;

interface PendingItem {
  resolvers: Resolver[];
}

const pending: Record<string, Map<string, PendingItem>> = {};
let timer: ReturnType<typeof setTimeout> | null = null;

const flush = async () => {
  timer = null;
  const types = Object.keys(pending);
  for (const targetType of types) {
    const map = pending[targetType];
    if (!map || map.size === 0) continue;
    const ids = Array.from(map.keys());
    delete pending[targetType];
    try {
      const url = `${COMMENTS_URL}?action=count&target_type=${encodeURIComponent(targetType)}&target_ids=${ids.map(encodeURIComponent).join(",")}`;
      const res = await fetch(url);
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      const likes: Record<string, number> = data?.likes || {};
      for (const id of ids) {
        const item = map.get(id);
        if (!item) continue;
        const cnt = Number(likes[id] || 0);
        for (const r of item.resolvers) r(cnt);
      }
    } catch {
      for (const id of ids) {
        const item = map.get(id);
        if (!item) continue;
        for (const r of item.resolvers) r(0);
      }
    }
  }
};

export const fetchLikeCount = (targetType: string, targetId: string): Promise<number> => {
  return new Promise<number>((resolve) => {
    if (!pending[targetType]) pending[targetType] = new Map();
    const map = pending[targetType];
    const existing = map.get(targetId);
    if (existing) {
      existing.resolvers.push(resolve);
    } else {
      map.set(targetId, { resolvers: [resolve] });
    }
    if (!timer) timer = setTimeout(flush, 80);
  });
};
