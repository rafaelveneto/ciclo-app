/**
 * Notifications — device side.
 *
 * Privacy model: the device computes the schedule locally and sends the push
 * server only opaque { timestamp, code } pairs — never cycle dates or moods. The
 * service worker (and the local fallback) turn a `code` into text using the static
 * templates below, so no health data ever leaves the phone.
 *
 * Without the Cloudflare Worker configured (PUSH_API empty), reminders still work
 * as a LOCAL fallback: when the app is opened, any due reminder is shown.
 */

export const VAPID_PUBLIC_KEY =
  'BBMcgitsg2wGUfmFfwIWQInRI_MVHPMEypVJBWb_adQVWZLWNpMEjb2E52W6Ivbjpnu7DKWSPTrZaQS4kEv-J20'

// Set to your deployed Worker URL to enable real push (e.g. https://ciclo-push.<sub>.workers.dev)
export const PUSH_API = ''

const ICON = import.meta.env.BASE_URL + 'icon-192.png'
const APP_URL = import.meta.env.BASE_URL

export type ReminderCode =
  | 'period_tomorrow'
  | 'period_today'
  | 'fertile_start'
  | 'ovulation'
  | 'mood_heads_up'
  | 'log_daily'

export interface Reminder {
  at: string // ISO datetime
  code: ReminderCode
}

// Generic, supportive templates — no specific health data (privacy).
export const REMINDER_TEXT: Record<ReminderCode, { title: string; body: string }> = {
  period_tomorrow: { title: 'Ciclo 💜', body: 'Seu período deve começar amanhã. Que tal já se preparar?' },
  period_today: { title: 'Ciclo 🩸', body: 'Seu período pode começar hoje.' },
  fertile_start: { title: 'Ciclo 🌸', body: 'Sua janela fértil começa por volta de hoje.' },
  ovulation: { title: 'Ciclo ✨', body: 'Ovulação prevista para hoje.' },
  mood_heads_up: { title: 'Ciclo 🌙', body: 'Você está entrando numa fase em que pode se sentir mais sensível. Seja gentil com você.' },
  log_daily: { title: 'Ciclo 📝', body: 'Como você está hoje? Toque para registrar.' },
}

export interface NotifPrefs {
  enabled: boolean
  periodo: boolean
  fertil: boolean
  humor: boolean
  registrar: boolean
}
const DEFAULT_PREFS: NotifPrefs = { enabled: false, periodo: true, fertil: true, humor: true, registrar: false }
const PREFS_KEY = 'notifPrefs'

export function getPrefs(): NotifPrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}
export function setPrefs(p: NotifPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p))
}

export type PermState = NotificationPermission | 'unsupported'
export function permissionState(): PermState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  if (!('pushManager' in reg)) return null
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    } catch {
      return null
    }
  }
  return sub
}

function isoAt(dateStr: string, hour = 8): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Builds upcoming reminders from the current prediction + preferences. */
export function buildReminders(opts: {
  prefs: NotifPrefs
  nextPeriodStart: string | null
  fertileStart: string | null
  ovulation: string | null
  lutealStart: string | null
}): Reminder[] {
  const { prefs, nextPeriodStart, fertileStart, ovulation, lutealStart } = opts
  const out: Reminder[] = []

  if (prefs.periodo && nextPeriodStart) {
    const d = new Date(nextPeriodStart + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    out.push({ at: isoAt(toISODate(d)), code: 'period_tomorrow' })
    out.push({ at: isoAt(nextPeriodStart), code: 'period_today' })
  }
  if (prefs.fertil && fertileStart) out.push({ at: isoAt(fertileStart), code: 'fertile_start' })
  if (prefs.fertil && ovulation) out.push({ at: isoAt(ovulation), code: 'ovulation' })
  if (prefs.humor && lutealStart) {
    const d = new Date(lutealStart + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    out.push({ at: isoAt(toISODate(d)), code: 'mood_heads_up' })
  }

  const cutoff = Date.now() - 12 * 3600 * 1000
  return out.filter((r) => new Date(r.at).getTime() > cutoff)
}

/** Local fallback: on app open, show any due reminder not already shown. */
export async function runDueRemindersLocally(reminders: Reminder[]): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const shown: Record<string, number> = JSON.parse(localStorage.getItem('notifShown') || '{}')
  const now = Date.now()
  for (const r of reminders) {
    const t = new Date(r.at).getTime()
    const id = `${r.code}@${r.at.slice(0, 10)}`
    if (t <= now && now - t < 18 * 3600 * 1000 && !shown[id]) {
      const text = REMINDER_TEXT[r.code]
      await reg.showNotification(text.title, {
        body: text.body, icon: ICON, badge: ICON, tag: r.code, data: { url: APP_URL },
      })
      shown[id] = now
    }
  }
  localStorage.setItem('notifShown', JSON.stringify(shown))
}

/** Sends the subscription + opaque schedule to the Worker (no-op until configured). */
export async function syncToServer(sub: PushSubscription | null, reminders: Reminder[]): Promise<boolean> {
  if (!PUSH_API || !sub) return false
  try {
    const res = await fetch(`${PUSH_API}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub, reminders }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Show a one-off test notification (used by the settings screen). */
export async function showTestNotification(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Ciclo 💜', {
    body: 'As notificações estão funcionando! Você será avisada nos momentos importantes.',
    icon: ICON, badge: ICON, tag: 'teste', data: { url: APP_URL },
  })
}
