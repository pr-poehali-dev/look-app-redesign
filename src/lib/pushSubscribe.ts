const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function subscribeToCallPush(userId: string, userName: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if (Notification.permission === "denied") return;
  const reg = await navigator.serviceWorker.ready;
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
  }
  const headers = { "X-User-Id": userId, "X-User-Name": encodeURIComponent(userName) };
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch(`${CHAT_API}?module=push`, { headers });
    const raw = await res.json();
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
    if (!data.publicKey) return;
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  await fetch(`${CHAT_API}?module=push`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
}
