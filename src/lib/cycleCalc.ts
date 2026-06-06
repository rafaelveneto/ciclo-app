import { addDays, differenceInDays, format, parseISO, isWithinInterval } from 'date-fns'
import type { Cycle } from '../db/database'

export function avgCycleLength(cycles: Cycle[]): number {
  const valid = cycles.filter((c) => c.comprimento != null && c.comprimento >= 21 && c.comprimento <= 45)
  if (valid.length === 0) return 28
  return Math.round(valid.reduce((acc, c) => acc + (c.comprimento ?? 28), 0) / valid.length)
}

export function avgPeriodLength(cycles: Cycle[]): number {
  const withBoth = cycles.filter((c) => c.dataInicio && c.dataFim)
  if (withBoth.length === 0) return 5
  const sum = withBoth.reduce((acc, c) => {
    return acc + differenceInDays(parseISO(c.dataFim!), parseISO(c.dataInicio)) + 1
  }, 0)
  return Math.round(sum / withBoth.length)
}

// Standard deviation of cycle lengths — better than max-min for variability
export function cycleVariability(cycles: Cycle[]): number | null {
  const lengths = cycles
    .filter((c) => c.comprimento != null && c.comprimento >= 21 && c.comprimento <= 45)
    .map((c) => c.comprimento as number)
  if (lengths.length < 2) return null
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / lengths.length
  return Math.round(Math.sqrt(variance) * 10) / 10
}

export interface CyclePrediction {
  nextPeriodStart: string
  fertileWindowStart: string
  fertileWindowEnd: string
  predictedOvulation: string
  // Luteal phase: from day after ovulation to end of cycle (consistent ~12-16 days per person)
  lutealStart: string
  lutealLength: number
  currentPhase: 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea'
  daysUntilNext: number
  currentCycleDay: number
  daysToOvulation: number | null // null if already past
  isFertileToday: boolean
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

  // Luteal phase is consistently ~14 days (actually 12-16, avg 14)
  // Ovulation day = cycleLength - lutealPhaseLength
  const lutealLength = 14
  const ovulationDayIndex = cycleLength - lutealLength // 1-indexed day in cycle
  const ovulationDate = addDays(start, ovulationDayIndex - 1)

  // Fertile window: sperm survive up to 5 days, egg lives ~24h
  // So: ovulation-5 days to ovulation+1 day
  const fertileStart = addDays(ovulationDate, -5)
  const fertileEnd = addDays(ovulationDate, 1)

  // Luteal phase: day after ovulation to end of cycle
  const lutealStart = addDays(ovulationDate, 1)

  // Next period
  const nextPeriod = addDays(start, cycleLength)
  const daysUntilNext = differenceInDays(nextPeriod, today)

  // Days to ovulation (null if past)
  const daysToOvulation = differenceInDays(ovulationDate, today)

  // Is today fertile?
  const isFertileToday = isWithinInterval(today, { start: fertileStart, end: fertileEnd })

  // Phase detection
  let currentPhase: CyclePrediction['currentPhase']
  if (currentCycleDay >= 1 && currentCycleDay <= periodLength) {
    currentPhase = 'menstrual'
  } else if (currentCycleDay < ovulationDayIndex - 1) {
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

  const confidence: CyclePrediction['confidence'] =
    cycleCount < 3 ? 'baixa' : cycleCount <= 6 ? 'media' : 'alta'

  return {
    nextPeriodStart: format(nextPeriod, 'yyyy-MM-dd'),
    fertileWindowStart: format(fertileStart, 'yyyy-MM-dd'),
    fertileWindowEnd: format(fertileEnd, 'yyyy-MM-dd'),
    predictedOvulation: format(ovulationDate, 'yyyy-MM-dd'),
    lutealStart: format(lutealStart, 'yyyy-MM-dd'),
    lutealLength,
    currentPhase,
    daysUntilNext,
    currentCycleDay,
    daysToOvulation: daysToOvulation >= 0 ? daysToOvulation : null,
    isFertileToday,
    confidence,
  }
}

// BBT thermal shift detection — uses days 6-10 as baseline (post-menstrual follicular phase)
// Standard Sensiplan/FAM method: 3 consecutive temps above cover line = ovulation confirmed
export function detectThermalShift(tbcData: { date: string; temp: number }[]): {
  baseline: number | null
  coverLine: number | null
  shiftDate: string | null
} {
  if (tbcData.length < 8) return { baseline: null, coverLine: null, shiftDate: null }

  // Use cycle days 5-10 as baseline (low-temp pre-ovulatory phase)
  const baselineReadings = tbcData.slice(4, 10).map((d) => d.temp)
  const baseline =
    Math.round((baselineReadings.reduce((a, b) => a + b, 0) / baselineReadings.length) * 100) / 100

  // Cover line = baseline + 0.2°C (FAM standard)
  const coverLine = Math.round((baseline + 0.2) * 100) / 100

  // Find first date with 3 consecutive readings above cover line
  let shiftDate: string | null = null
  for (let i = 5; i < tbcData.length - 2; i++) {
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

// Mucus fertility level — clinical significance
export function mucoFertilityLevel(tipo: string): 'infertil' | 'possivelmente-fertil' | 'fertil' | 'pico' {
  if (tipo === 'seco' || tipo === 'pegajoso') return 'infertil'
  if (tipo === 'cremoso') return 'possivelmente-fertil'
  if (tipo === 'aquoso') return 'fertil'
  if (tipo === 'elástico') return 'pico'
  return 'infertil'
}

export function mucoFertilityLabel(tipo: string): string {
  const level = mucoFertilityLevel(tipo)
  const labels = {
    'infertil': 'Dia infértil',
    'possivelmente-fertil': 'Possivelmente fértil',
    'fertil': 'Fértil',
    'pico': 'Pico de fertilidade',
  }
  return labels[level]
}

export function phaseLabel(phase: CyclePrediction['currentPhase']): string {
  return {
    menstrual: 'Menstrual',
    folicular: 'Folicular',
    ovulatoria: 'Ovulatória',
    lutea: 'Lútea',
  }[phase]
}

// kept for backwards compat
export function phaseColors(phase: CyclePrediction['currentPhase']): {
  bg: string; text: string; border: string
} {
  return {
    menstrual:  { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-300' },
    folicular:  { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300' },
    ovulatoria: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    lutea:      { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-300' },
  }[phase]
}
