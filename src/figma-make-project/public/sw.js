const CACHE_NAME = 'my-locations-v1.0.0'
const STATIC_CACHE_NAME = 'my-locations-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'my-locations-dynamic-v1.0.0'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  // Add other static assets as needed
]

// Assets to cache dynamically
const CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css)$/,
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
  // Force activation of new service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('my-locations-')) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
  )
  // Take control of all clients immediately
  self.clients.claim()
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests and Chrome extension requests
  if (url.origin !== location.origin || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle Firebase requests (online only)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return offline response for Firebase requests
          return new Response(JSON.stringify({ 
            error: 'Offline - Firebase services unavailable' 
          }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          })
        })
    )
    return
  }

  // Handle nominatim geocoding requests (cache for 1 hour)
  if (url.hostname.includes('nominatim.openstreetmap.org')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              if (response) {
                // Check if cached response is less than 1 hour old
                const cachedTime = response.headers.get('sw-cached-time')
                if (cachedTime && (Date.now() - parseInt(cachedTime)) < 3600000) {
                  return response
                }
              }
              
              // Fetch fresh data
              return fetch(request)
                .then((fetchResponse) => {
                  if (fetchResponse.ok) {
                    // Clone and add timestamp header
                    const responseToCache = fetchResponse.clone()
                    const headers = new Headers(responseToCache.headers)
                    headers.set('sw-cached-time', Date.now().toString())
                    
                    const cachedResponse = new Response(responseToCache.body, {
                      status: responseToCache.status,
                      statusText: responseToCache.statusText,
                      headers: headers
                    })
                    
                    cache.put(request, cachedResponse)
                  }
                  return fetchResponse
                })
                .catch(() => {
                  // Return cached version if available, even if expired
                  return response || new Response(JSON.stringify({
                    error: 'Offline - Geocoding service unavailable'
                  }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  })
                })
            })
        })
    )
    return
  }

  // Handle app shell and static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response
          }

          return fetch(request)
            .then((fetchResponse) => {
              // Don't cache non-successful responses
              if (!fetchResponse.ok) {
                return fetchResponse
              }

              // Check if we should cache this request
              const shouldCache = CACHE_PATTERNS.some(pattern => 
                pattern.test(request.url)
              )

              if (shouldCache) {
                const responseToCache = fetchResponse.clone()
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseToCache)
                  })
              }

              return fetchResponse
            })
            .catch(() => {
              // Return offline page for navigation requests
              if (request.mode === 'navigate') {
                return caches.match('/') || new Response(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>My Locations App - Offline</title>
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <style>
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                          text-align: center; 
                          padding: 50px; 
                          background: #faf9f7; 
                          color: #2d2926;
                        }
                        .offline-icon { font-size: 64px; margin-bottom: 20px; }
                        h1 { color: #f77536; margin-bottom: 10px; }
                        button { 
                          background: #f77536; 
                          color: white; 
                          border: none; 
                          padding: 12px 24px; 
                          border-radius: 6px; 
                          cursor: pointer;
                          font-size: 16px;
                          margin-top: 20px;
                        }
                        button:hover { background: #e66a2e; }
                      </style>
                    </head>
                    <body>
                      <div class="offline-icon">📍</div>
                      <h1>My Locations App</h1>
                      <p>You're currently offline</p>
                      <p>Your saved locations are still available locally</p>
                      <button onclick="window.location.reload()">Try Again</button>
                    </body>
                  </html>
                `, {
                  headers: { 'Content-Type': 'text/html' }
                })
              }
              
              // Return generic offline response for other requests
              return new Response('Offline', { status: 503 })
            })
        })
    )
  }
})

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag)
  
  if (event.tag === 'sync-locations') {
    event.waitUntil(
      // Notify the app that connection is restored
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CONNECTION_RESTORED',
            timestamp: Date.now()
          })
        })
      })
    )
  }
})

// Push notifications (for future enhancement)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received')
  
  const options = {
    body: event.data ? event.data.text() : 'New location update available',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: 'location-update',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Locations'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('My Locations App', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  
  event.notification.close()

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window if no existing window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/')
        }
      })
    )
  }
})

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
})

console.log('[SW] Service worker script loaded')