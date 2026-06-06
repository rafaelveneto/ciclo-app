type Tab = 'hoje' | 'calendario' | 'registrar' | 'insights' | 'ajustes'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
}

function IconHoje({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#grad)' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconCalendario({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#grad2)' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="8" cy="15" r="1" fill={active ? '#f97316' : '#94a3b8'} stroke="none" />
      <circle cx="12" cy="15" r="1" fill={active ? '#8b5cf6' : '#94a3b8'} stroke="none" />
      <circle cx="16" cy="15" r="1" fill={active ? '#22c55e' : '#94a3b8'} stroke="none" />
    </svg>
  )
}

function IconRegistrar({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#grad3)' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <path d="M12 5H9C7.9 5 7 5.9 7 7v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3z" />
      <path d="M12 5V3" />
      <path d="M10 12h4M10 15h4M10 9h4" />
    </svg>
  )
}

function IconInsights({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#grad4)' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconAjustes({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#grad5)' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ active: boolean }> }[] = [
  { id: 'hoje',      label: 'Hoje',       Icon: IconHoje },
  { id: 'calendario',label: 'Calendário', Icon: IconCalendario },
  { id: 'registrar', label: 'Registrar',  Icon: IconRegistrar },
  { id: 'insights',  label: 'Insights',   Icon: IconInsights },
  { id: 'ajustes',   label: 'Ajustes',    Icon: IconAjustes },
]

export default function Layout({ activeTab, onTabChange, children }: Props) {
  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 z-50">
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex-1 flex flex-col items-center py-2.5 gap-1 transition-all relative"
              >
                {isActive && (
                  <div
                    className="absolute top-0 left-2 right-2 h-0.5 rounded-b"
                    style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #8b5cf6, #ec4899)' }}
                  />
                )}
                <tab.Icon active={isActive} />
                <span className={`text-[10px] font-medium ${isActive ? 'gradient-text' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export type { Tab }
