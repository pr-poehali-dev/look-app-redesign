import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const BOARDS_URL = "https://functions.poehali.dev/4b244d4d-3141-468d-93cc-3b1f106390ca";

export interface Board {
  id: number;
  owner_user_id: string;
  title: string;
  description: string;
  cover_image: string | null;
  is_public: boolean;
  created_at?: string;
  topic?: string | null;
  is_collab?: boolean;
  items_count?: number;
  collage?: string[];
  community_id?: string | null;
  my_role?: "owner" | "editor" | "member";
}

export interface BoardMember {
  user_id: string;
  role: "owner" | "editor" | "member";
  handle: string | null;
  name: string | null;
}

export interface BoardItem {
  id: number;
  item_type: string;
  item_id: string;
  image: string | null;
  title: string | null;
  added_at?: string;
  added_by?: string | null;
  added_by_handle?: string | null;
  pinned?: boolean;
  sort_order?: number;
  source_handle?: string | null;
}

const parseBody = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

/** Мои доски (владелец видит все, включая приватные) + CRUD. */
export const useMyBoards = () => {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!user?.id) { setBoards([]); return; }
    setLoading(true);
    fetch(`${BOARDS_URL}?action=mine`, { headers: { "X-User-Id": user.id } })
      .then(parseBody)
      .then((data) => setBoards(data.boards || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (title: string, description = "", isPublic = true, extra: { topic?: string; isCollab?: boolean; communityId?: string } = {}) => {
    if (!user?.id) return null;
    const res = await fetch(`${BOARDS_URL}?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ title, description, is_public: isPublic, topic: extra.topic || null, is_collab: !!extra.isCollab, community_id: extra.communityId || null }),
    });
    const data = await parseBody(res);
    refresh();
    return data.id as number | null;
  }, [user?.id, refresh]);

  const update = useCallback(async (id: number, patch: Partial<Pick<Board, "title" | "description" | "is_public" | "cover_image" | "topic">>) => {
    if (!user?.id) return;
    await fetch(`${BOARDS_URL}?action=update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => {});
    refresh();
  }, [user?.id, refresh]);

  const remove = useCallback(async (id: number) => {
    if (!user?.id) return;
    await fetch(`${BOARDS_URL}?action=delete&id=${id}`, {
      method: "DELETE",
      headers: { "X-User-Id": user.id },
    }).catch(() => {});
    refresh();
  }, [user?.id, refresh]);

  return { boards, loading, refresh, create, update, remove };
};

/** Публичные доски конкретного пользователя (для его профиля). */
export const useUserBoards = (userId?: string | null) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setBoards([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`${BOARDS_URL}?action=user_boards&user_id=${encodeURIComponent(userId)}`)
      .then(parseBody)
      .then((data) => { if (!cancelled) setBoards(data.boards || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  return { boards, loading };
};

/** Одна доска + её элементы. */
export const useBoard = (boardId?: number | null) => {
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [myRole, setMyRole] = useState<"owner" | "editor" | "member" | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    fetch(`${BOARDS_URL}?action=view&board_id=${boardId}`, {
      headers: user?.id ? { "X-User-Id": user.id } : {},
    })
      .then(async (res) => {
        const data = await parseBody(res);
        if (!res.ok) { setError(data.error || "Ошибка"); return; }
        setBoard(data.board || null);
        setItems(data.items || []);
        setMyRole(data.my_role || null);
        setMembers(data.members || []);
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [boardId, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const removeItem = useCallback(async (itemRowId: number) => {
    if (!user?.id) return;
    setItems((prev) => prev.filter((i) => i.id !== itemRowId));
    await fetch(`${BOARDS_URL}?action=remove_item&id=${itemRowId}`, {
      method: "DELETE",
      headers: { "X-User-Id": user.id },
    }).catch(() => {});
  }, [user?.id]);

  const pinItem = useCallback(async (itemRowId: number, pinned: boolean) => {
    if (!user?.id) return false;
    const res = await fetch(`${BOARDS_URL}?action=pin_item`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ id: itemRowId, pinned }),
    });
    if (!res.ok) return false;
    setItems((prev) => prev.map((i) => i.id === itemRowId ? { ...i, pinned } : i));
    return true;
  }, [user?.id]);

  const reorder = useCallback(async (orderedIds: number[]) => {
    if (!user?.id || !boardId) return;
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      const next = orderedIds.map((id) => map.get(id)).filter(Boolean) as BoardItem[];
      const rest = prev.filter((i) => !orderedIds.includes(i.id));
      return [...next, ...rest];
    });
    await fetch(`${BOARDS_URL}?action=reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ board_id: boardId, order: orderedIds }),
    }).catch(() => {});
  }, [user?.id, boardId]);

  return { board, items, myRole, members, loading, error, refresh, removeItem, pinItem, reorder };
};

export const addItemToBoard = async (
  boardId: number,
  item: { itemType: "post" | "video"; itemId: string | number; image?: string; title?: string; sourceHandle?: string },
  userId: string,
) => {
  await fetch(`${BOARDS_URL}?action=add_item`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({
      board_id: boardId,
      item_type: item.itemType,
      item_id: String(item.itemId),
      image: item.image || "",
      title: item.title || "",
      source_handle: item.sourceHandle || "",
    }),
  }).catch(() => {});
};

export const addItemToBoards = async (
  boardIds: number[],
  item: { itemType: "post" | "video"; itemId: string | number; image?: string; title?: string; sourceHandle?: string },
  userId: string,
) => {
  const res = await fetch(`${BOARDS_URL}?action=add_item_multi`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify({
      board_ids: boardIds.slice(0, 3),
      item_type: item.itemType,
      item_id: String(item.itemId),
      image: item.image || "",
      title: item.title || "",
      source_handle: item.sourceHandle || "",
    }),
  }).catch(() => null);
  if (!res) return 0;
  const data = await parseBody(res);
  return (data.added as number) || 0;
};

export const boardsPost = async (action: string, userId: string, body: Record<string, unknown>) => {
  const res = await fetch(`${BOARDS_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify(body),
  });
  const data = await parseBody(res);
  return { ok: res.ok, data };
};

export const BOARDS_API_URL = BOARDS_URL;
