const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const bufferToBase64Url = (buf: ArrayBuffer | null) => {
  if (!buf) return "";
  let s = "";
  new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const isPushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function hasPushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  return !!(await reg.pushManager.getSubscription());
}

export async function subscribeToCallPush(userId: string, userName: string) {
  if (!isPushSupported()) return;
  if (Notification.permission === "denied") return;
  const reg = await navigator.serviceWorker.ready;
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
  }
  const headers = { "X-User-Id": userId, "X-User-Name": encodeURIComponent(userName) };
  const res = await fetch(`${CHAT_API}?module=push`, { headers });
  const raw = await res.json();
  const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  if (!data.publicKey) return;
  let sub = await reg.pushManager.getSubscription();
  if (sub && bufferToBase64Url(sub.options.applicationServerKey) !== data.publicKey) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) {
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

export async function unsubscribeFromPush(userId: string) {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch(`${CHAT_API}?module=push`, {
    method: "POST",
    headers: { "X-User-Id": userId, "Content-Type": "application/json" },
    body: JSON.stringify({ unsubscribe: true, endpoint: sub.endpoint }),
  });
}
