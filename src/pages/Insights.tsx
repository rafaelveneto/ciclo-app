import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import { detectThermalShift } from '../lib/cycleCalc'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Insights() {
  const { cycles, allLogs } = useDb()
  const { avgCycleLen, avgPeriodLen, prediction, lastPeriodStart } = useCycle()

  // Cycle length chart data (last 6 cycles)
  const cycleLengthData = cycles
    .filter((c) => c.comprimento != null)
    .slice(-6)
    .map((c, i) => ({
      name: `Ciclo ${i + 1}`,
      dias: c.comprimento,
      inicio: c.dataInicio
        ? format(parseISO(c.dataInicio), "MMM/yy", { locale: ptBR })
        : `Ciclo ${i + 1}`,
    }))

  // Variability
  const lengths = cycles
    .filter((c) => c.comprimento != null)
    .map((c) => c.comprimento as number)
  const variability =
    lengths.length >= 2
      ? Math.round(
          (Math.max(...lengths) - Math.min(...lengths)),
        )
      : null

  // BBT data for current cycle
  const tbcData =
    lastPeriodStart
      ? allLogs
          .filter(
            (l) =>
              l.tbc != null &&
              l.data >= lastPeriodStart,
          )
          .map((l) => ({
            date: l.data,
            temp: l.tbc as number,
            label: format(parseISO(l.data), 'd/M'),
          }))
      : []

  const thermalShift = detectThermalShift(tbcData)

  // Symptom correlation per phase
  const phaseSymptoms: Record<string, Record<string, number>> = {
    menstrual: {},
    folicular: {},
    ovulatoria: {},
    lutea: {},
  }

  if (lastPeriodStart) {
    for (const log of allLogs) {
      if (!log.sintomas || log.sintomas.length === 0) continue
      const day = differenceInDays(parseISO(log.data), parseISO(lastPeriodStart)) + 1
      let phase: string
      const ovDay = avgCycleLen - 14
      if (day >= 1 && day <= avgPeriodLen) phase = 'menstrual'
      else if (day <= ovDay - 2) phase = 'folicular'
      else if (day >= ovDay - 1 && day <= ovDay + 1) phase = 'ovulatoria'
      else phase = 'lutea'

      for (const s of log.sintomas) {
        phaseSymptoms[phase][s] = (phaseSymptoms[phase][s] ?? 0) + 1
      }
    }
  }

  const topSymptoms = (phase: string) =>
    Object.entries(phaseSymptoms[phase] ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s)

  const phaseNames: Record<string, string> = {
    menstrual: 'Menstrual',
    folicular: 'Folicular',
    ovulatoria: 'Ovulatória',
    lutea: 'Lútea',
  }

  const phaseBg: Record<string, string> = {
    menstrual: 'bg-rose-50 border-rose-200',
    folicular: 'bg-sky-50 border-sky-200',
    ovulatoria: 'bg-emerald-50 border-emerald-200',
    lutea: 'bg-violet-50 border-violet-200',
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Insights</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ciclo médio" value={`${avgCycleLen}d`} sub="dias" />
        <StatCard label="Período médio" value={`${avgPeriodLen}d`} sub="dias" />
        {variability !== null && (
          <StatCard
            label="Variabilidade"
            value={`${variability}d`}
            sub={variability <= 3 ? 'Regular' : variability <= 7 ? 'Moderada' : 'Irregular'}
          />
        )}
        <StatCard label="Ciclos registrados" value={String(cycles.length)} sub="total" />
      </div>

      {/* Cycle length chart */}
      {cycleLengthData.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Duração dos ciclos
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cycleLengthData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="inicio" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(v) => [`${v} dias`, 'Duração']}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <ReferenceLine y={28} stroke="#e2e8f0" strokeDasharray="4 4" label="" />
              <Line
                type="monotone"
                dataKey="dias"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ fill: '#f43f5e', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
          <p className="text-slate-400 text-sm">
            Registre seus ciclos para ver o gráfico de duração.
          </p>
        </div>
      )}

      {/* BBT chart */}
      {tbcData.length > 1 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Temperatura Basal (ciclo atual)
          </h2>
          {thermalShift.shiftDate && (
            <p className="text-xs text-emerald-600 mb-3">
              Ascensão térmica detectada em{' '}
              {format(parseISO(thermalShift.shiftDate), "d 'de' MMM", { locale: ptBR })}
            </p>
          )}
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tbcData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(2)}°C`, 'Temp. basal']}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              {thermalShift.coverLine && (
                <ReferenceLine
                  y={thermalShift.coverLine}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: 'Linha de cobertura', fontSize: 10, fill: '#10b981' }}
                />
              )}
              {thermalShift.baseline && (
                <ReferenceLine
                  y={thermalShift.baseline}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#6366f1"
                strokeWidth={2}
                dot={<Dot r={3} fill="#6366f1" />}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Phase symptom correlation */}
      {prediction && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Sintomas por fase
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(phaseNames).map(([phase, name]) => {
              const symptoms = topSymptoms(phase)
              return (
                <div
                  key={phase}
                  className={`rounded-xl p-3 border ${phaseBg[phase]}`}
                >
                  <p className="text-xs font-semibold text-slate-700 mb-2">{name}</p>
                  {symptoms.length > 0 ? (
                    <ul className="space-y-1">
                      {symptoms.map((s) => (
                        <li key={s} className="text-xs text-slate-600">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">Sem dados ainda</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
