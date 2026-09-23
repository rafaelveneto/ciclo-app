/**
 * Catalogue of the blood tests that matter most for cycle health.
 *
 * Reference ranges are the ones commonly used for adult women, and are shown only
 * as a hint — every lab prints its own range, and that one prevails. Tests whose
 * interpretation depends on the cycle day (FSH, estradiol) or on age (AMH) carry
 * no range on purpose: showing one would be misleading.
 */

export interface ExameItem {
  chave: string
  label: string
  unidade: string
  /** [min, max] — null on either side means "no limit on that side". */
  ref?: [number | null, number | null]
  cicloDependente?: boolean
  nota?: string
}

export const EXAME_CATALOGO: ExameItem[] = [
  { chave: 'TSH', label: 'TSH', unidade: 'µUI/mL', ref: [0.4, 4.0], nota: 'Tireoide — altera a duração do ciclo.' },
  { chave: 'T4L', label: 'T4 livre', unidade: 'ng/dL', ref: [0.8, 1.8], nota: 'Tireoide.' },
  { chave: 'PRL', label: 'Prolactina', unidade: 'ng/mL', ref: [null, 25], nota: 'Pode subir com alguns medicamentos e alterar o ciclo.' },
  { chave: 'FSH', label: 'FSH', unidade: 'mUI/mL', cicloDependente: true, nota: 'Interpretar pelo dia do ciclo; no 3º dia ajuda a avaliar a reserva ovariana.' },
  { chave: 'E2', label: 'Estradiol', unidade: 'pg/mL', cicloDependente: true, nota: 'Varia muito ao longo do ciclo.' },
  { chave: 'AMH', label: 'AMH (hormônio antimülleriano)', unidade: 'ng/mL', nota: 'Reserva ovariana — interpretar pela idade.' },
  { chave: 'FER', label: 'Ferritina', unidade: 'ng/mL', ref: [15, 150], nota: 'Estoque de ferro — menstruação frequente pode reduzir.' },
  { chave: 'HB', label: 'Hemoglobina', unidade: 'g/dL', ref: [12, 16], nota: 'Anemia.' },
  { chave: 'VITD', label: 'Vitamina D (25-OH)', unidade: 'ng/mL', ref: [30, 100] },
  { chave: 'B12', label: 'Vitamina B12', unidade: 'pg/mL', ref: [200, 900] },
]

export function itemPorChave(chave: string): ExameItem | undefined {
  return EXAME_CATALOGO.find((i) => i.chave === chave)
}

export type StatusValor = 'baixo' | 'alto' | 'dentro' | 'sem-referencia'

/** Compares a value against the common reference range, when one applies. */
export function statusValor(chave: string, valor: number): StatusValor {
  const item = itemPorChave(chave)
  if (!item?.ref) return 'sem-referencia'
  const [min, max] = item.ref
  if (min != null && valor < min) return 'baixo'
  if (max != null && valor > max) return 'alto'
  return 'dentro'
}

export function textoReferencia(item: ExameItem): string {
  if (!item.ref) return 'sem faixa fixa'
  const [min, max] = item.ref
  if (min != null && max != null) return `${min} – ${max} ${item.unidade}`
  if (max != null) return `até ${max} ${item.unidade}`
  if (min != null) return `acima de ${min} ${item.unidade}`
  return 'sem faixa fixa'
}
