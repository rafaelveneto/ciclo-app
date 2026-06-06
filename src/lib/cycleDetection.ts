import { differenceInDays, parseISO, format, addDays } from 'date-fns'
import type { DailyLog, Cycle } from '../db/database'

/**
 * Derives menstrual cycles automatically from daily logs.
 *
 * Clinical rules:
 * - "Flow day" = log with fluxo.intensidade set.
 * - Cycle Day 1 (period start) = first flow day after a gap of >= 2 days without flow.
 *   (A single skipped day inside a period is tolerated.)
 * - Period END = last consecutive flow day of that bleed.
 * - Cycle length = days between consecutive period starts.
 * - The most recent period start is the ongoing cycle (comprimento = undefined).
 */
export function detectCyclesFromLogs(logs: DailyLog[]): Cycle[] {
  const flowDays = logs
    .filter((l) => l.fluxo?.intensidade)
    .map((l) => l.data)
    .sort()

  if (flowDays.length === 0) return []

  const bleeds: { start: string; end: string }[] = []
  let bleedStart = flowDays[0]
  let bleedEnd = flowDays[0]

  for (let i = 1; i < flowDays.length; i++) {
    const gap = differenceInDays(parseISO(flowDays[i]), parseISO(bleedEnd))
    if (gap <= 2) {
      bleedEnd = flowDays[i]
    } else {
      bleeds.push({ start: bleedStart, end: bleedEnd })
      bleedStart = flowDays[i]
      bleedEnd = flowDays[i]
    }
  }
  bleeds.push({ start: bleedStart, end: bleedEnd })

  const cycles: Cycle[] = []
  for (let i = 0; i < bleeds.length; i++) {
    const dataInicio = bleeds[i].start
    const dataFim = bleeds[i].end
    let comprimento: number | undefined

    if (i < bleeds.length - 1) {
      const len = differenceInDays(parseISO(bleeds[i + 1].start), parseISO(dataInicio))
      if (len >= 15 && len <= 60) comprimento = len
    }

    cycles.push({ dataInicio, dataFim, comprimento })
  }

  return cycles
}

/** Merges an onboarding seed start with detected cycles, avoiding duplicates. */
export function mergeCycles(detected: Cycle[], seedStart: string | null): Cycle[] {
  if (!seedStart) return detected
  const hasNearby = detected.some(
    (c) => Math.abs(differenceInDays(parseISO(c.dataInicio), parseISO(seedStart))) <= 3,
  )
  if (hasNearby) return detected
  const merged = [...detected, { dataInicio: seedStart }]
  return merged.sort((a, b) => (a.dataInicio > b.dataInicio ? 1 : -1))
}

/** Mucus peak = last fertile-quality mucus day (Billings). Peak+1 ~ ovulation. */
export function detectMucusPeak(
  logs: DailyLog[],
  cycleStart: string,
  cycleEnd: string,
): string | null {
  const fertileMucus = logs
    .filter((l) => {
      if (l.data < cycleStart || l.data > cycleEnd) return false
      const t = l.muco?.tipo
      return t === 'elástico' || t === 'aquoso'
    })
    .map((l) => l.data)
    .sort()
  if (fertileMucus.length === 0) return null
  return fertileMucus[fertileMucus.length - 1]
}

export interface OvulationConfirmation {
  date: string
  method: 'sintotermico' | 'temperatura' | 'muco' | null
  confirmed: boolean
}

/** Symptothermal (Sensiplan) double-check: temp shift AND mucus peak must agree. */
export function confirmOvulation(
  logs: DailyLog[],
  cycleStart: string,
  cycleEnd: string,
): OvulationConfirmation | null {
  const temps = logs
    .filter((l) => l.tbc != null && l.data >= cycleStart && l.data <= cycleEnd)
    .map((l) => ({ date: l.data, temp: l.tbc as number }))
    .sort((a, b) => (a.date > b.date ? 1 : -1))

  const mucusPeak = detectMucusPeak(logs, cycleStart, cycleEnd)

  let thermalShiftDate: string | null = null
  if (temps.length >= 8) {
    const baselineReadings = temps.slice(4, 10).map((t) => t.temp)
    const baseline = baselineReadings.reduce((a, b) => a + b, 0) / baselineReadings.length
    const coverLine = baseline + 0.2
    for (let i = 5; i < temps.length - 2; i++) {
      if (
        temps[i].temp > coverLine &&
        temps[i + 1].temp > coverLine &&
        temps[i + 2].temp > coverLine
      ) {
        thermalShiftDate = format(addDays(parseISO(temps[i].date), -1), 'yyyy-MM-dd')
        break
      }
    }
  }

  if (thermalShiftDate && mucusPeak) {
    const agree = Math.abs(differenceInDays(parseISO(thermalShiftDate), parseISO(mucusPeak))) <= 3
    if (agree) return { date: thermalShiftDate, method: 'sintotermico', confirmed: true }
    return { date: thermalShiftDate, method: 'temperatura', confirmed: false }
  }
  if (thermalShiftDate) return { date: thermalShiftDate, method: 'temperatura', confirmed: true }
  if (mucusPeak) {
    return { date: format(addDays(parseISO(mucusPeak), 1), 'yyyy-MM-dd'), method: 'muco', confirmed: false }
  }
  return null
}

/** Person's own average luteal-phase length (most stable cycle metric). */
export function averageLutealLength(cycles: Cycle[], logs: DailyLog[]): number | null {
  const lutealLengths: number[] = []
  for (const cycle of cycles) {
    if (!cycle.comprimento) continue
    const cycleEnd = format(addDays(parseISO(cycle.dataInicio), cycle.comprimento - 1), 'yyyy-MM-dd')
    const ov = confirmOvulation(logs, cycle.dataInicio, cycleEnd)
    if (ov?.confirmed) {
      const nextStart = addDays(parseISO(cycle.dataInicio), cycle.comprimento)
      const luteal = differenceInDays(nextStart, parseISO(ov.date))
      if (luteal >= 9 && luteal <= 17) lutealLengths.push(luteal)
    }
  }
  if (lutealLengths.length === 0) return null
  return Math.round(lutealLengths.reduce((a, b) => a + b, 0) / lutealLengths.length)
}
