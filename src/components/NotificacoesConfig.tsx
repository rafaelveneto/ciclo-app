import { useState } from 'react'
import { useCycle } from '../hooks/useCycle'
import {
  getPrefs, setPrefs, permissionState, ensurePermission, getSubscription,
  buildReminders, runDueRemindersLocally, syncToServer, showTestNotification,
  PUSH_API, type NotifPrefs,
} from '../lib/notifications'

function Switch({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
      style={{ background: on ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#e2e8f0' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? 'translateX(20px)' : 'none' }} />
    </button>
  )
}

const subToggles: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: 'periodo', label: 'Período chegando', desc: 'Um dia antes e no dia previsto' },
  { key: 'fertil', label: 'Janela fértil e ovulação', desc: 'Quando o período fértil começa' },
  { key: 'humor', label: 'Humor e TPM', desc: 'Aviso gentil antes da fase lútea' },
  { key: 'registrar', label: 'Lembrete de registrar', desc: 'Para não esquecer de anotar o dia' },
]

export default function NotificacoesConfig() {
  const { prediction } = useCycle()
  const [prefs, setPrefsState] = useState<NotifPrefs>(getPrefs())
  const [perm, setPerm] = useState(permissionState())
  const [busy, setBusy] = useState(false)

  const persist = (p: NotifPrefs) => { setPrefs(p); setPrefsState(p) }

  const resync = (p: NotifPrefs) => {
    if (!prediction) return
    const reminders = buildReminders({
      prefs: p,
      nextPeriodStart: prediction.nextPeriodStart,
      fertileStart: prediction.fertileWindowStart,
      ovulation: prediction.predictedOvulation,
      lutealStart: prediction.lutealStart,
    })
    runDueRemindersLocally(reminders)
    getSubscription().then((sub) => syncToServer(sub, reminders))
  }

  const enable = async () => {
    setBusy(true)
    const ok = await ensurePermission()
    setPerm(permissionState())
    if (ok) {
      await getSubscription() // subscribe (ready for push when the server is set)
      const p = { ...prefs, enabled: true }
      persist(p)
      resync(p)
    }
    setBusy(false)
  }

  const disable = () => persist({ ...prefs, enabled: false })

  const toggleSub = (key: keyof NotifPrefs) => {
    const p = { ...prefs, [key]: !prefs[key] }
    persist(p)
    resync(p)
  }

  if (perm === 'unsupported') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Notificações</h2>
        <p className="text-sm text-slate-500">Seu navegador não suporta notificações. Instale o app para ativá-las.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Notificações</h2>

      <div className="flex items-center justify-between">
        <div className="pr-3">
          <p className="text-sm font-semibold text-slate-800">Ativar lembretes</p>
          <p className="text-xs text-slate-400 mt-0.5">Avisos nos momentos importantes do seu ciclo</p>
        </div>
        <Switch on={prefs.enabled && perm === 'granted'} disabled={busy}
          onClick={() => (prefs.enabled ? disable() : enable())} />
      </div>

      {perm === 'denied' && (
        <p className="text-xs text-orange-500 mt-3 leading-relaxed">
          As notificações foram bloqueadas. Habilite nas configurações do navegador/sistema para este app.
        </p>
      )}

      {prefs.enabled && perm === 'granted' && (
        <div className="mt-4 space-y-3">
          {subToggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between">
              <div className="pr-3">
                <p className="text-sm text-slate-700">{t.label}</p>
                <p className="text-xs text-slate-400">{t.desc}</p>
              </div>
              <Switch on={!!prefs[t.key]} onClick={() => toggleSub(t.key)} />
            </div>
          ))}

          <button onClick={showTestNotification}
            className="w-full mt-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50">
            Enviar notificação de teste
          </button>

          {!PUSH_API && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Por enquanto os avisos aparecem quando você abre o app. Para recebê-los com o app fechado,
              falta configurar o servidor de envio (veja as instruções).
            </p>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed">
            No iPhone, as notificações só funcionam com o app instalado na tela de início.
          </p>
        </div>
      )}
    </div>
  )
}
