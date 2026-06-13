import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import type { DailyLog } from '../db/database'
import { mucoFertilityLevel, projectDayPhase, projectedToPhase, type ProjectedPhase } from '../lib/cycleCalc'
import { phaseInfo } from '../lib/phaseInfo'

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const phaseStyles: Record<ProjectedPhase, { bg: string; text: string; border?: string }> = {
  menstrual:            { bg: 'linear-gradient(135deg, #fb7185, #ef4444)', text: 'white' },
  'menstrual-prevista': { bg: 'transparent', text: '#e11d48', border: '1.5px dashed #fb7185' },
  ovulacao:             { bg: 'linear-gradient(135deg, #34d399, #22d3ee)', text: 'white' },
  fertil:               { bg: 'rgba(34,197,94,0.12)', text: '#16a34a' },
  lutea:                { bg: 'rgba(167,139,250,0.15)', text: '#7c3aed' },
  folicular:            { bg: 'transparent', text: '#334155' },
  normal:               { bg: 'transparent', text: '#334155' },
}

const mucoLabels: Record<string, string> = {
  seco: 'Seco', pegajoso: 'Pegajoso', cremoso: 'Cremoso',
  aquoso: 'Aquoso', elástico: 'Elástico (clara de ovo)',
}

const mucoColors: Record<string, string> = {
  'infertil': '#94a3b8',
  'possivelmente-fertil': '#fbbf24',
  'fertil': '#22c55e',
  'pico': '#06b6d4',
}

const legend: { label: string; def: string; swatch: React.CSSProperties }[] = [
  { label: 'Menstruação', def: 'Dias de menstruação (sangramento) que você registrou.',
    swatch: { background: 'linear-gradient(135deg, #fb7185, #ef4444)' } },
  { label: 'Esperada', def: 'Previsão dos próximos dias de menstruação, com base no seu histórico.',
    swatch: { background: 'transparent', border: '1.5px dashed #fb7185' } },
  { label: 'Fértil', def: 'Dias com maior chance de gravidez. Os espermatozoides podem sobreviver até ~5 dias.',
    swatch: { background: 'rgba(34,197,94,0.5)' } },
  { label: 'Ovulação', def: 'Dia em que o óvulo é liberado — o pico da fertilidade.',
    swatch: { background: 'linear-gradient(135deg, #34d399, #22d3ee)' } },
  { label: 'Lútea', def: 'Fase após a ovulação até a próxima menstruação. A TPM costuma aparecer aqui.',
    swatch: { background: 'rgba(167,139,250,0.6)' } },
]

interface DayModalProps {
  date: Date
  log: DailyLog | undefined
  projected: ProjectedPhase
  onClose: () => void
  onLogDay: (date: string) => void
}

