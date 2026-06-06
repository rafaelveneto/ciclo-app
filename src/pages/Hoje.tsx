import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import { usePwaInstall } from '../hooks/usePwaInstall'
import PhaseTag from '../components/PhaseTag'
import IosInstallBanner from '../components/IosInstallBanner'

interface Props {
  onNavigate: (tab: 'registrar' | 'calendario') => void
}

const confidenceLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
const confidenceGradient = {
  baixa:  'linear-gradient(135deg, #fbbf24, #f97316)',
  media:  'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  alta:   'linear-gradient(135deg, #34d399, #22c55e)',
}

const fluxoLabels: Record<string, string> = {
  spotting: 'Manchas', leve: 'Leve', moderado: 'Moderado',
  intenso: 'Intenso', 'muito intenso': 'Muito intenso',
}

function HeaderArt() {
  return (
    <svg viewBox="0 0 360 90" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="h1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="33%" stopColor="#f97316" />
          <stop offset="66%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="h2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="h3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M -10 60 C 30 10, 70 80, 120 35 C 160 0, 190 75, 240 30 C 275 0, 310 55, 370 20"
        stroke="url(#h1)" strokeWidth="2" strokeLinecap="round" />
      <path d="M -10 75 C 40 30, 90 85, 150 45 C 200 15, 230 80, 290 45 C 320 28, 345 65, 380 40"
        stroke="url(#h2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M 30 85 C 80 55, 130 88, 200 60 C 250 38, 280 80, 360 55"
        stroke="url(#h3)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <circle cx="120" cy="35" r="2.5" fill="#22c55e" opacity="0.7" />
      <circle cx="240" cy="30" r="2" fill="#06b6d4" opacity="0.7" />
    </svg>
  )
}

export default function Hoje({ onNavigate }: Props) {
  const { prediction, avgCycleLen, lastPeriodStart } = useCycle()
  const { todayLog } = useDb()
  const { canInstall, isInstalled, isIosSafari, install } = usePwaInstall()

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="pb-4">
      {/* Header with line art */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-xs text-slate-400 capitalize mb-0.5">{todayFormatted}</p>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá! <span className="gradient-text">Bom dia</span>
        </h1>
      </div>

      <div className="-mt-2 mb-1">
        <HeaderArt />
      </div>

      <div className="px-4 space-y-3">
        {/* PWA install — Android/desktop */}
        {canInstall && !isInstalled && (
          <button
            onClick={install}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
          >
            <div className="flex items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 2v13M8 11l4 4 4-4" />
                <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
              </svg>
              <span>Instalar app no dispositivo</span>
            </div>
            <span className="opacity-70 text-xs">Grátis →</span>
          </button>
        )}

        {/* PWA install — iOS Safari */}
        {isIosSafari && !isInstalled && !canInstall && (
          <IosInstallBanner />
        )}

        {isInstalled && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-500 font-medium">App instalado no dispositivo</span>
          </div>
        )}

        {/* Phase card */}
        {prediction ? (
          <div className="gradient-border p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fase atual</p>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-white"
                style={{ background: confidenceGradient[prediction.confidence] }}
              >
                Confiança {confidenceLabel[prediction.confidence]}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <PhaseTag phase={prediction.currentPhase} />
              <span className="text-slate-400 text-sm">Dia {prediction.currentCycleDay} do ciclo</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Próximo período</p>
                <p className="font-bold text-slate-800 text-sm">
                  {prediction.daysUntilNext > 0
                    ? `em ${prediction.daysUntilNext} dias`
                    : prediction.daysUntilNext === 0
                    ? 'Hoje'
                    : `há ${Math.abs(prediction.daysUntilNext)} dias`}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(parseISO(prediction.nextPeriodStart), "d 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Ciclo médio</p>
                <p className="font-bold text-slate-800 text-sm">{avgCycleLen} dias</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lastPeriodStart
                    ? `início ${format(parseISO(lastPeriodStart), "d 'de' MMM", { locale: ptBR })}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="gradient-border p-5 text-center">
            <p className="text-slate-500 text-sm mb-3">
              Configure seu ciclo para ver previsões
            </p>
            <button
              onClick={() => onNavigate('registrar')}
              className="text-sm font-semibold gradient-text"
            >
              Configurar agora →
            </button>
          </div>
        )}

        {/* Fertile window */}
        {prediction && (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Janela fértil</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #34d399, #22d3ee)' }} />
                  <span className="text-sm text-slate-600">Período fértil</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {format(parseISO(prediction.fertileWindowStart), "d", { locale: ptBR })}–
                  {format(parseISO(prediction.fertileWindowEnd), "d 'de' MMM", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }} />
                  <span className="text-sm text-slate-600">Ovulação prevista</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {format(parseISO(prediction.predictedOvulation), "d 'de' MMM", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Today's log */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Registro de hoje</p>
            <button
              onClick={() => onNavigate('registrar')}
              className="text-xs font-semibold gradient-text"
            >
              {todayLog ? 'Editar' : 'Registrar'}
            </button>
          </div>

          {todayLog ? (
            <div className="space-y-2">
              {todayLog.fluxo?.intensidade && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-sm text-slate-600">Fluxo: {fluxoLabels[todayLog.fluxo.intensidade] ?? todayLog.fluxo.intensidade}</span>
                </div>
              )}
              {todayLog.sintomas && todayLog.sintomas.length > 0 && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5" />
                  <span className="text-sm text-slate-600">Sintomas: {todayLog.sintomas.join(', ')}</span>
                </div>
              )}
              {todayLog.humor && todayLog.humor.length > 0 && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5" />
                  <span className="text-sm text-slate-600">Humor: {todayLog.humor.join(', ')}</span>
                </div>
              )}
              {todayLog.tbc != null && (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-sm text-slate-600">TBC: {todayLog.tbc}°C</span>
                </div>
              )}
              {todayLog.notas && (
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
                  <span className="text-sm text-slate-600 line-clamp-2">{todayLog.notas}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 text-sm mb-4">Nenhum registro para hoje ainda</p>
              <button
                onClick={() => onNavigate('registrar')}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f97316, #8b5cf6)' }}
              >
                + Registrar agora
              </button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 text-center leading-relaxed px-2 pb-2">
          Este app é informativo e não substitui orientação médica. Consulte um profissional de saúde para decisões sobre saúde reprodutiva.
        </p>
      </div>
    </div>
  )
}
