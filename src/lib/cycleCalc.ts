import { addDays, differenceInDays, format, parseISO, isWithinInterval } from 'date-fns'
import type { Cycle, DailyLog } from '../db/database'

export type PhaseKey = 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea'

/**
 * The user's OWN most-frequent symptoms and moods per phase, learned from her
 * logged history. This turns the generic "what to expect" into something
 * personal — "in this phase YOU usually feel…" — fully offline.
 */
export function personalPhasePatterns(opts: {
  cycles: Cycle[]
  logs: DailyLog[]
  cycleLen: number
  periodLen: number
  lutealLen: number
}): Record<PhaseKey, { sintomas: string[]; humor: string[] }> {
  const { cycles, logs, cycleLen, periodLen, lutealLen } = opts
  const tally: Record<PhaseKey, { sintomas: Record<string, number>; humor: Record<string, number> }> = {
    menstrual: { sintomas: {}, humor: {} },
    folicular: { sintomas: {}, humor: {} },
    ovulatoria: { sintomas: {}, humor: {} },
    lutea: { sintomas: {}, humor: {} },
  }

  const classify = (day: number, len: number): PhaseKey => {
    const ovDay = len - lutealLen - 1
    if (day < periodLen) return 'menstrual'
    if (day >= ovDay - 1 && day <= ovDay + 1) return 'ovulatoria'
    if (day > ovDay + 1) return 'lutea'
    return 'folicular'
  }

  for (const cycle of cycles) {
    if (!cycle.dataInicio) continue
    const len = cycle.comprimento ?? cycleLen
    for (const log of logs) {
      const day = differenceInDays(parseISO(log.data), parseISO(cycle.dataInicio))
      if (day < 0 || day >= len) continue
      const phase = classify(day, len)
      for (const s of log.sintomas ?? []) tally[phase].sintomas[s] = (tally[phase].sintomas[s] ?? 0) + 1
      for (const h of log.humor ?? []) tally[phase].humor[h] = (tally[phase].humor[h] ?? 0) + 1
    }
  }

  const top = (m: Record<string, number>, n: number) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)

  return {
    menstrual: { sintomas: top(tally.menstrual.sintomas, 3), humor: top(tally.menstrual.humor, 2) },
    folicular: { sintomas: top(tally.folicular.sintomas, 3), humor: top(tally.folicular.humor, 2) },
    ovulatoria: { sintomas: top(tally.ovulatoria.sintomas, 3), humor: top(tally.ovulatoria.humor, 2) },
    lutea: { sintomas: top(tally.lutea.sintomas, 3), humor: top(tally.lutea.humor, 2) },
  }
}

/**
 * Phase of a single calendar day, projected across past AND future cycles by
 * repeating the average cycle pattern from an anchor period start. This is what
 * lets the calendar paint expected periods, fertile windows, ovulation and the
 * luteal phase in any month — not just the current cycle.
 *
 * - 'menstrual'         = bleeding actually logged
 * - 'menstrual-prevista'= predicted/expected period (not yet logged)
 */
export type ProjectedPhase =
  | 'menstrual'
  | 'menstrual-prevista'
  | 'fertil'
  | 'ovulacao'
  | 'lutea'
  | 'folicular'
  | 'normal'

export function projectDayPhase(opts: {
  date: Date
  anchorStart: string | null
  cycleLen: number
  periodLen: number
  lutealLen: number
  hasFlowLog: boolean
}): ProjectedPhase {
  const { date, anchorStart, cycleLen, periodLen, lutealLen, hasFlowLog } = opts
  if (hasFlowLog) return 'menstrual'
  if (!anchorStart || cycleLen < 15) return 'normal'

  const daysSince = differenceInDays(date, parseISO(anchorStart))
  // Normalize into 0..cycleLen-1 for any date (past or future)
  const dayInCycle = ((daysSince % cycleLen) + cycleLen) % cycleLen

  const ovDay = cycleLen - lutealLen - 1 // 0-indexed ovulation day within the cycle
  const fertileStart = ovDay - 5
  const fertileEnd = ovDay + 1

  if (dayInCycle < periodLen) return 'menstrual-prevista'
  if (dayInCycle === ovDay) return 'ovulacao'
  if (dayInCycle >= fertileStart && dayInCycle <= fertileEnd) return 'fertil'
  if (dayInCycle > fertileEnd) return 'lutea'
  return 'folicular'
}

