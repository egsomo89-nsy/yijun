/* 유이준 디지털 앨범 — 서비스 워커
 * 앱 화면 파일과 CDN 라이브러리를 캐시해 설치형 웹앱(PWA)으로 동작하게 하고,
 * 인터넷이 끊겨도 앱이 열리도록 합니다. (Firebase 데이터 통신은 건드리지 않음)
 * 앱 파일을 수정해 배포할 때는 VERSION 값을 올려 주세요. */
const VERSION = 'v7';
const CACHE = `yijun-album-${VERSION}`;

const APP_SHELL = [
  './', 'index.html', 'app.jsx', 'firebase.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
];

// 캐시해 둘 외부 라이브러리 · 글꼴 호스트
const CDN_HOSTS = ['unpkg.com', 'cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 앱 파일: 네트워크 우선(항상 최신) → 실패 시 캐시
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(request)) || (await cache.match('index.html')) || Response.error();
  }
}

// CDN 파일: 캐시 우선 → 뒤에서 조용히 갱신
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
    return res;
  });
  if (cached) { refresh.catch(() => {}); return cached; }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/__/')) return; // Firebase 인증 처리 경로는 통과
    event.respondWith(networkFirst(request));
  } else if (CDN_HOSTS.includes(url.hostname) || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    event.respondWith(cacheFirst(request));
  }
});