function PhaseExpect({ projected }: { projected: ProjectedPhase }) {
  const key = projectedToPhase(projected)
  if (!key) return null
  const info = phaseInfo[key]
  return (
    <div className="rounded-xl p-3.5 mt-1" style={{ background: 'rgba(139,92,246,0.06)' }}>
      <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">
        {info.emoji} O que esperar — fase {info.nome.toLowerCase()}
      </p>
      <p className="text-sm text-slate-600 leading-relaxed mb-2.5">{info.resumo}</p>
      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 mb-1">Físico</p>
          <div className="flex flex-wrap gap-1.5">
            {info.fisicos.slice(0, 4).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 bg-white rounded-full text-slate-600 border border-slate-200">{s}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-400 mb-1">Emocional</p>
          <div className="flex flex-wrap gap-1.5">
            {info.emocionais.slice(0, 4).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 bg-white rounded-full text-slate-600 border border-slate-200">{s}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
        Comum nesta fase — cada corpo é único.
      </p>
    </div>
  )
}

function DayModal({ date, log, projected, onClose, onLogDay }: DayModalProps) {
  const style = phaseStyles[projected]
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: 'linear-gradient(90deg, #ef4444, #8b5cf6, #ec4899)' }} />

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ background: style.bg, color: style.text, border: style.border }}>
            {date.getDate()}
          </div>
          <div>
            <p className="font-bold text-slate-900 capitalize">
              {format(date, "d 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {format(date, 'EEEE', { locale: ptBR })}
            </p>
          </div>
        </div>

        {log && (
          <div className="space-y-3 mb-3">
            {log.fluxo?.intensidade && (
              <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Fluxo</p>
                  <p className="text-sm text-slate-800 capitalize">
                    {log.fluxo.intensidade}{log.fluxo.cor ? ` · ${log.fluxo.cor}` : ''}
                    {log.fluxo.coagulos ? ' · com coágulos' : ''}
                  </p>
                </div>
              </div>
            )}
            {log.muco?.tipo && (
              <div className="flex items-start gap-3 p-3 bg-cyan-50 rounded-xl">
                <div className="w-2 h-2 rounded-full mt-1.5"
                  style={{ background: mucoColors[mucoFertilityLevel(log.muco.tipo)] }} />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Muco cervical</p>
                  <p className="text-sm text-slate-800">{mucoLabels[log.muco.tipo] ?? log.muco.tipo}</p>
                </div>
              </div>
            )}
            {log.tbc != null && (
              <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-violet-400 mt-1.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Temperatura basal</p>
                  <p className="text-sm text-slate-800 font-mono">{log.tbc.toFixed(2)}°C</p>
                </div>
              </div>
            )}
            {log.sintomas && log.sintomas.length > 0 && (
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Sintomas</p>
                <div className="flex flex-wrap gap-1.5">
                  {log.sintomas.map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-white rounded-full text-slate-700 border border-slate-200">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {log.humor && log.humor.length > 0 && (
              <div className="p-3 bg-pink-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Humor</p>
                <div className="flex flex-wrap gap-1.5">
                  {log.humor.map((h) => (
                    <span key={h} className="text-xs px-2 py-0.5 bg-white rounded-full text-slate-700 border border-slate-200">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {log.notas && (
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notas</p>
                <p className="text-sm text-slate-700 leading-relaxed">{log.notas}</p>
              </div>
            )}
          </div>
        )}

        {/* Educational: what to expect this phase */}
        <PhaseExpect projected={projected} />

        <button onClick={() => onLogDay(format(date, 'yyyy-MM-dd'))}
          className="mt-5 w-full py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
          {log ? 'Editar este dia' : 'Registrar neste dia'}
        </button>
        <button onClick={onClose}
          className="mt-2 w-full border border-slate-200 text-slate-600 py-3 rounded-xl font-medium text-sm hover:bg-slate-50">
          Fechar
        </button>
      </div>
    </div>
  )
}

export default function Calendario({ onLogDay }: { onLogDay: (date: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [glossary, setGlossary] = useState<number | null>(null)
  const { prediction, avgCycleLen, avgPeriodLen, lastPeriodStart } = useCycle()
  const { allLogs } = useDb()

  const lutealLen = prediction?.lutealLength ?? 14

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart)

  const phaseFor = (day: Date): ProjectedPhase =>
    projectDayPhase({
      date: day,
      anchorStart: lastPeriodStart,
      cycleLen: avgCycleLen,
      periodLen: avgPeriodLen,
      lutealLen,
      hasFlowLog: allLogs.some((l) => l.data === format(day, 'yyyy-MM-dd') && !!l.fluxo?.intensidade),
    })

  const selectedLog = selectedDay
    ? allLogs.find((l) => l.data === format(selectedDay, 'yyyy-MM-dd'))
    : undefined
  const selectedProjected = selectedDay ? phaseFor(selectedDay) : 'normal'

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Mês anterior">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-slate-900 capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Próximo mês">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Legend (tap a term to learn what it means) */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-2">
        {legend.map(({ label, swatch }, i) => (
          <button key={label} onClick={() => setGlossary(glossary === i ? null : i)}
            className={`flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors ${glossary === i ? 'bg-slate-100' : ''}`}>
            <div className="w-2.5 h-2.5 rounded-full" style={swatch} />
            <span className="text-xs text-slate-500">{label}</span>
          </button>
        ))}
      </div>
      {glossary !== null && (
        <div className="mb-3 text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl px-3 py-2.5 flex gap-2">
          <span className="font-semibold text-slate-700">{legend[glossary].label}:</span>
          <span>{legend[glossary].def}</span>
        </div>
      )}
      {glossary === null && (
        <p className="text-[11px] text-slate-300 mb-3">Toque em um termo acima para entender o que significa</p>
      )}

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

        {days.map((day) => {
          const projected = phaseFor(day)
          const style = phaseStyles[projected]
          const today = isToday(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          const log = allLogs.find((l) => l.data === dateStr)
          const hasMuco = log?.muco?.tipo != null
          const hasTbc = log?.tbc != null
          const isPlain = projected === 'normal' || projected === 'folicular'

          return (
            <button key={dateStr} onClick={() => setSelectedDay(day)}
              className="relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all active:scale-95"
              style={{
                background: style.bg,
                color: style.text,
                border: style.border,
                boxShadow: today && isPlain ? '0 0 0 2px #8b5cf6' : undefined,
              }}>
              {day.getDate()}
              {(hasMuco || hasTbc) && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {hasMuco && <div className="w-1 h-1 rounded-full bg-cyan-400" />}
                  {hasTbc && <div className="w-1 h-1 rounded-full bg-violet-400" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Day modal */}
      {selectedDay && (
        <DayModal
          date={selectedDay}
          log={selectedLog}
          projected={selectedProjected}
          onClose={() => setSelectedDay(null)}
          onLogDay={onLogDay}
        />
      )}
    </div>
  )
}
