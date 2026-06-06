type Tab = 'hoje' | 'calendario' | 'registrar' | 'insights' | 'ajustes'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'hoje', label: 'Hoje', icon: '🌸' },
  { id: 'calendario', label: 'Calendário', icon: '📅' },
  { id: 'registrar', label: 'Registrar', icon: '✏️' },
  { id: 'insights', label: 'Insights', icon: '📊' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
]

export default function Layout({ activeTab, onTabChange, children }: Props) {
  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto relative">
      {/* Content area */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                  isActive ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className={`text-xs font-medium ${isActive ? 'text-rose-500' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-rose-500 rounded-b-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export type { Tab }
