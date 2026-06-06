import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { format } from 'date-fns'
import { detectCyclesFromLogs, mergeCycles } from '../lib/cycleDetection'

export function useDb() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const todayLog = useLiveQuery(() => db.dailyLogs.where('data').equals(today).first(), [today])

  const settings = useLiveQuery(async () => {
    const all = await db.settings.toArray()
    const map: Record<string, string> = {}
    for (const s of all) map[s.chave] = s.valor
    return map
  }, []) ?? {}

  const medications = useLiveQuery(() => db.medications.toArray(), []) ?? []

  const allLogs = useLiveQuery(() => db.dailyLogs.orderBy('data').toArray(), []) ?? []

  // Cycles are DERIVED from logged menstruation (single source of truth),
  // merged with the onboarding seed. The db.cycles table is no longer used
  // directly so every screen sees the same, always-up-to-date cycle history.
  const cycles = useMemo(() => {
    const detected = detectCyclesFromLogs(allLogs)
    return mergeCycles(detected, settings['ultimoPeriodo'] ?? null)
  }, [allLogs, settings])

  return {
    cycles,
    todayLog,
    settings,
    medications,
    allLogs,
    today,
  }
}
