import { QRCodeSVG } from 'qrcode.react'

/**
 * Shown only to desktop-browser visitors. The app is mobile-first, so instead of
 * a cramped phone-in-the-middle-of-a-monitor experience, we show a clean screen
 * with a QR code that opens the app on the phone — where it can be installed.
 */
export default function DesktopGate() {
  const appUrl = window.location.origin + import.meta.env.BASE_URL
  const iconUrl = import.meta.env.BASE_URL + 'icon-512.png'

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 45%, #eff6ff 100%)' }}>
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

        {/* Left: pitch */}
        <div className="text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start mb-6">
            <img src={iconUrl} alt="Ciclo" className="w-12 h-12 rounded-2xl shadow-md" />
            <span className="text-2xl font-bold text-slate-900">Ciclo</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
            Seu ciclo, <span className="gradient-text">no seu bolso</span>
          </h1>
          <p className="text-slate-500 text-base leading-relaxed mb-6 max-w-md mx-auto md:mx-0">
            O Ciclo foi feito para o celular — para registrar e acompanhar onde
            você estiver. Aponte a câmera para o código ao lado e instale em segundos.
          </p>

          <div className="space-y-3 max-w-md mx-auto md:mx-0">
            <Feature text="Previsões que aprendem com o seu corpo" />
            <Feature text="Funciona offline, como um app de verdade" />
            <Feature text="Seus dados ficam só no seu aparelho — nada vai para a nuvem" />
          </div>
        </div>

        {/* Right: QR card */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center"
            style={{ boxShadow: '0 20px 60px -15px rgba(139,92,246,0.25)' }}>
            <div className="gradient-border p-4 rounded-2xl mb-5">
              <QRCodeSVG
                value={appUrl}
                size={196}
                level="M"
                marginSize={0}
                bgColor="#ffffff"
                fgColor="#1e293b"
              />
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <circle cx="12" cy="12" r="3" />
                <path d="M9 4 10 2h4l1 2" />
              </svg>
              <span className="text-sm font-semibold">Aponte a câmera do celular</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Abre no seu telefone e instala em 1 toque
            </p>
          </div>

          <p className="text-xs text-slate-400 mt-5 text-center break-all max-w-xs">
            ou acesse <span className="text-slate-500 font-medium">{appUrl.replace(/^https?:\/\//, '')}</span> no celular
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(135deg, #34d399, #22d3ee)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="text-sm text-slate-600 text-left">{text}</span>
    </div>
  )
}
