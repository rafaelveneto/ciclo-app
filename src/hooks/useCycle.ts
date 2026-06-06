import { useMemo } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { useDb } from './useDb'
import {
  avgPeriodLength,
  weightedAvgCycleLength,
  cycleVariability,
  predictCycle,
  type CyclePrediction,
} from '../lib/cycleCalc'
import { confirmOvulation, averageLutealLength } from '../lib/cycleDetection'
import type { Cycle } from '../db/database'

export function useCycle(): {
  prediction: CyclePrediction | null
  cycles: Cycle[]
  avgCycleLen: number
  avgPeriodLen: number
  lastPeriodStart: string | null
  cycleCount: number
} {
  const { allLogs, settings, cycles } = useDb()

  const avgCycleLen = useMemo(() => {
    if (cycles.some((c) => c.comprimento != null)) return weightedAvgCycleLength(cycles)
    const fromSettings = settings['comprimentoCiclo']
    return fromSettings ? parseInt(fromSettings, 10) : 28
  }, [cycles, settings])

  const avgPeriodLen = useMemo(() => avgPeriodLength(cycles) || 5, [cycles])

  const variability = useMemo(() => cycleVariability(cycles), [cycles])

  const lastPeriodStart = useMemo(() => {
    if (cycles.length > 0) {
      const sorted = [...cycles].sort((a, b) => (a.dataInicio > b.dataInicio ? -1 : 1))
      return sorted[0].dataInicio
    }
    return settings['ultimoPeriodo'] ?? null
  }, [cycles, settings])

  // 2. Person's own luteal-phase length from confirmed ovulations (falls back to 14).
  const lutealLen = useMemo(() => averageLutealLength(cycles, allLogs), [cycles, allLogs])

  // 3. Try to confirm THIS cycle's ovulation from symptothermal data.
  const confirmedOvulation = useMemo(() => {
    if (!lastPeriodStart) return null
    const cycleEnd = format(addDays(parseISO(lastPeriodStart), avgCycleLen + 7), 'yyyy-MM-dd')
    const ov = confirmOvulation(allLogs, lastPeriodStart, cycleEnd)
    if (!ov || !ov.method) return null
    return { date: ov.date, method: ov.method, confirmed: ov.confirmed }
  }, [allLogs, lastPeriodStart, avgCycleLen])

  const prediction = useMemo(() => {
    if (!lastPeriodStart) return null
    // Count only completed cycles for confidence.
    const completed = cycles.filter((c) => c.comprimento != null).length
    return predictCycle(lastPeriodStart, avgCycleLen, avgPeriodLen, completed, {
      lutealLength: lutealLen ?? undefined,
      variability,
      confirmedOvulation,
    })
  }, [lastPeriodStart, avgCycleLen, avgPeriodLen, cycles, lutealLen, variability, confirmedOvulation])

  return {
    prediction,
    cycles,
    avgCycleLen,
    avgPeriodLen,
    lastPeriodStart,
    cycleCount: cycles.filter((c) => c.comprimento != null).length,
  }
}
