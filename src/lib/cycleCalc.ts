import { addDays, differenceInDays, format, parseISO, isWithinInterval } from 'date-fns'
import type { Cycle } from '../db/database'

// Given array of cycles (sorted oldest first), compute average cycle length
export function avgCycleLength(cycles: Cycle[]): number {
  const withLength = cycles.filter((c) => c.comprimento != null && c.comprimento > 0)
  if (withLength.length === 0) return 28
  const sum = withLength.reduce((acc, c) => acc + (c.comprimento ?? 28), 0)
  return Math.round(sum / withLength.length)
}

// Given array of cycles, compute average period length
export function avgPeriodLength(cycles: Cycle[]): number {
  const withBoth = cycles.filter((c) => c.dataInicio && c.dataFim)
  if (withBoth.length === 0) return 5
  const sum = withBoth.reduce((acc, c) => {
    const start = parseISO(c.dataInicio)
    const end = parseISO(c.dataFim!)
    return acc + differenceInDays(end, start) + 1
  }, 0)
  return Math.round(sum / withBoth.length)
}

export interface CyclePrediction {
  nextPeriodStart: string
  fertileWindowStart: string
  fertileWindowEnd: string
  predictedOvulation: string
  currentPhase: 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea'
  daysUntilNext: number
  currentCycleDay: number
  confidence: 'baixa' | 'media' | 'alta'
}

export function predictCycle(
  lastPeriodStart: string,
  cycleLength: number,
  periodLength: number,
  cycleCount: number,
): CyclePrediction {
  const start = parseISO(lastPeriodStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentCycleDay = differenceInDays(today, start) + 1

  // Ovulation is cycleLength - 14 days into the cycle (0-indexed from start)
  const ovulationDayIndex = cycleLength - 14 // day number from start (1-indexed)
  const ovulationDate = addDays(start, ovulationDayIndex - 1)

  // Fertile window: ovulation - 5 to ovulation + 1
  const fertileStart = addDays(ovulationDate, -5)
  const fertileEnd = addDays(ovulationDate, 1)

  // Next period
  const nextPeriod = addDays(start, cycleLength)
  const daysUntilNext = differenceInDays(nextPeriod, today)

  // Determine current phase
  let currentPhase: CyclePrediction['currentPhase']
  if (currentCycleDay >= 1 && currentCycleDay <= periodLength) {
    currentPhase = 'menstrual'
  } else if (currentCycleDay <= ovulationDayIndex - 2) {
    currentPhase = 'folicular'
  } else if (
    isWithinInterval(today, {
      start: addDays(ovulationDate, -1),
      end: addDays(ovulationDate, 1),
    })
  ) {
    currentPhase = 'ovulatoria'
  } else {
    currentPhase = 'lutea'
  }

  // Confidence based on cycle count
  let confidence: CyclePrediction['confidence']
  if (cycleCount < 3) {
    confidence = 'baixa'
  } else if (cycleCount <= 6) {
    confidence = 'media'
  } else {
    confidence = 'alta'
  }

  return {
    nextPeriodStart: format(nextPeriod, 'yyyy-MM-dd'),
    fertileWindowStart: format(fertileStart, 'yyyy-MM-dd'),
    fertileWindowEnd: format(fertileEnd, 'yyyy-MM-dd'),
    predictedOvulation: format(ovulationDate, 'yyyy-MM-dd'),
    currentPhase,
    daysUntilNext,
    currentCycleDay,
    confidence,
  }
}

// Detect thermal shift for BBT chart (baseline + cover line)
export function detectThermalShift(tbcData: { date: string; temp: number }[]): {
  baseline: number | null
  coverLine: number | null
  shiftDate: string | null
} {
  if (tbcData.length < 6) {
    return { baseline: null, coverLine: null, shiftDate: null }
  }

  // Calculate baseline from first 6 readings
  const baselineReadings = tbcData.slice(0, 6).map((d) => d.temp)
  const baseline =
    Math.round((baselineReadings.reduce((a, b) => a + b, 0) / baselineReadings.length) * 100) / 100

  const coverLine = Math.round((baseline + 0.2) * 100) / 100

  // Find the first date where 3 consecutive readings are above cover line
  let shiftDate: string | null = null
  for (let i = 6; i < tbcData.length - 2; i++) {
    if (
      tbcData[i].temp > coverLine &&
      tbcData[i + 1].temp > coverLine &&
      tbcData[i + 2].temp > coverLine
    ) {
      shiftDate = tbcData[i].date
      break
    }
  }

  return { baseline, coverLine, shiftDate }
}

// Get phase label in Portuguese
export function phaseLabel(phase: CyclePrediction['currentPhase']): string {
  const labels = {
    menstrual: 'Menstrual',
    folicular: 'Folicular',
    ovulatoria: 'Ovulatória',
    lutea: 'Lútea',
  }
  return labels[phase]
}

// Get phase color classes
export function phaseColors(phase: CyclePrediction['currentPhase']): {
  bg: string
  text: string
  border: string
} {
  const map = {
    menstrual: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    folicular: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
    ovulatoria: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    lutea: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  }
  return map[phase]
}
