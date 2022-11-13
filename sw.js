const CACHE_NAME = "cook-0009";

// Adding the offline page when installing the service worker
self.addEventListener('install', e => {
	// Wait until promise is finished , Until it get rid of the service worker
	e.waitUntil(
		caches.open(CACHE_NAME)
		.then(cache => cache.addAll([
		'/' ,
		'/index.html'
		]))
		.then(() => self.skipWaiting())
	)
});

// Call Activate Event
self.addEventListener('activate', e => {
	console.log('Service Worker - Activated')
	e.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(
					cache => {
						if (cache !== CACHE_NAME) {
							console.log('Service Worker: Clearing Old Cache');
							return caches.delete(cache);
						}
					}
				)
			)
		})
	);
});

// Call Fetch Event 
const offlineHTML = `<h1>You're offline!</h1>`;

self.addEventListener('fetch', (e) => {
	console.log(e.request.url);
	e.respondWith(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.match(e.request).then((response) => {
				return response || fetch(e.request).then((response) => {
					if (response.status === 200 && !e.request.url.includes('.txt') && !e.request.url.includes('content/')) {
						cache.put(e.request, response.clone());
					}
					return response;
				}).catch(() => {
					return new Response(offlineHTML, {
						headers: {
							'Content-Type': 'text/html;charset=utf-8'
						}
					});
				});
			});
		})
	);
});
