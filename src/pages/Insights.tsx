import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCycle } from '../hooks/useCycle'
import { useDb } from '../hooks/useDb'
import { detectThermalShift, cycleVariability, cycleHealthFlags } from '../lib/cycleCalc'
import { averageLutealLength } from '../lib/cycleDetection'
import { generateMedicalReportPdf } from '../lib/report'

function StatCard({
  label, value, sub, gradient,
}: {
  label: string; value: string; sub?: string; gradient?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold"
        style={{ background: gradient ?? 'linear-gradient(135deg, #ef4444, #8b5cf6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const phaseGradients: Record<string, string> = {
  menstrual:  'linear-gradient(135deg, #fb7185, #ef4444)',
  folicular:  'linear-gradient(135deg, #fb923c, #fbbf24)',
  ovulatoria: 'linear-gradient(135deg, #34d399, #22d3ee)',
  lutea:      'linear-gradient(135deg, #a78bfa, #c084fc)',
}

const phaseNames: Record<string, string> = {
  menstrual: 'Menstrual', folicular: 'Folicular',
  ovulatoria: 'Ovulatória', lutea: 'Lútea',
}

export default function Insights() {
  const { cycles, allLogs, settings } = useDb()
  const { avgCycleLen, avgPeriodLen, lastPeriodStart } = useCycle()
  const [reportBusy, setReportBusy] = useState(false)

  const lutealLen = averageLutealLength(cycles, allLogs)
  const healthFlags = cycleHealthFlags(cycles, lutealLen)
  const variabilityForReport = cycleVariability(cycles)

  const handleReport = async () => {
    setReportBusy(true)
    try {
      await generateMedicalReportPdf({
        nome: settings['nome'] ?? '',
        cycles,
        logs: allLogs,
        avgCycleLen,
        avgPeriodLen,
        variability: variabilityForReport,
        lutealLen,
        flags: healthFlags,
      })
    } catch {
      alert('Não foi possível gerar o relatório. Tente novamente.')
    } finally {
      setReportBusy(false)
    }
  }

  // Cycle history (most recent first) — transparency for the auto-detection
  const cycleHistory = [...cycles]
    .sort((a, b) => (a.dataInicio > b.dataInicio ? -1 : 1))
    .slice(0, 6)

  // Cycle length chart
  const cycleLengthData = cycles
    .filter((c) => c.comprimento != null)
    .slice(-8)
    .map((c, i) => ({
      name: c.dataInicio
        ? format(parseISO(c.dataInicio), "MMM/yy", { locale: ptBR })
        : `C${i + 1}`,
      dias: c.comprimento,
    }))

  const variability = cycleVariability(cycles)

  // BBT chart for current cycle
  const tbcData = lastPeriodStart
    ? allLogs
        .filter((l) => l.tbc != null && l.data >= lastPeriodStart)
        .map((l) => ({
          date: l.data,
          temp: l.tbc as number,
          label: format(parseISO(l.data), 'd/M'),
        }))
    : []

  const thermalShift = detectThermalShift(tbcData)

  // Symptom-phase correlation across ALL historical cycles
  // Uses each cycle's actual start to determine phase for each log
  const phaseSymptoms: Record<string, Record<string, number>> = {
    menstrual: {}, folicular: {}, ovulatoria: {}, lutea: {},
  }

  for (const cycle of cycles) {
    if (!cycle.dataInicio) continue
    const cycleLen = cycle.comprimento ?? avgCycleLen
    const periodLen = avgPeriodLen
    const ovDay = cycleLen - 14

    for (const log of allLogs) {
      if (!log.sintomas || log.sintomas.length === 0) continue
      const day = differenceInDays(parseISO(log.data), parseISO(cycle.dataInicio)) + 1
      if (day < 1 || day > cycleLen) continue

      let phase: string
      if (day <= periodLen) phase = 'menstrual'
      else if (day < ovDay - 1) phase = 'folicular'
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
      .slice(0, 4)
      .map(([s, count]) => ({ s, count }))

  // Humor correlation across cycles
  const phaseHumor: Record<string, Record<string, number>> = {
    menstrual: {}, folicular: {}, ovulatoria: {}, lutea: {},
  }
  for (const cycle of cycles) {
    if (!cycle.dataInicio) continue
    const cycleLen = cycle.comprimento ?? avgCycleLen
    const ovDay = cycleLen - 14
    for (const log of allLogs) {
      if (!log.humor || log.humor.length === 0) continue
      const day = differenceInDays(parseISO(log.data), parseISO(cycle.dataInicio)) + 1
      if (day < 1 || day > cycleLen) continue
      let phase: string
      if (day <= avgPeriodLen) phase = 'menstrual'
      else if (day < ovDay - 1) phase = 'folicular'
      else if (day >= ovDay - 1 && day <= ovDay + 1) phase = 'ovulatoria'
      else phase = 'lutea'
      for (const h of log.humor) {
        phaseHumor[phase][h] = (phaseHumor[phase][h] ?? 0) + 1
      }
    }
  }

  // TPM risk detection: symptoms that appear consistently in days -7 to -1 before period
  const tpmSymptoms: Record<string, number> = {}
  for (const cycle of cycles) {
    if (!cycle.dataInicio || !cycle.comprimento) continue
    const cycleLen = cycle.comprimento
    for (const log of allLogs) {
      if (!log.sintomas) continue
      const day = differenceInDays(parseISO(log.data), parseISO(cycle.dataInicio)) + 1
      if (day >= cycleLen - 7 && day <= cycleLen - 1) {
        for (const s of log.sintomas) {
          tpmSymptoms[s] = (tpmSymptoms[s] ?? 0) + 1
        }
      }
    }
  }
  const tpmPattern = Object.entries(tpmSymptoms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter(([, count]) => count >= 2)

  const hasEnoughData = cycles.length >= 2

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">
        <span className="gradient-text">Insights</span>
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ciclo médio" value={`${avgCycleLen}d`}
          gradient="linear-gradient(135deg, #ef4444, #f97316)" />
        <StatCard label="Período médio" value={`${avgPeriodLen}d`}
          gradient="linear-gradient(135deg, #f97316, #eab308)" />
        <StatCard
          label="Variabilidade"
          value={variability !== null ? `${variability}d` : '—'}
          sub={variability === null ? 'Poucos dados' : variability <= 3 ? 'Ciclo regular' : variability <= 7 ? 'Moderada' : 'Irregular'}
          gradient="linear-gradient(135deg, #22c55e, #06b6d4)"
        />
        <StatCard
          label="Fase lútea"
          value={lutealLen != null ? `${lutealLen}d` : '—'}
          sub={lutealLen != null ? 'confirmada' : 'registre TBC'}
          gradient="linear-gradient(135deg, #8b5cf6, #ec4899)"
        />
      </div>

      {/* Health flags */}
      {healthFlags.length > 0 && (
        <div className="space-y-2">
          {healthFlags.map((flag, i) => (
            <div key={i} className="rounded-2xl p-4 border" style={{
              borderColor: 'rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.06)'
            }}>
              <div className="flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{flag.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{flag.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cycle length chart */}
      {cycleLengthData.length > 1 ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Duração dos ciclos
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={cycleLengthData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(v) => [`${v} dias`, 'Duração']}
                contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f1f5f9' }}
              />
              <ReferenceLine y={28} stroke="#f1f5f9" strokeDasharray="4 4" />
              <defs>
                <linearGradient id="cycleLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="dias" stroke="url(#cycleLineGrad)"
                strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="gradient-border p-5 text-center">
          <p className="text-slate-400 text-sm">
            Registre ao menos 2 ciclos para ver o gráfico de duração.
          </p>
        </div>
      )}

      {/* BBT chart */}
      {tbcData.length > 2 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Temperatura basal — ciclo atual
          </p>
          {thermalShift.shiftDate && (
            <p className="text-xs font-semibold mb-3" style={{
              background: 'linear-gradient(135deg, #34d399, #22d3ee)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              Ascensão térmica em {format(parseISO(thermalShift.shiftDate), "d 'de' MMM", { locale: ptBR })} — ovulação confirmada
            </p>
          )}
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={tbcData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: number) => v.toFixed(1)} />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(2)}°C`, 'Temp. basal']}
                contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #f1f5f9' }}
              />
              {thermalShift.coverLine && (
                <ReferenceLine y={thermalShift.coverLine} stroke="#34d399" strokeDasharray="4 4"
                  label={{ value: 'Linha de cobertura', fontSize: 9, fill: '#34d399', position: 'right' }} />
              )}
              {thermalShift.baseline && (
                <ReferenceLine y={thermalShift.baseline} stroke="#cbd5e1" strokeDasharray="3 3" />
              )}
              <defs>
                <linearGradient id="tbcGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <Line type="monotone" dataKey="temp" stroke="url(#tbcGrad)"
                strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Symptom by phase */}
      {hasEnoughData && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Sintomas por fase (histórico)
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(phaseNames).map(([phase, name]) => {
              const symptoms = topSymptoms(phase)
              return (
                <div key={phase} className="rounded-2xl p-3 overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10 rounded-2xl" style={{ background: phaseGradients[phase] }} />
                  <p className="text-xs font-bold text-slate-700 mb-2 relative">{name}</p>
                  {symptoms.length > 0 ? (
                    <ul className="space-y-1 relative">
                      {symptoms.map(({ s, count }) => (
                        <li key={s} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">{s}</span>
                          <span className="text-xs font-semibold text-slate-400">{count}×</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 relative">Sem dados ainda</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TPM pattern */}
      {tpmPattern.length > 0 && (
        <div className="gradient-border p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Padrão de TPM detectado
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Sintomas que aparecem consistentemente nos 7 dias antes do período:
          </p>
          <div className="flex flex-wrap gap-2">
            {tpmPattern.map(([s, count]) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #a78bfa, #ec4899)' }}>
                {s} ({count}×)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Humor by phase */}
      {hasEnoughData && Object.values(phaseHumor).some(p => Object.keys(p).length > 0) && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Humor por fase (histórico)
          </p>
          <div className="space-y-3">
            {Object.entries(phaseNames).map(([phase, name]) => {
              const moods = Object.entries(phaseHumor[phase] ?? {})
                .sort((a, b) => b[1] - a[1]).slice(0, 3)
              if (moods.length === 0) return null
              return (
                <div key={phase} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: phaseGradients[phase] }} />
                  <span className="text-xs font-medium text-slate-500 w-20 flex-shrink-0">{name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {moods.map(([h]) => (
                      <span key={h} className="text-xs px-2 py-0.5 bg-slate-50 rounded-full text-slate-600 border border-slate-100">{h}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cycle history — transparency for the auto-detected cycles */}
      {cycleHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Histórico de ciclos
          </p>
          <div className="space-y-2">
            {cycleHistory.map((c, i) => {
              const inicio = format(parseISO(c.dataInicio), "d 'de' MMM", { locale: ptBR })
              const periodo = c.dataFim
                ? differenceInDays(parseISO(c.dataFim), parseISO(c.dataInicio)) + 1
                : null
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full" style={{
                      background: c.comprimento ? 'linear-gradient(180deg, #fb7185, #8b5cf6)' : '#e2e8f0'
                    }} />
                    <div>
                      <p className="text-sm font-medium text-slate-700 capitalize">{inicio}</p>
                      <p className="text-xs text-slate-400">
                        {periodo ? `menstruação ${periodo}d` : 'menstruação registrada'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {c.comprimento ? (
                      <>
                        <p className="text-sm font-bold text-slate-800">{c.comprimento}d</p>
                        <p className="text-xs text-slate-400">ciclo</p>
                      </>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                        style={{ background: 'linear-gradient(135deg, #34d399, #22d3ee)' }}>
                        em curso
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Ciclos detectados automaticamente a partir das menstruações que você registrou.
          </p>
        </div>
      )}

      {/* Medical report (PDF) */}
      {allLogs.length > 0 && (
        <div className="gradient-border p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Relatório para o médico</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                Um resumo em PDF do seu ciclo, humores e sintomas para levar ou enviar ao ginecologista.
              </p>
            </div>
          </div>
          <button
            onClick={handleReport}
            disabled={reportBusy}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
          >
            {reportBusy ? 'Gerando PDF…' : 'Gerar relatório (PDF)'}
          </button>
        </div>
      )}

      {!hasEnoughData && (
        <div className="gradient-border p-5 text-center">
          <p className="text-slate-400 text-sm leading-relaxed">
            Registre seus sintomas diariamente por pelo menos 2 ciclos para ver correlações e padrões personalizados.
          </p>
        </div>
      )}
    </div>
  )
}
