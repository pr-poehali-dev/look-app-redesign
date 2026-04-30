const KEY = "guest_id";

export const getGuestId = (): string => {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
};
