/**
 * Ciclo — push "alarm clock" Worker.
 *
 * Privacy by design: the device sends only { subscription, reminders:[{at, code}] }.
 * No cycle dates, no moods. This Worker just stores the schedule and, on a cron,
 * fires a push with the opaque { code }; the app's service worker turns the code
 * into text on the device.
 *
 * Endpoints:
 *   POST /schedule   body: { subscription, reminders:[{at, code}] }  → stores it
 *   GET  /           health check
 * Cron: every 15 min → sends any due reminder.
 */
import webpush from 'web-push'

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
})

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  })
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*'
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) })

    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/schedule') {
      let body
      try { body = await request.json() } catch { return json({ error: 'bad json' }, 400, origin) }
      const { subscription, reminders } = body || {}
      if (!subscription || !subscription.endpoint) return json({ error: 'no subscription' }, 400, origin)
      const key = 'sub:' + (await sha256(subscription.endpoint))
      await env.SCHEDULES.put(
        key,
        JSON.stringify({ subscription, reminders: Array.isArray(reminders) ? reminders : [] }),
      )
      return json({ ok: true }, 200, origin)
    }
    return new Response('Ciclo push worker — ok', { headers: cors(origin) })
  },

  async scheduled(_event, env) {
    webpush.setVapidDetails(env.CONTACT_EMAIL, env.VAPID_PUBLIC, env.VAPID_PRIVATE)
    const now = Date.now()
    const list = await env.SCHEDULES.list({ prefix: 'sub:' })

    for (const k of list.keys) {
      const raw = await env.SCHEDULES.get(k.name)
      if (!raw) continue
      const rec = JSON.parse(raw)
      const future = []
      let dead = false

      for (const r of rec.reminders || []) {
        const t = new Date(r.at).getTime()
        if (t > now) {
          future.push(r) // not due yet — keep
        } else if (now - t < 6 * 3600 * 1000) {
          // due within the last 6h → send once (then it's dropped from the list)
          try {
            await webpush.sendNotification(rec.subscription, JSON.stringify({ code: r.code }))
          } catch (e) {
            if (e && (e.statusCode === 404 || e.statusCode === 410)) { dead = true; break }
          }
        }
        // older than 6h and unsent → dropped silently
      }

      if (dead) await env.SCHEDULES.delete(k.name)
      else { rec.reminders = future; await env.SCHEDULES.put(k.name, JSON.stringify(rec)) }
    }
  },
}
