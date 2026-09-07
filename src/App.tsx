import { useState, lazy, Suspense } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/database'
import Layout, { type Tab } from './components/Layout'
import Hoje from './pages/Hoje'
import NotificationRunner from './components/NotificationRunner'
import { useDevice } from './hooks/useDevice'

// Non-landing tabs are code-split so heavy deps (recharts in Insights, the
// calendar, the long Registrar form) don't weigh on the first paint.
const Calendario = lazy(() => import('./pages/Calendario'))
const Registrar = lazy(() => import('./pages/Registrar'))
const Insights = lazy(() => import('./pages/Insights'))
const Ajustes = lazy(() => import('./pages/Ajustes'))
// Shown at most once per device: the desktop QR gate (carries the QR library) and
// onboarding. Keeping them out of the entry chunk speeds up every normal open.
const DesktopGate = lazy(() => import('./components/DesktopGate'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-7 h-7 rounded-full animate-spin"
        style={{ background: 'conic-gradient(from 0deg, #ef4444, #8b5cf6, #ec4899, #ef4444)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)' }} />
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('hoje')
  const [registrarDate, setRegistrarDate] = useState<string | undefined>(undefined)
  const { isDesktop, isStandalone } = useDevice()

  // Central navigation. Opening Registrar with a date pre-selects that day
  // (e.g. from the calendar); without one it defaults to today.
  const navigate = (tab: Tab, date?: string) => {
    if (tab === 'registrar') setRegistrarDate(date)
    setActiveTab(tab)
  }

  // Check if onboarding is done
  const onboardingDone = useLiveQuery(async () => {
    const s = await db.settings.where('chave').equals('onboardingDone').first()
    return s?.valor === 'true'
  }, [])

  // The app is mobile-first: desktop-browser visitors get a QR screen to install
  // on their phone. An installed desktop PWA (standalone) still gets the full app.
  // (Hooks above must run unconditionally before this early return.)
  if (isDesktop && !isStandalone) {
    return <Suspense fallback={<Spinner />}><DesktopGate /></Suspense>
  }

  // onboardingDone is undefined while loading, false if not done, true if done
  if (onboardingDone === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'transparent', borderTopColor: 'transparent',
            background: 'conic-gradient(from 0deg, #ef4444, #8b5cf6, #ec4899, #ef4444)',
            borderRadius: '50%', padding: 2 }} />
      </div>
    )
  }

  if (!onboardingDone) {
    return (
      <Suspense fallback={<Spinner />}>
        <Onboarding onComplete={() => window.location.reload()} />
      </Suspense>
    )
  }

  return (
    <Layout activeTab={activeTab} onTabChange={(tab) => navigate(tab)}>
      <NotificationRunner />
      {activeTab === 'hoje' && (
        <Hoje onNavigate={(tab) => navigate(tab)} />
      )}
      <Suspense fallback={<Spinner />}>
        {activeTab === 'calendario' && <Calendario onLogDay={(date) => navigate('registrar', date)} />}
        {activeTab === 'registrar' && <Registrar initialDate={registrarDate} />}
        {activeTab === 'insights' && <Insights />}
        {activeTab === 'ajustes' && <Ajustes />}
      </Suspense>
    </Layout>
  )
}
