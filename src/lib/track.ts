import { BOARDS_API_URL } from "@/hooks/useBoards";

export const trackEvent = (event: "ideas_filter_on" | "ideas_filter_off" | "board_saved" | "card_created", userId?: string | null) => {
  fetch(`${BOARDS_API_URL}?action=track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": userId } : {}) },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
};
