import { useMemo } from 'react'
import { useDb } from './useDb'
import {
  avgCycleLength,
  avgPeriodLength,
  predictCycle,
  type CyclePrediction,
} from '../lib/cycleCalc'

export function useCycle(): {
  prediction: CyclePrediction | null
  avgCycleLen: number
  avgPeriodLen: number
  lastPeriodStart: string | null
  cycleCount: number
} {
  const { cycles, settings } = useDb()

  const avgCycleLen = useMemo(() => {
    if (cycles.length > 0) return avgCycleLength(cycles)
    const fromSettings = settings['comprimentoCiclo']
    return fromSettings ? parseInt(fromSettings, 10) : 28
  }, [cycles, settings])

  const avgPeriodLen = useMemo(() => {
    if (cycles.length > 0) return avgPeriodLength(cycles)
    return 5
  }, [cycles])

  const lastPeriodStart = useMemo(() => {
    if (cycles.length > 0) {
      const sorted = [...cycles].sort((a, b) =>
        a.dataInicio > b.dataInicio ? -1 : 1,
      )
      return sorted[0].dataInicio
    }
    return settings['ultimoPeriodo'] ?? null
  }, [cycles, settings])

  const prediction = useMemo(() => {
    if (!lastPeriodStart) return null
    return predictCycle(lastPeriodStart, avgCycleLen, avgPeriodLen, cycles.length)
  }, [lastPeriodStart, avgCycleLen, avgPeriodLen, cycles.length])

  return {
    prediction,
    avgCycleLen,
    avgPeriodLen,
    lastPeriodStart,
    cycleCount: cycles.length,
  }
}
