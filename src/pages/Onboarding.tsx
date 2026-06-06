import { useState } from 'react'
import { setSetting } from '../db/database'
import { format } from 'date-fns'

interface Props {
  onComplete: () => void
}

const modos = [
  { value: 'geral', label: 'Acompanhamento geral' },
  { value: 'ttc', label: 'Tentando engravidar (TTC)' },
  { value: 'evitando', label: 'Evitando gravidez' },
  { value: 'gestacao', label: 'Gestação' },
  { value: 'perimenopausa', label: 'Perimenopausa / Menopausa' },
]

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [ultimoPeriodo, setUltimoPeriodo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [comprimentoCiclo, setComprimentoCiclo] = useState('28')
  const [modo, setModo] = useState('geral')
  const [saving, setSaving] = useState(false)

  const handleFinish = async () => {
    setSaving(true)
    await setSetting('ultimoPeriodo', ultimoPeriodo)
    await setSetting('comprimentoCiclo', comprimentoCiclo)
    await setSetting('modo', modo)
    await setSetting('onboardingDone', 'true')
    setSaving(false)
    onComplete()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8 justify-center">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-rose-500 w-8' : 'bg-rose-200 w-4'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <div className="text-6xl mb-6">🌸</div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">Bem-vinda ao Ciclo</h1>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Seu assistente de acompanhamento menstrual, simples e privado.
            </p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100 mb-8 text-left">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Privacidade total</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Seus dados <strong>nunca saem do seu dispositivo</strong>. Tudo é armazenado
                    localmente no seu navegador. Sem contas, sem servidores, sem rastreamento.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-rose-500 text-white py-3 rounded-xl font-semibold text-lg hover:bg-rose-600 transition-colors"
            >
              Começar
            </button>
          </div>
        )}

        {/* Step 2: Period info */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Seu ciclo</h2>
            <p className="text-slate-500 mb-6">
              Essas informações nos ajudam a fazer previsões precisas para você.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Quando foi o início do seu último período?
                </label>
                <input
                  type="date"
                  value={ultimoPeriodo}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setUltimoPeriodo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comprimento médio do seu ciclo (dias)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="21"
                    max="45"
                    value={comprimentoCiclo}
                    onChange={(e) => setComprimentoCiclo(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <span className="text-slate-500 text-sm whitespace-nowrap">dias</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">A maioria dos ciclos dura entre 21–35 dias</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!ultimoPeriodo || !comprimentoCiclo}
                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Mode selection */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Como você usa o app?</h2>
            <p className="text-slate-500 mb-6">
              Isso personaliza as informações exibidas para você.
            </p>

            <div className="space-y-3">
              {modos.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModo(m.value)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors ${
                    modo === m.value
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200'
                  }`}
                >
                  <span className="font-medium">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
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
