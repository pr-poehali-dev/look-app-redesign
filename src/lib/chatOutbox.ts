const KEY = "chat_outbox_v1";
const QUEUEABLE = new Set(["text", "sticker", "location", "contact"]);

export interface OutboxItem {
  tempId: number;
  chatId: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  type: string;
  content: string;
  userId: string;
  userName: string;
  time: string;
}

const read = (): OutboxItem[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const write = (items: OutboxItem[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

export const canQueue = (type: string) => QUEUEABLE.has(type);

export const outboxAdd = (item: OutboxItem) => write([...read(), item]);

export const outboxForChat = (chatId: string) => read().filter((i) => i.chatId === chatId);

export const outboxRemove = (tempId: number) => write(read().filter((i) => i.tempId !== tempId));

let flushing = false;

export const outboxFlush = async (
  chatId: string,
  onSent: (item: OutboxItem, data: { id: number; time?: string }) => void
) => {
  if (flushing || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  flushing = true;
  try {
    for (const item of outboxForChat(chatId)) {
      try {
        const res = await fetch(item.url, {
          method: "POST",
          headers: item.headers,
          body: JSON.stringify(item.body),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.id) {
          outboxRemove(item.tempId);
          onSent(item, data);
        } else if (res.status >= 400 && res.status < 500) {
          outboxRemove(item.tempId);
        }
      } catch {
        break;
      }
    }
  } finally {
    flushing = false;
  }
};
