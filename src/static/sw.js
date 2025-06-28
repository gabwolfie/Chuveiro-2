const CACHE_NAME = 'chuveiro-app-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Buscar recursos
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna resposta
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Notificações Push
self.addEventListener('push', event => {
  let options = {
    body: 'Nova notificação do chuveiro',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    persistent: true,
    tag: 'chuveiro-notification',
    renotify: true,
    actions: [
      {
        action: 'view',
        title: 'Ver App',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192.png'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || data.message || options.body;
      options.title = data.title || '🚿 Chuveiro';
      options.tag = data.tag || options.tag;
      
      // Configurações específicas por tipo de notificação
      if (data.type === 'shower_start') {
        options.icon = '/icon-512.png';
        options.vibrate = [200, 100, 200];
      } else if (data.type === 'shower_end') {
        options.icon = '/icon-512.png';
        options.vibrate = [300, 100, 300, 100, 300];
      }
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification('🚿 Chuveiro', options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    // Abrir ou focar na janela do app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Verificar se já existe uma janela aberta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não existe, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  } else if (event.action === 'close') {
    // Apenas fechar a notificação
    event.notification.close();
  } else {
    // Clique padrão na notificação - abrir app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