/** Maps a projected phase to the educational phase key (for "what to expect"). */
export function projectedToPhase(
  p: ProjectedPhase,
): 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea' | null {
  switch (p) {
    case 'menstrual':
    case 'menstrual-prevista':
      return 'menstrual'
    case 'folicular':
      return 'folicular'
    case 'ovulacao':
    case 'fertil':
      return 'ovulatoria'
    case 'lutea':
      return 'lutea'
    default:
      return null
  }
}

/**
 * Plausibility bounds for a recorded cycle. These MUST match what the detector
 * accepts: a narrower window here would silently drop genuinely short cycles
 * (someone can run ~21 days, or less) and quietly bias every statistic upwards.
 */
const MIN_CYCLE = 15
const MAX_CYCLE = 60

function validLengths(cycles: Cycle[]): number[] {
  return cycles
    .filter((c) => c.comprimento != null && c.comprimento >= MIN_CYCLE && c.comprimento <= MAX_CYCLE)
    .map((c) => c.comprimento as number)
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

/**
 * Baseline cycle length — the MEDIAN of the recent window, not a mean.
 *
 * A couple of atypical months must not redefine what is normal for her: someone
 * whose cycles run ~21 days should keep being predicted at ~21 while a 28-day
 * stretch is still the exception. A mean (especially one weighted towards recent
 * cycles) chases those outliers; the median only moves once the new pattern
 * actually becomes the majority — which is also when it's real.
 */
export function medianCycleLength(cycles: Cycle[], windowSize = 6): number {
  const valid = validLengths(cycles)
  if (valid.length === 0) return 28
  return median(valid.slice(-windowSize))
}

export interface BaselineShift {
  from: number
  to: number
  direction: 'longer' | 'shorter'
  cyclesInNewPattern: number
}

/**
 * Detects a SUSTAINED change in her usual cycle length instead of quietly
 * absorbing it. A move like ~21 → ~28 days is itself a clinical signal (medication,
 * stress, thyroid, the menopause transition…), so the app should name it.
 *
 * Requires every recent cycle to sit on the same side of the old baseline, so a
 * single odd month never triggers it.
 */
export function detectBaselineShift(
  cycles: Cycle[],
  opts: { run?: number; minDelta?: number } = {},
): BaselineShift | null {
  const run = opts.run ?? 3
  const minDelta = opts.minDelta ?? 4
  const lengths = validLengths(cycles)
  if (lengths.length < run + 2) return null

  const recent = lengths.slice(-run)
  const previous = lengths.slice(Math.max(0, lengths.length - run - 6), lengths.length - run)
  if (previous.length < 2) return null

  const before = median(previous)
  const now = median(recent)
  const delta = now - before
  if (Math.abs(delta) < minDelta) return null

  const consistent = delta > 0 ? recent.every((l) => l > before) : recent.every((l) => l < before)
  if (!consistent) return null

  return {
    from: before,
    to: now,
    direction: delta > 0 ? 'longer' : 'shorter',
    cyclesInNewPattern: run,
  }
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
  const lengths = validLengths(cycles)
  if (lengths.length < 2) return null
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / lengths.length
  return Math.round(Math.sqrt(variance) * 10) / 10
}

/**
 * Detects clinically noteworthy patterns and returns gentle, non-alarmist flags.
 * These are NOT diagnoses — they're cues to consider talking to a professional.
 * Based on widely-used reference ranges (ACOG / FIGO).
 */
export interface HealthFlag {
  level: 'info' | 'atencao'
  title: string
  text: string
}

export function cycleHealthFlags(
  cycles: Cycle[],
  lutealLength: number | null,
  idade?: number | null,
): HealthFlag[] {
  const flags: HealthFlag[] = []
  const lengths = validLengths(cycles)

  // FIGO irregularity threshold depends on age: 8 days for 26–41, but 10 days
  // for 18–25 and 42–45 — wider natural variation at both ends of the range.
  const limiarIrregular = idade != null && (idade <= 25 || idade >= 42) ? 10 : 8
  let curtos = false
  let irregular = false

  if (lengths.length >= 2) {
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length

    // FIGO (2018): normal cycle frequency is 24–38 days for ages 18–45.
    if (mean < 24) {
      curtos = true
      flags.push({
        level: 'atencao',
        title: 'Ciclos curtos',
        text: `Seus ciclos têm em média ${Math.round(mean)} dias — menos de 24 (menstruação frequente). Vale conversar com um ginecologista.`,
      })
    } else if (mean > 38) {
      flags.push({
        level: 'atencao',
        title: 'Ciclos longos',
        text: `Seus ciclos têm em média ${Math.round(mean)} dias — mais de 38 (menstruação infrequente). Pode valer uma avaliação médica.`,
      })
    }

    const range = Math.max(...lengths) - Math.min(...lengths)
    if (range >= limiarIrregular) {
      irregular = true
      flags.push({
        level: 'atencao',
        title: 'Ciclos irregulares',
        text: `Seus ciclos variaram ${range} dias entre o mais curto e o mais longo. Para a sua idade, variações de ${limiarIrregular} dias ou mais podem merecer investigação.`,
      })
    }
  }

  // Context for the menopause transition: cycles typically SHORTEN first and then
  // become erratic. Framed as context, never as a diagnosis.
  if (idade != null && idade >= 40 && (curtos || irregular)) {
    flags.push({
      level: 'info',
      title: 'Pode ser a transição menopausal',
      text: 'A partir dos 40, é comum os ciclos encurtarem e depois ficarem irregulares — faz parte da transição para a menopausa. Não é a única explicação possível (medicamentos e tireoide também alteram o ciclo), por isso vale levar esse histórico ao seu médico.',
    })
  }

  if (lutealLength != null && lutealLength < 10) {
    flags.push({
      level: 'atencao',
      title: 'Fase lútea curta',
      text: `Sua fase lútea média é de ${lutealLength} dias. Fases lúteas abaixo de 10 dias podem afetar a fertilidade — considere conversar com um especialista.`,
    })
  }

  // Detect a long bleed (> 8 days) from any cycle with start/end recorded
  const longBleed = cycles.find((c) => {
    if (!c.dataFim) return false
    const len = differenceInDays(parseISO(c.dataFim), parseISO(c.dataInicio)) + 1
    return len > 8
  })
  if (longBleed) {
    flags.push({
      level: 'atencao',
      title: 'Menstruação prolongada',
      text: 'Registramos uma menstruação com mais de 8 dias. Sangramentos prolongados merecem atenção médica.',
    })
  }

  // Short bleeding — only as a PATTERN (avg ≤ 2 days across ≥ 2 recorded bleeds),
  // never on a single episode, to avoid false alarms from incomplete logging.
  const bleedDurations = cycles
    .filter((c) => c.dataFim)
    .map((c) => differenceInDays(parseISO(c.dataFim as string), parseISO(c.dataInicio)) + 1)
  if (bleedDurations.length >= 2) {
    const avgBleed = bleedDurations.reduce((a, b) => a + b, 0) / bleedDurations.length
    if (avgBleed <= 2) {
      flags.push({
        level: 'atencao',
        title: 'Sangramento curto',
        text: 'Suas menstruações têm durado cerca de 1 a 2 dias. Sangramentos muito curtos ou escassos podem merecer avaliação — vale conversar com um profissional.',
      })
    }
  }

  return flags
}

export interface CyclePrediction {
  nextPeriodStart: string
  // Uncertainty range for the next period (based on cycle variability)
  nextPeriodRangeStart: string
  nextPeriodRangeEnd: string
  fertileWindowStart: string
  fertileWindowEnd: string
  predictedOvulation: string
  // True when ovulation was CONFIRMED by symptothermal data this cycle (not just predicted)
  ovulationConfirmed: boolean
  ovulationMethod: 'sintotermico' | 'temperatura' | 'muco' | null
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

export interface PredictOptions {
  lutealLength?: number          // person's own avg luteal length (from confirmed ovulations)
  variability?: number | null    // std-dev of cycle length, for the uncertainty range
  confirmedOvulation?: {         // ovulation already confirmed this cycle via symptothermal data
    date: string
    method: 'sintotermico' | 'temperatura' | 'muco'
    confirmed: boolean
  } | null
}

/**
 * Adaptive cycle prediction.
 *
 * Improvements over naive calendar prediction:
 * - Ovulation is anchored on the person's OWN average luteal length when available
 *   (luteal phase is the stable part of the cycle), instead of a fixed 14 days.
 * - When this cycle's ovulation has already been CONFIRMED via temperature/mucus,
 *   the fertile window and next-period date are recomputed from that real anchor.
 * - Produces an uncertainty RANGE for the next period using measured variability.
 * - Confidence reflects both data quantity and symptothermal confirmation.
 */
export function predictCycle(
  lastPeriodStart: string,
  cycleLength: number,
  periodLength: number,
  cycleCount: number,
  opts: PredictOptions = {},
): CyclePrediction {
  const start = parseISO(lastPeriodStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentCycleDay = differenceInDays(today, start) + 1

  const lutealLength = opts.lutealLength ?? 14

  // Ovulation: use confirmed date if we have one, else predict from luteal length.
  let ovulationDate: Date
  let ovulationConfirmed = false
  let ovulationMethod: CyclePrediction['ovulationMethod'] = null

  if (opts.confirmedOvulation) {
    ovulationDate = parseISO(opts.confirmedOvulation.date)
    ovulationConfirmed = opts.confirmedOvulation.confirmed
    ovulationMethod = opts.confirmedOvulation.method
  } else {
    const ovulationDayIndex = cycleLength - lutealLength
    ovulationDate = addDays(start, ovulationDayIndex - 1)
  }

  const ovulationDayIndex = differenceInDays(ovulationDate, start) + 1

  // Fertile window: sperm survive up to 5 days, egg ~24h → ov-5 to ov+1
  const fertileStart = addDays(ovulationDate, -5)
  const fertileEnd = addDays(ovulationDate, 1)
  const lutealStart = addDays(ovulationDate, 1)

  // Next period: if ovulation confirmed, next period = ovulation + luteal length.
  const nextPeriod = opts.confirmedOvulation
    ? addDays(ovulationDate, lutealLength)
    : addDays(start, cycleLength)
  const daysUntilNext = differenceInDays(nextPeriod, today)

  // Uncertainty range from variability (±1 std dev, min ±1 day, cap ±5 days).
  const spread = Math.min(5, Math.max(1, Math.round(opts.variability ?? 2)))
  const nextPeriodRangeStart = addDays(nextPeriod, -spread)
  const nextPeriodRangeEnd = addDays(nextPeriod, spread)

  const daysToOvulation = differenceInDays(ovulationDate, today)
  const isFertileToday = isWithinInterval(today, { start: fertileStart, end: fertileEnd })

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

  // Confidence: data quantity + confirmation bonus.
  let confidence: CyclePrediction['confidence']
  if (ovulationConfirmed && cycleCount >= 3) confidence = 'alta'
  else if (cycleCount < 3) confidence = ovulationConfirmed ? 'media' : 'baixa'
  else if (cycleCount <= 6) confidence = 'media'
  else confidence = 'alta'

  return {
    nextPeriodStart: format(nextPeriod, 'yyyy-MM-dd'),
    nextPeriodRangeStart: format(nextPeriodRangeStart, 'yyyy-MM-dd'),
    nextPeriodRangeEnd: format(nextPeriodRangeEnd, 'yyyy-MM-dd'),
    fertileWindowStart: format(fertileStart, 'yyyy-MM-dd'),
    fertileWindowEnd: format(fertileEnd, 'yyyy-MM-dd'),
    predictedOvulation: format(ovulationDate, 'yyyy-MM-dd'),
    ovulationConfirmed,
    ovulationMethod,
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
