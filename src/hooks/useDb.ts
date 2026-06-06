import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { format } from 'date-fns'

export function useDb() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const cycles = useLiveQuery(() => db.cycles.orderBy('dataInicio').toArray(), []) ?? []

  const todayLog = useLiveQuery(() => db.dailyLogs.where('data').equals(today).first(), [today])

  const settings = useLiveQuery(async () => {
    const all = await db.settings.toArray()
    const map: Record<string, string> = {}
    for (const s of all) {
      map[s.chave] = s.valor
    }
    return map
  }, []) ?? {}

  const medications = useLiveQuery(() => db.medications.toArray(), []) ?? []

  const allLogs = useLiveQuery(() => db.dailyLogs.orderBy('data').toArray(), []) ?? []

  return {
    cycles,
    todayLog,
    settings,
    medications,
    allLogs,
    today,
  }
}
