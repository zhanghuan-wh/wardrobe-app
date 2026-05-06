// Service Worker - 自清理版本
// 清除所有旧缓存后自行卸载，避免缓存旧版本页面导致 startApp 找不到的问题

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.registration.unregister();
    })
  );
});
