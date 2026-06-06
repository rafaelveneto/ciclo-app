import { useState } from 'react'

export default function IosInstallBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
    }}>
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/60 hover:text-white"
        aria-label="Fechar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="px-4 pt-4 pb-5">
        <p className="text-white font-bold text-sm mb-1">Instalar no iPhone / iPad</p>
        <p className="text-white/80 text-xs mb-4 leading-relaxed">
          No Safari, siga os passos abaixo para adicionar à sua tela de início:
        </p>

        <div className="space-y-2.5">
          {/* Step 1 */}
          <div className="flex items-center gap-3 bg-white/15 rounded-xl px-3 py-2.5">
            <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-white text-xs">Toque no botão</span>
              {/* Share icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span className="text-white text-xs font-semibold">Compartilhar</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-3 bg-white/15 rounded-xl px-3 py-2.5">
            <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-white text-xs">Role e toque em</span>
              {/* Plus square icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span className="text-white text-xs font-semibold">Adicionar à Tela de Início</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-3 bg-white/15 rounded-xl px-3 py-2.5">
            <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <span className="text-white text-xs">Toque em <strong>Adicionar</strong> no canto superior direito</span>
          </div>
        </div>

        <p className="text-white/60 text-xs mt-3 text-center">
          Funciona 100% offline após instalar
        </p>
      </div>
    </div>
  )
}
