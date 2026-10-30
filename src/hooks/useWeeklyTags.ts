import { useEffect, useState } from "react";

export const WEEKLY_TAGS_KEY = "weekly_tags_v1";

export const useWeeklyTags = (): string[] => {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WEEKLY_TAGS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setTags(parsed.filter((t) => typeof t === "string"));
    } catch { /* ignore */ }
  }, []);
  return tags;
};
