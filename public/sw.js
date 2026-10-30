const VERSION = "v4";
const API = `api-${VERSION}`;
const SHELL = `shell-${VERSION}`;
const STATIC = `static-${VERSION}`;

const trimCache = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
};

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== STATIC && k !== API).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("/").then((cachedShell) => {
        const network = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put("/", copy));
          return res;
        });
        if (!cachedShell) return network.catch(() => Response.error());
        const timeout = new Promise((resolve) => setTimeout(() => resolve(cachedShell), 2500));
        return Promise.race([network.catch(() => cachedShell), timeout]);
      })
    );
    return;
  }

  if (url.hostname === "functions.poehali.dev" && !/signal|poll|call|presence|typing|auth|token/i.test(url.search + url.pathname) && !req.headers.get("range")) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(API);
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            cache.put(req, copy).then(() => trimCache(API, 120));
          }
          return res;
        });
        if (!cached) return network;
        const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), 4000));
        return Promise.race([network.catch(() => cached), timeout]);
      })()
    );
    return;
  }

  const isStatic =
    (url.origin === self.location.origin && (url.pathname.startsWith("/assets/") || /\.(svg|png|jpg|webp|woff2?|mp3|ogg)$/.test(url.pathname))) ||
    (url.hostname === "cdn.poehali.dev" && /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(url.pathname)) ||
    url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com";

  if (!isStatic) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(STATIC).then((c) => c.put(req, copy).then(() => trimCache(STATIC, 300)));
        }
        return res;
      });
    })
  );
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = {}; }
  if (d.type === "notify") {
    e.waitUntil(
      self.registration.showNotification(d.title || "Лоок", {
        body: d.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { type: "notify", url: d.url || "/" },
      })
    );
    return;
  }
  if (d.type !== "call") return;
  const title = (d.callerName || "Входящий звонок");
  const body = d.mode === "video" ? "Видеозвонок" : "Аудиозвонок";
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "incoming-call",
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 200, 400, 200, 400],
      data: d,
      actions: [
        { action: "accept", title: "Принять" },
        { action: "decline", title: "Отклонить" },
      ],
    })
  );
});

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  if (d.type === "notify") {
    const target = d.url || "/";
    e.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        if (list.length) {
          const c = list[0];
          return c.focus().then(() => (c.navigate ? c.navigate(target) : null)).catch(() => self.clients.openWindow(target));
        }
        return self.clients.openWindow(target);
      })
    );
    return;
  }
  if (e.action === "decline") {
    if (d.toUser && d.callerId && d.roomId) {
      e.waitUntil(
        fetch(`${CHAT_API}?module=signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": d.toUser },
          body: JSON.stringify({ room_id: d.roomId, to_user: d.callerId, type: "call_declined", payload: {} }),
        }).catch(() => {})
      );
    }
    return;
  }
  const accept = e.action !== "decline";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length) {
        const c = list[0];
        if (accept) c.postMessage({ type: "accept_call", call: d });
        return c.focus();
      }
      if (accept) {
        const q = new URLSearchParams({
          accept_call: d.roomId || "",
          cid: d.callerId || "",
          cname: d.callerName || "",
          cmode: d.mode || "audio",
        });
        return self.clients.openWindow("/?" + q.toString());
      }
      return self.clients.openWindow("/");
    })
  );
});
