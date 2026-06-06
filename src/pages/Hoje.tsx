import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import PhaseTag from '../components/PhaseTag'

interface Props {
  onNavigate: (tab: 'registrar' | 'calendario') => void
}

const confidenceLabel = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
const confidenceColor = {
  baixa: 'text-amber-600 bg-amber-50',
  media: 'text-sky-600 bg-sky-50',
  alta: 'text-emerald-600 bg-emerald-50',
}

const fluxoLabels: Record<string, string> = {
  spotting: 'Manchas',
  leve: 'Leve',
  moderado: 'Moderado',
  intenso: 'Intenso',
  'muito intenso': 'Muito intenso',
}

export default function Hoje({ onNavigate }: Props) {
  const { prediction, avgCycleLen, lastPeriodStart } = useCycle()
  const { todayLog } = useDb()

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-400 capitalize">{todayFormatted}</p>
        <h1 className="text-2xl font-bold text-slate-800">Olá! 👋</h1>
      </div>

      {/* Phase card */}
      {prediction ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Fase atual
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor[prediction.confidence]}`}
            >
              Confiança {confidenceLabel[prediction.confidence]}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <PhaseTag phase={prediction.currentPhase} />
            <span className="text-slate-500 text-sm">Dia {prediction.currentCycleDay} do ciclo</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Próximo período</p>
              <p className="font-semibold text-slate-800 text-sm">
                {prediction.daysUntilNext > 0
                  ? `em ${prediction.daysUntilNext} dias`
                  : prediction.daysUntilNext === 0
                  ? 'Hoje'
                  : `há ${Math.abs(prediction.daysUntilNext)} dias`}
              </p>
              <p className="text-xs text-slate-400">
                {format(parseISO(prediction.nextPeriodStart), "d 'de' MMM", { locale: ptBR })}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Ciclo médio</p>
              <p className="font-semibold text-slate-800 text-sm">{avgCycleLen} dias</p>
              <p className="text-xs text-slate-400">
                Início: {lastPeriodStart
                  ? format(parseISO(lastPeriodStart), "d 'de' MMM", { locale: ptBR })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100 text-center">
          <p className="text-slate-500 text-sm mb-3">
            Configure seu ciclo nos ajustes para ver previsões
          </p>
          <button
            onClick={() => onNavigate('registrar')}
            className="text-rose-500 font-medium text-sm"
          >
            Ir para Ajustes →
          </button>
        </div>
      )}

      {/* Fertile window */}
      {prediction && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Janela fértil
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="text-sm text-slate-600">Período fértil</span>
              </div>
              <span className="text-sm font-medium text-slate-800">
                {format(parseISO(prediction.fertileWindowStart), "d", { locale: ptBR })}–
                {format(parseISO(prediction.fertileWindowEnd), "d 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-600">Ovulação prevista</span>
              </div>
              <span className="text-sm font-medium text-slate-800">
                {format(parseISO(prediction.predictedOvulation), "d 'de' MMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Today's log summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Registro de hoje
          </h2>
          <button
            onClick={() => onNavigate('registrar')}
            className="text-rose-500 text-sm font-medium"
          >
            {todayLog ? 'Editar' : 'Registrar'}
          </button>
        </div>

        {todayLog ? (
          <div className="space-y-2">
            {todayLog.fluxo?.intensidade && (
              <div className="flex items-center gap-2">
                <span className="text-rose-400">🩸</span>
                <span className="text-sm text-slate-600">
                  Fluxo: {fluxoLabels[todayLog.fluxo.intensidade] ?? todayLog.fluxo.intensidade}
                </span>
              </div>
            )}
            {todayLog.sintomas && todayLog.sintomas.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">💊</span>
                <span className="text-sm text-slate-600">
                  Sintomas: {todayLog.sintomas.join(', ')}
                </span>
              </div>
            )}
            {todayLog.humor && todayLog.humor.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">💭</span>
                <span className="text-sm text-slate-600">
                  Humor: {todayLog.humor.join(', ')}
                </span>
              </div>
            )}
            {todayLog.tbc != null && (
              <div className="flex items-center gap-2">
                <span className="text-rose-400">🌡️</span>
                <span className="text-sm text-slate-600">TBC: {todayLog.tbc}°C</span>
              </div>
            )}
            {todayLog.notas && (
              <div className="flex items-start gap-2">
                <span className="text-rose-400 mt-0.5">📝</span>
                <span className="text-sm text-slate-600 line-clamp-2">{todayLog.notas}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-slate-400 text-sm mb-3">Nenhum registro para hoje ainda</p>
            <button
              onClick={() => onNavigate('registrar')}
              className="bg-rose-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-rose-600 transition-colors"
            >
              + Registrar agora
            </button>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center leading-relaxed px-2 pb-2">
        ⚕️ Este app é apenas informativo e não substitui orientação médica profissional. Consulte
        sempre um profissional de saúde para decisões sobre saúde reprodutiva.
      </p>
    </div>
  )
}
