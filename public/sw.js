// Service worker mínimo de Muvia: guarda las páginas visitadas para que la app
// abra aunque la señal sea mala. Red primero; si falla, se usa la copia guardada.
const CACHE = "muvia-v1";
const SHELL = ["/", "/solicitar", "/transportista"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Solo GET del mismo origen; las acciones del servidor (POST) siempre van a la red.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
  );
});

// Aviso al celular: "Apareció un transportista" para la solicitud del cliente.
self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    // Un aviso sin datos igual se muestra.
  }
  event.waitUntil(
    self.registration.showNotification(msg.title || "Muvia", {
      body: msg.body || "Apareció un transportista para tu viaje.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: msg.tag,
      renotify: Boolean(msg.tag),
      data: { url: msg.url || "/solicitar" },
    }),
  );
});

// Al tocar el aviso se abre la app en la solicitud, o se trae al frente si ya estaba ahí.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/solicitar", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url === url);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
