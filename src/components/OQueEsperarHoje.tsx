import { useState } from 'react'
import { addDays } from 'date-fns'
import type { CyclePrediction } from '../lib/cycleCalc'
import type { Cycle, DailyLog } from '../db/database'
import {
  phaseInfo, pregnancyChance, pregnancyChanceLabel,
} from '../lib/phaseInfo'
import { personalPhasePatterns, projectDayPhase, projectedToPhase } from '../lib/cycleCalc'

interface Props {
  prediction: CyclePrediction
  cycles: Cycle[]
  logs: DailyLog[]
  avgCycleLen: number
  avgPeriodLen: number
  lastPeriodStart: string | null
}

/**
 * "What to expect today" — the essentials stay visible (phase, pregnancy chance,
 * likely symptoms); the deeper guidance (self-care, your patterns, tomorrow) is
 * tucked behind a single toggle so the Today screen doesn't overwhelm.
 */
export default function OQueEsperarHoje({
  prediction, cycles, logs, avgCycleLen, avgPeriodLen, lastPeriodStart,
}: Props) {
  const [showMore, setShowMore] = useState(false)

  const phase = prediction.currentPhase
  const info = phaseInfo[phase]
  const chance = pregnancyChance(phase, prediction.isFertileToday, prediction.daysToOvulation)
  const chanceColor = chance === 'alta'
    ? 'linear-gradient(135deg, #34d399, #22d3ee)'
    : chance === 'media'
    ? 'linear-gradient(135deg, #fbbf24, #f97316)'
    : 'linear-gradient(135deg, #cbd5e1, #94a3b8)'

  const patterns = personalPhasePatterns({
    cycles, logs, cycleLen: avgCycleLen, periodLen: avgPeriodLen, lutealLen: prediction.lutealLength,
  })[phase]
  const personal = [...patterns.sintomas, ...patterns.humor]

  const tomorrowPhase = projectedToPhase(projectDayPhase({
    date: addDays(new Date(), 1), anchorStart: lastPeriodStart,
    cycleLen: avgCycleLen, periodLen: avgPeriodLen, lutealLen: prediction.lutealLength,
    hasFlowLog: false,
  }))
  const tomorrowInfo = tomorrowPhase ? phaseInfo[tomorrowPhase] : null
  const mudaFase = tomorrowPhase !== null && tomorrowPhase !== phase

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">O que esperar hoje</p>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 mb-0.5">Dia do ciclo</p>
          <p className="font-bold text-slate-800">{prediction.currentCycleDay}</p>
        </div>
        <div className="rounded-xl p-2.5 text-center" style={{ background: chanceColor }}>
          <p className="text-[10px] text-white/80 mb-0.5">Chance de gravidez</p>
          <p className="font-bold text-white text-sm">{pregnancyChanceLabel[chance]}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-slate-400 mb-0.5">Fase</p>
          <p className="font-bold text-slate-800 text-sm">{info.emoji} {info.nome}</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mb-3">{info.resumo}</p>

      {/* You might feel (always visible) */}
      <p className="text-xs font-semibold text-slate-400 mb-1.5">Você pode sentir</p>
      <div className="flex flex-wrap gap-1.5">
        {info.fisicos.slice(0, 3).map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 bg-rose-50 rounded-full text-rose-600 border border-rose-100">{s}</span>
        ))}
        {info.emocionais.slice(0, 3).map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 bg-violet-50 rounded-full text-violet-600 border border-violet-100">{s}</span>
        ))}
      </div>

      {/* Collapsible details */}
      {showMore && (
        <div className="mt-3 space-y-2">
          {personal.length >= 2 && (
            <div className="px-3 py-2.5 rounded-xl bg-violet-50">
              <p className="text-[11px] font-semibold text-violet-400 mb-1.5">No seu histórico, nesta fase você costuma registrar</p>
              <div className="flex flex-wrap gap-1.5">
                {personal.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-white rounded-full text-violet-600 border border-violet-100">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50">
            <span className="text-sm">💡</span>
            <p className="text-xs text-amber-700 leading-relaxed">{info.dica}</p>
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50">
            <span className="text-sm">🍎</span>
            <p className="text-xs text-emerald-700 leading-relaxed"><strong>Alimentação:</strong> {info.alimentacao}</p>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-sky-50">
            <span className="text-sm">🏃‍♀️</span>
            <p className="text-xs text-sky-700 leading-relaxed"><strong>Movimento:</strong> {info.movimento}</p>
          </div>

          {tomorrowInfo && (
            <div className="pt-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-600">Amanhã:</span>{' '}
                {mudaFase
                  ? <>você entra na fase {tomorrowInfo.emoji} <strong>{tomorrowInfo.nome.toLowerCase()}</strong> — pode começar a sentir {tomorrowInfo.fisicos.slice(0, 2).join(', ').toLowerCase()}.</>
                  : <>ainda na fase {tomorrowInfo.nome.toLowerCase()} — siga se cuidando como hoje.</>}
              </p>
            </div>
          )}

          {chance !== 'baixa' && (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              A chance de gravidez é uma estimativa e não substitui um método contraceptivo.
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => setShowMore((v) => !v)}
        className="mt-3 w-full text-xs font-semibold gradient-text flex items-center justify-center gap-1"
      >
        {showMore ? 'Ver menos' : 'Cuidados, seu histórico e amanhã'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )
}
