import { useState } from 'react'
import { setSetting } from '../db/database'
import { format } from 'date-fns'

interface Props {
  onComplete: () => void
}

const modos = [
  { value: 'geral',         label: 'Acompanhamento geral',        desc: 'Quero conhecer melhor meu ciclo' },
  { value: 'ttc',           label: 'Tentando engravidar',         desc: 'Identificar os dias mais férteis' },
  { value: 'evitando',      label: 'Evitando gravidez',           desc: 'Percepção de fertilidade natural' },
  { value: 'gestacao',      label: 'Gestação',                    desc: 'Acompanhar a gravidez' },
  { value: 'perimenopausa', label: 'Perimenopausa / Menopausa',   desc: 'Transição hormonal' },
]

function HeaderArt() {
  return (
    <svg viewBox="0 0 320 120" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ob1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="75%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="ob2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="ob3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Main flowing curve */}
      <path d="M -10 80 C 40 20, 80 100, 130 50 C 180 0, 200 90, 260 40 C 300 10, 330 60, 350 30"
        stroke="url(#ob1)" strokeWidth="2" strokeLinecap="round" />
      {/* Secondary curve */}
      <path d="M -10 100 C 50 50, 100 110, 160 60 C 210 20, 240 100, 310 55 C 330 45, 340 70, 350 60"
        stroke="url(#ob2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* Tertiary curve */}
      <path d="M 20 110 C 70 70, 120 115, 180 75 C 230 40, 260 105, 330 70"
        stroke="url(#ob3)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Small accent dots */}
      <circle cx="130" cy="50" r="3" fill="#22c55e" opacity="0.6" />
      <circle cx="260" cy="40" r="2" fill="#8b5cf6" opacity="0.6" />
      <circle cx="80" cy="68" r="2" fill="#f97316" opacity="0.5" />
    </svg>
  )
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [nome, setNome] = useState('')
  const [ultimoPeriodo, setUltimoPeriodo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [comprimentoCiclo, setComprimentoCiclo] = useState('28')
  const [modo, setModo] = useState('geral')
  const [saving, setSaving] = useState(false)

  const handleFinish = async () => {
    setSaving(true)
    await setSetting('nome', nome.trim())
    await setSetting('ultimoPeriodo', ultimoPeriodo)
    await setSetting('comprimentoCiclo', comprimentoCiclo)
    await setSetting('modo', modo)
    await setSetting('onboardingDone', 'true')
    setSaving(false)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Progress */}
        <div className="flex gap-2 mb-6 justify-center">
          {[1, 2, 3].map((s) => (
            <div key={s} className="relative overflow-hidden rounded-full" style={{ height: 3, width: s <= step ? 32 : 16 }}>
              <div className="absolute inset-0" style={{
                background: s <= step
                  ? 'linear-gradient(90deg, #ef4444, #f97316, #8b5cf6)'
                  : '#e2e8f0',
                transition: 'all 0.3s'
              }} />
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div className="mb-4 -mx-2">
              <HeaderArt />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Bem-vinda ao <span className="gradient-text">Ciclo</span>
            </h1>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Acompanhe seu ciclo menstrual com privacidade e profundidade.
            </p>

            <div className="gradient-border p-5 mb-8">
              <div className="flex items-start gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#lockgrad)" strokeWidth="1.5" strokeLinecap="round">
                  <defs>
                    <linearGradient id="lockgrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Privacidade total</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Seus dados <strong className="text-slate-700">nunca saem do seu dispositivo</strong>.
                    Armazenamento local, sem contas, sem servidores, sem rastreamento.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-base"
              style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #8b5cf6)' }}
            >
              Começar
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Sobre você</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Para deixar o app com a sua cara e calcular suas previsões.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Como podemos te chamar? <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={40}
                  autoComplete="given-name"
                  placeholder="Seu nome ou apelido"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Início do último período
                </label>
                <input
                  type="date"
                  value={ultimoPeriodo}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setUltimoPeriodo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comprimento médio do ciclo
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="21"
                    max="45"
                    value={comprimentoCiclo}
                    onChange={(e) => setComprimentoCiclo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  />
                  <span className="text-slate-400 text-sm whitespace-nowrap">dias</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">A maioria dos ciclos dura entre 21–35 dias</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!nome.trim() || !ultimoPeriodo || !comprimentoCiclo}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #22c55e, #06b6d4, #8b5cf6)' }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Como você usa o app?</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Personaliza os insights exibidos para você.
            </p>

            <div className="space-y-2.5">
              {modos.map((m, i) => {
                const gradients = [
                  'linear-gradient(135deg, #ef4444, #f97316)',
                  'linear-gradient(135deg, #22c55e, #34d399)',
                  'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                  'linear-gradient(135deg, #f97316, #eab308)',
                ]
                const isSelected = modo === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setModo(m.value)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-transparent bg-slate-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                    style={isSelected ? { boxShadow: `0 0 0 2px transparent`, outline: `2px solid transparent` } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: isSelected ? gradients[i] : '#e2e8f0' }}
                      />
                      <div>
                        <p className={`font-medium text-sm ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {m.label}
                        </p>
                        <p className="text-xs text-slate-400">{m.desc}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #8b5cf6, #ec4899)' }}
              >
                {saving ? 'Salvando...' : 'Começar a usar'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
