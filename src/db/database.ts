import Dexie, { type Table } from 'dexie'

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
}

class CicloDatabase extends Dexie {
  cycles!: Table<Cycle>
  dailyLogs!: Table<DailyLog>
  settings!: Table<Setting>
  medications!: Table<Medication>

  constructor() {
    super('CicloDB')
    this.version(1).stores({
      cycles: '++id, dataInicio, dataFim, comprimento',
      dailyLogs: '++id, &data',
      settings: '++id, chave',
      medications: '++id, nome, horario, frequencia, ativo',
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
