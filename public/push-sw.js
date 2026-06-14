/* Push handlers, imported into the generated service worker (see vite.config workbox.importScripts).
   The push payload carries only an opaque { code } — the text is built here, on the device. */

var CICLO_TEXT = {
  period_tomorrow: { title: 'Ciclo 💜', body: 'Seu período deve começar amanhã. Que tal já se preparar?' },
  period_today: { title: 'Ciclo 🩸', body: 'Seu período pode começar hoje.' },
  fertile_start: { title: 'Ciclo 🌸', body: 'Sua janela fértil começa por volta de hoje.' },
  ovulation: { title: 'Ciclo ✨', body: 'Ovulação prevista para hoje.' },
  mood_heads_up: { title: 'Ciclo 🌙', body: 'Você está entrando numa fase em que pode se sentir mais sensível. Seja gentil com você.' },
  log_daily: { title: 'Ciclo 📝', body: 'Como você está hoje? Toque para registrar.' },
  teste: { title: 'Ciclo 💜', body: 'As notificações estão funcionando!' },
}

var CICLO_ICON = '/ciclo-app/icon-192.png'
var CICLO_URL = '/ciclo-app/'

self.addEventListener('push', function (event) {
  var payload = {}
  try { payload = event.data ? event.data.json() : {} } catch (e) { payload = {} }
  var tpl = (payload.code && CICLO_TEXT[payload.code]) || null
  var title = (tpl && tpl.title) || payload.title || 'Ciclo'
  var body = (tpl && tpl.body) || payload.body || ''
  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: CICLO_ICON,
      badge: CICLO_ICON,
      tag: payload.code || 'ciclo',
      data: { url: CICLO_URL },
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = (event.notification.data && event.notification.data.url) || CICLO_URL
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('/ciclo-app') !== -1 && 'focus' in list[i]) return list[i].focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
