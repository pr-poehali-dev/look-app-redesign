import { useEffect, useState } from "react";

const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

export type BulkTarget = "video" | "post";

interface Counts {
  comments: Record<string, number>;
  likes: Record<string, number>;
}

export const useBulkCounts = (targetType: BulkTarget, ids: Array<string | number>) => {
  const [counts, setCounts] = useState<Counts>({ comments: {}, likes: {} });
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    const params = new URLSearchParams({
      action: "count",
      target_type: targetType,
      target_ids: ids.map(String).join(","),
    });
    fetch(`${COMMENTS_URL}?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setCounts({
          comments: data.comments || {},
          likes: data.likes || {},
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [targetType, key]);

  return counts;
};
