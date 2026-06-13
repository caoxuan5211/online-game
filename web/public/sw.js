const CACHE_NAME = "elastic-duo-v20260613-13";
const BUILD = "20260613-smooth13";
const CORE_ASSETS = [
  "./",
  "./index.html",
  versioned("./styles.css"),
  versioned("./loader.css"),
  versioned("./feedback.css"),
  versioned("./config.js"),
  "./favicon.svg",
  "./assets/background.png",
  versioned("./src/main.js"),
  versioned("./src/prediction.js"),
  versioned("./src/preload.js"),
  versioned("./src/render.js"),
  versioned("./src/render-cache.js"),
  versioned("./src/render-quality.js"),
  versioned("./src/render-utils.js"),
  versioned("./src/settings.js"),
  versioned("./src/smoothing.js"),
  versioned("./src/input.js"),
  versioned("./src/ui.js"),
  versioned("./src/audio.js")
];
const CACHE_FIRST = /\.(png|svg|jpg|jpeg|webp|ico)$/i;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/socket.io/")) return;
  event.respondWith(CACHE_FIRST.test(url.pathname) ? cacheFirst(request) : networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

function versioned(url) {
  return `${url}?v=${BUILD}`;
}
