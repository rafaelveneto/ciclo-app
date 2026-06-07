import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/database'
import Layout, { type Tab } from './components/Layout'
import Onboarding from './pages/Onboarding'
import Hoje from './pages/Hoje'
import Calendario from './pages/Calendario'
import Registrar from './pages/Registrar'
import Insights from './pages/Insights'
import Ajustes from './pages/Ajustes'
import DesktopGate from './components/DesktopGate'
import { useDevice } from './hooks/useDevice'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('hoje')
  const { isDesktop, isStandalone } = useDevice()

  // Check if onboarding is done
  const onboardingDone = useLiveQuery(async () => {
    const s = await db.settings.where('chave').equals('onboardingDone').first()
    return s?.valor === 'true'
  }, [])

  // The app is mobile-first: desktop-browser visitors get a QR screen to install
  // on their phone. An installed desktop PWA (standalone) still gets the full app.
  // (Hooks above must run unconditionally before this early return.)
  if (isDesktop && !isStandalone) {
    return <DesktopGate />
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
    return <Onboarding onComplete={() => window.location.reload()} />
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'hoje' && (
        <Hoje onNavigate={(tab) => setActiveTab(tab)} />
      )}
      {activeTab === 'calendario' && <Calendario />}
      {activeTab === 'registrar' && <Registrar />}
      {activeTab === 'insights' && <Insights />}
      {activeTab === 'ajustes' && <Ajustes />}
    </Layout>
  )
}
