import { useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import { upsertDailyLog } from '../db/database'
import PhaseTag from '../components/PhaseTag'
import { phaseInfo } from '../lib/phaseInfo'
import { cycleVariability } from '../lib/cycleCalc'
import OQueEsperarHoje from '../components/OQueEsperarHoje'
import RegistrarPeriodo from '../components/RegistrarPeriodo'

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
  const { prediction, avgCycleLen, avgPeriodLen, lastPeriodStart, cycles } = useCycle()
  const { todayLog, today, settings, allLogs } = useDb()

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const primeiroNome = (settings['nome'] ?? '').trim().split(' ')[0]
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const variability = cycleVariability(cycles)
  const ciclosVariam = variability != null && variability >= 4

  // Period-span sheet (manual multi-day entry)
  const [periodoSheet, setPeriodoSheet] = useState<{ open: boolean; start?: string; end?: string }>({ open: false })

  // One-tap period start: logs today's flow as moderate, which auto-creates a cycle.
  // Preserves any other data already logged today.
  const marcarMenstruacao = async () => {
    await upsertDailyLog({
      ...todayLog,
      data: today,
      fluxo: { ...todayLog?.fluxo, intensidade: 'moderado' },
    })
  }

  // Show the quick action when the period is due/late and no flow logged today.
  const periodoAtrasadoOuProximo =
    prediction != null && prediction.daysUntilNext <= 1 && !todayLog?.fluxo?.intensidade

  // She's currently bleeding if there's flow logged in the last 2 days.
  const sangrando = allLogs.some((l) => {
    if (!l.fluxo?.intensidade) return false
    const d = differenceInDays(parseISO(today), parseISO(l.data))
    return d >= 0 && d <= 2
  })

  return (
    <div className="pb-4">
      {/* Header with line art */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-xs text-slate-400 capitalize mb-0.5">{todayFormatted}</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {primeiroNome ? (
            <>{saudacao}, <span className="gradient-text">{primeiroNome}</span></>
          ) : (
            <>Olá! <span className="gradient-text">{saudacao}</span></>
          )}
        </h1>
      </div>

      <div className="-mt-2 mb-1">
        <HeaderArt />
      </div>

      <div className="px-4 space-y-3">
        {/* Best-friend daily guidance */}
        {prediction && (
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,92,246,0.10))' }}>
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{phaseInfo[prediction.currentPhase].emoji}</span>
              <p className="text-sm text-slate-700 leading-relaxed">
                {primeiroNome && <strong className="text-slate-800">{primeiroNome}, </strong>}
                {phaseInfo[prediction.currentPhase].guia}
              </p>
            </div>
          </div>
        )}

        {/* Period quick actions */}
        {periodoAtrasadoOuProximo && !sangrando && (
          <button
            onClick={marcarMenstruacao}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #fb7185, #ef4444)' }}
          >
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2c0 0-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13z" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-sm">Minha menstruação começou</p>
                <p className="text-xs opacity-80">Toque para registrar hoje</p>
              </div>
            </div>
            <span className="text-lg">+</span>
          </button>
        )}

        {sangrando && (
          <button
            onClick={() => setPeriodoSheet({ open: true, start: lastPeriodStart ?? today, end: today })}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50"
          >
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-sm text-rose-700">Minha menstruação terminou</p>
                <p className="text-xs text-rose-400">Confirme os dias do sangramento</p>
              </div>
            </div>
          </button>
        )}

        {prediction && (
          <button
            onClick={() => setPeriodoSheet({ open: true })}
            className="w-full text-center text-xs font-medium text-slate-400 py-1"
          >
            Registrar menstruação de vários dias
          </button>
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
                  {format(parseISO(prediction.nextPeriodRangeStart), "d", { locale: ptBR })}–
                  {format(parseISO(prediction.nextPeriodRangeEnd), "d 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-1">Ciclo médio</p>
                <p className="font-bold text-slate-800 text-sm">{avgCycleLen} dias</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {prediction.lutealLength !== 14
                    ? `lútea ${prediction.lutealLength}d`
                    : lastPeriodStart
                    ? `início ${format(parseISO(lastPeriodStart), "d/MM", { locale: ptBR })}`
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Janela fértil</p>
              {prediction.isFertileToday && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #34d399, #22d3ee)' }}>
                  Fértil hoje
                </span>
              )}
            </div>
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
                  <span className="text-sm text-slate-600">
                    {prediction.ovulationConfirmed ? 'Ovulação confirmada' : 'Ovulação prevista'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {format(parseISO(prediction.predictedOvulation), "d 'de' MMM", { locale: ptBR })}
                </span>
              </div>
            </div>
            {prediction.ovulationConfirmed && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs text-emerald-700 font-medium">
                  Confirmada por {prediction.ovulationMethod === 'sintotermico'
                    ? 'temperatura + muco'
                    : prediction.ovulationMethod === 'temperatura'
                    ? 'temperatura basal'
                    : 'muco cervical'}
                </span>
              </div>
            )}
            {ciclosVariam && (
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                Seus ciclos variam bastante, então a janela fértil é uma estimativa mais ampla. Não use como método contraceptivo.
              </p>
            )}
          </div>
        )}

        {/* What to expect today */}
        {prediction && (
          <OQueEsperarHoje
            prediction={prediction}
            cycles={cycles}
            logs={allLogs}
            avgCycleLen={avgCycleLen}
            avgPeriodLen={avgPeriodLen}
            lastPeriodStart={lastPeriodStart}
          />
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

      <RegistrarPeriodo
        open={periodoSheet.open}
        onClose={() => setPeriodoSheet({ open: false })}
        initialStart={periodoSheet.start}
        initialEnd={periodoSheet.end}
      />
    </div>
  )
}
