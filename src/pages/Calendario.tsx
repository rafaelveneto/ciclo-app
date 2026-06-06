import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  parseISO,
  isSameDay,
  isToday,
  isWithinInterval,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import type { DailyLog } from '../db/database'

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getDayClass(
  date: Date,
  prediction: ReturnType<typeof useCycle>['prediction'],
  logs: DailyLog[],
): string {
  const dateStr = format(date, 'yyyy-MM-dd')
  const log = logs.find((l) => l.data === dateStr)
  const hasFlow = log?.fluxo?.intensidade != null

  if (hasFlow) return 'bg-rose-400 text-white'

  if (!prediction) return ''

  const fertileStart = parseISO(prediction.fertileWindowStart)
  const fertileEnd = parseISO(prediction.fertileWindowEnd)
  const ovulation = parseISO(prediction.predictedOvulation)

  if (isSameDay(date, ovulation)) return 'bg-emerald-500 text-white ring-2 ring-emerald-300'

  if (isWithinInterval(date, { start: fertileStart, end: fertileEnd })) {
    return 'bg-green-100 text-green-800'
  }

  return ''
}

interface DayModalProps {
  date: Date
  log: DailyLog | undefined
  onClose: () => void
}

function DayModal({ date, log, onClose }: DayModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h3>

        {log ? (
          <div className="space-y-3">
            {log.fluxo?.intensidade && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Fluxo</span>
                <p className="text-slate-800 capitalize">{log.fluxo.intensidade}</p>
              </div>
            )}
            {log.sintomas && log.sintomas.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Sintomas</span>
                <p className="text-slate-800">{log.sintomas.join(', ')}</p>
              </div>
            )}
            {log.humor && log.humor.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Humor</span>
                <p className="text-slate-800">{log.humor.join(', ')}</p>
              </div>
            )}
            {log.tbc != null && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Temperatura Basal
                </span>
                <p className="text-slate-800">{log.tbc}°C</p>
              </div>
            )}
            {log.notas && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Notas</span>
                <p className="text-slate-800">{log.notas}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Nenhum registro para este dia.</p>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl font-medium text-sm"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

export default function Calendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const { prediction } = useCycle()
  const { allLogs } = useDb()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Padding at start (0 = Sunday)
  const startPad = getDay(monthStart)

  const selectedLog = selectedDay
    ? allLogs.find((l) => l.data === format(selectedDay, 'yyyy-MM-dd'))
    : undefined

  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          aria-label="Mês anterior"
        >
          ◀
        </button>
        <h2 className="text-lg font-bold text-slate-800 capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          aria-label="Próximo mês"
        >
          ▶
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-400" />
          <span>Menstrual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-200 border border-green-400" />
          <span>Fértil</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Ovulação</span>
        </div>
      </div>

      {/* Weekdays header */}
      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Start padding */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((day) => {
          const dayClass = getDayClass(day, prediction, allLogs)
          const today = isToday(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasLog = allLogs.some((l) => l.data === dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                ${dayClass || 'text-slate-700 hover:bg-slate-100'}
                ${today && !dayClass ? 'ring-2 ring-rose-400 ring-offset-1' : ''}
              `}
            >
              {day.getDate()}
              {hasLog && !dayClass && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day modal */}
      {selectedDay && (
        <DayModal
          date={selectedDay}
          log={selectedLog}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
