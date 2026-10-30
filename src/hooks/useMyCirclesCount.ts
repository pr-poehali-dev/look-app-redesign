import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

export const useMyCirclesCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    fetch(`${API}?module=community&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then((r) => r.json())
      .then((raw) => {
        const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setCount((d.communities || []).filter((c: { kind?: string; joined?: boolean }) => c.kind !== "channel" && c.joined).length);
      })
      .catch(() => {});
  }, [user?.id]);
  return count;
};
