import { useState } from 'react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useDevice } from '../hooks/useDevice'
import IosInstallBanner from './IosInstallBanner'

const SESSION_KEY = 'installNagDismissed'

/**
 * Insistent — but never blocking — install prompt for mobile/tablet visitors who
 * are still in the browser (not installed). It sits pinned at the top of the
 * scroll area so it's always in view, framed around protecting the user's data
 * (installed PWAs get durable storage; browser data can be evicted).
 *
 * "Win by persistence": dismissing only hides it for the current session — it
 * comes back the next time the app is opened.
 */
export default function InstallNag() {
  const { canInstall, isInstalled, isIos, install } = usePwaInstall()
  const { isDesktop, isStandalone } = useDevice()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  )
  const [showIosSteps, setShowIosSteps] = useState(false)

  // Never nag desktop, already-installed users, or within a dismissed session.
  if (isDesktop || isStandalone || isInstalled || dismissed) return null

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setDismissed(true)
  }

  const onInstallClick = () => {
    if (canInstall) install()
    else setShowIosSteps(true) // iOS (or any browser w/o native prompt) → show steps
  }

  return (
    <>
      <div className="sticky top-0 z-40 px-3 pt-3">
        <div className="relative flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
          {/* Pulsing app dot */}
          <div className="relative flex-shrink-0">
            <span className="absolute inline-flex h-9 w-9 rounded-xl bg-white/30 animate-ping" />
            <div className="relative w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17V3M7 8l5-5 5 5" transform="rotate(180 12 10)" />
                <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
              </svg>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">
              Instale o app gratuitamente
            </p>
            <p className="text-white/80 text-xs leading-tight mt-0.5">
              Para não perder seu histórico e usar offline
            </p>
          </div>

          <button
            onClick={onInstallClick}
            className="flex-shrink-0 bg-white text-violet-700 text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            {isIos ? 'Ver como' : 'Instalar'}
          </button>

          <button
            onClick={dismiss}
            className="flex-shrink-0 text-white/60 active:text-white -mr-1"
            aria-label="Agora não"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* iOS step-by-step sheet */}
      {showIosSteps && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4"
          onClick={() => setShowIosSteps(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <IosInstallBanner />
            <button
              onClick={() => setShowIosSteps(false)}
              className="w-full mt-2 py-3 rounded-2xl bg-white text-slate-500 text-sm font-medium shadow-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
