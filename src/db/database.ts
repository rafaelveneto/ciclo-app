import Dexie, { type Table } from 'dexie'
import { parseISO, addDays, format, differenceInDays } from 'date-fns'

export interface Cycle {
  id?: number
  dataInicio: string // YYYY-MM-DD
  dataFim?: string
  comprimento?: number
}

export interface DailyLog {
  id?: number
  data: string // YYYY-MM-DD
  fluxo?: {
    intensidade?: string
    cor?: string
    coagulos?: boolean
    tamanhoCoagulos?: string
  }
  muco?: {
    tipo?: string
    quantidade?: string
  }
  tbc?: number // basal body temperature
  sintomas?: string[] // array of symptom keys
  humor?: string[]
  energiaNivel?: number // 0-3
  sonoQualidade?: number // 0-3
  sonoHoras?: number
  libido?: number // 0-3
  apetite?: string[]
  digestao?: string
  sexo?: { ativo?: boolean; protecao?: boolean }
  exercicio?: { tipo?: string; duracao?: number }
  peso?: number
  medicamentos?: string[]
  notas?: string
}

export interface Setting {
  id?: number
  chave: string
  valor: string
}

export interface Medication {
  id?: number
  nome: string
  horario: string
  frequencia: string
  ativo: boolean
  /** When she started it — this is what lets us line a medication up against a
   *  change in cycle pattern (several psychotropics can alter the cycle). */
  inicio?: string // YYYY-MM-DD
  fim?: string // YYYY-MM-DD, if stopped
  dose?: string
  observacao?: string
}

/** A blood test. Values are keyed by the catalogue in lib/exames.ts. */
export interface Exame {
  id?: number
  data: string // YYYY-MM-DD (collection date)
  /** Cycle day on the collection date — FSH/estradiol are only interpretable with it. */
  diaDoCiclo?: number
  valores: { chave: string; valor: number }[]
  notas?: string
}

class CicloDatabase extends Dexie {
  cycles!: Table<Cycle>
  dailyLogs!: Table<DailyLog>
  settings!: Table<Setting>
  medications!: Table<Medication>
  exames!: Table<Exame>

  constructor() {
    super('CicloDB')
    this.version(1).stores({
      cycles: '++id, dataInicio, dataFim, comprimento',
      dailyLogs: '++id, &data',
      settings: '++id, chave',
      medications: '++id, nome, horario, frequencia, ativo',
    })
    // v2 adds blood tests and medication start/stop dates (purely additive).
    this.version(2).stores({
      cycles: '++id, dataInicio, dataFim, comprimento',
      dailyLogs: '++id, &data',
      settings: '++id, chave',
      medications: '++id, nome, horario, frequencia, ativo, inicio',
      exames: '++id, data',
    })
  }
}

export const db = new CicloDatabase()

// Helper: get setting by key
export async function getSetting(chave: string): Promise<string | null> {
  const s = await db.settings.where('chave').equals(chave).first()
  return s?.valor ?? null
}

// Helper: set setting by key
export async function setSetting(chave: string, valor: string): Promise<void> {
  const existing = await db.settings.where('chave').equals(chave).first()
  if (existing?.id != null) {
    await db.settings.update(existing.id, { valor })
  } else {
    await db.settings.add({ chave, valor })
  }
}

// Helper: upsert daily log
export async function upsertDailyLog(log: DailyLog): Promise<void> {
  const existing = await db.dailyLogs.where('data').equals(log.data).first()
  if (existing?.id != null) {
    await db.dailyLogs.put({ ...log, id: existing.id })
  } else {
    await db.dailyLogs.add(log)
  }
}

/**
 * Fills a menstruation span (start..end inclusive) with flow, day by day. This is
 * how we capture period DURATION while keeping the derived-cycle model intact: the
 * cycle algorithm reads contiguous flow days, so a complete span yields a correct
 * dataFim/duration. Days that already have a flow intensity are preserved (we only
 * fill the gaps), and other data on each day is never touched. Returns days filled.
 */
export async function fillFlowRange(
  start: string,
  end: string,
  intensidade = 'moderado',
): Promise<number> {
  const span = differenceInDays(parseISO(end), parseISO(start))
  if (span < 0 || span > 14) return 0 // guard against typos / abuse
  let filled = 0
  for (let i = 0; i <= span; i++) {
    const ds = format(addDays(parseISO(start), i), 'yyyy-MM-dd')
    const existing = await db.dailyLogs.where('data').equals(ds).first()
    if (existing?.fluxo?.intensidade) continue // keep days she already detailed
    await upsertDailyLog({ ...(existing ?? {}), data: ds, fluxo: { ...(existing?.fluxo ?? {}), intensidade } })
    filled++
  }
  return filled
}

// ─── Backup / restore ──────────────────────────────────────────────────────

export interface BackupData {
  version?: number
  exportedAt?: string
  dailyLogs?: DailyLog[]
  settings?: Setting[]
  medications?: Medication[]
  exames?: Exame[]
  cycles?: Cycle[] // legacy (cycles are now derived from logs) — ignored on import
}

/** Snapshot of everything worth keeping. Cycles are derived, so we don't export them. */
export async function buildBackup(): Promise<BackupData> {
  const [dailyLogs, settings, medications, exames] = await Promise.all([
    db.dailyLogs.toArray(),
    db.settings.toArray(),
    db.medications.toArray(),
    db.exames.toArray(),
  ])
  return { version: 3, exportedAt: new Date().toISOString(), dailyLogs, settings, medications, exames }
}

/**
 * Restore/merge a backup.
 *
 * Crucially, we merge by NATURAL keys (date for logs, chave for settings, nome
 * for meds) — never by the auto-increment id. Ids are device-local; importing by
 * id from another phone would silently overwrite unrelated rows or violate the
 * unique `data` index. Same-day entries are replaced by the backup's version.
 */
export async function importBackup(
  data: BackupData,
): Promise<{ logs: number; settings: number; meds: number; exames: number }> {
  const result = { logs: 0, settings: 0, meds: 0, exames: 0 }

  if (Array.isArray(data.dailyLogs)) {
    for (const raw of data.dailyLogs) {
      if (!raw?.data) continue
      const { id: _id, ...rest } = raw
      await upsertDailyLog(rest as DailyLog)
      result.logs++
    }
  }

  if (Array.isArray(data.settings)) {
    for (const s of data.settings) {
      if (!s?.chave || s.chave === 'ultimoBackup') continue
      await setSetting(s.chave, s.valor)
      result.settings++
    }
  }

  if (Array.isArray(data.medications)) {
    for (const m of data.medications) {
      if (!m?.nome) continue
      const { id: _id, ...rest } = m
      const existing = await db.medications.where('nome').equals(m.nome).first()
      if (existing?.id != null) await db.medications.update(existing.id, rest)
      else await db.medications.add(rest as Medication)
      result.meds++
    }
  }

  // Blood tests — merged by collection date (the natural key), same rule as logs.
  if (Array.isArray(data.exames)) {
    for (const e of data.exames) {
      if (!e?.data) continue
      const { id: _id, ...rest } = e
      const existing = await db.exames.where('data').equals(e.data).first()
      if (existing?.id != null) await db.exames.update(existing.id, rest)
      else await db.exames.add(rest as Exame)
      result.exames++
    }
  }

  return result
}
