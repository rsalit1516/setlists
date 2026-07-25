const CHART_CACHE = 'performance-chart-files'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function isChartFileRequest(url) {
  return /\.(pdf|jpe?g|png)$/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || !isChartFileRequest(url)) return

  event.respondWith(
    caches.open(CHART_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      if (cached) return cached
      const response = await fetch(event.request)
      if (response.ok || response.type === 'opaque') {
        cache.put(event.request, response.clone())
      }
      return response
    })
  )
})
