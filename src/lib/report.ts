import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Cycle, DailyLog } from '../db/database'
import type { HealthFlag } from './cycleCalc'

export interface ReportInput {
  nome: string
  cycles: Cycle[]
  logs: DailyLog[]
  avgCycleLen: number
  avgPeriodLen: number
  variability: number | null
  lutealLen: number | null
  flags: HealthFlag[]
}

function countTop(items: string[], limit: number): { label: string; pct: number }[] {
  const counts: Record<string, number> = {}
  for (const it of items) counts[it] = (counts[it] ?? 0) + 1
  const total = items.length
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, n]) => ({ label, pct: Math.round((n / total) * 100) }))
}

/**
 * Builds a clean, clinical one/two-page PDF a user can hand to (or send to) her
 * doctor. Generated entirely on-device; jsPDF is imported dynamically so it never
 * weighs on the app's initial load. Shares natively when possible, else downloads.
 */
export async function generateMedicalReportPdf(input: ReportInput): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const PAGE_W = 595
  const M = 48 // margin
  let y = M

  const ensure = (needed: number) => {
    if (y + needed > 842 - M) {
      doc.addPage()
      y = M
    }
  }

  const heading = (text: string) => {
    ensure(34)
    doc.setFillColor(139, 92, 246)
    doc.rect(M, y, 4, 16, 'F')
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(text, M + 12, y + 13)
    y += 30
  }

  const line = (label: string, value: string) => {
    ensure(20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(100, 116, 139)
    doc.text(label, M, y)
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.text(value, M + 240, y)
    y += 18
  }

  const paragraph = (text: string, color: [number, number, number] = [100, 116, 139]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, PAGE_W - M * 2)
    ensure(lines.length * 13 + 4)
    doc.text(lines, M, y)
    y += lines.length * 13 + 4
  }

  // ── Title ────────────────────────────────────────────────────────────────
  doc.setFillColor(250, 245, 255)
  doc.rect(0, 0, PAGE_W, 92, 'F')
  doc.setTextColor(139, 92, 246)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Relatório de Ciclo Menstrual', M, 44)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text(`${input.nome || 'Usuária'}  ·  gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`, M, 64)
  const sortedLogs = [...input.logs].sort((a, b) => (a.data > b.data ? 1 : -1))
  if (sortedLogs.length > 0) {
    const ini = format(parseISO(sortedLogs[0].data), 'dd/MM/yyyy')
    const fim = format(parseISO(sortedLogs[sortedLogs.length - 1].data), 'dd/MM/yyyy')
    doc.text(`Período coberto: ${ini} a ${fim}  ·  ${input.logs.length} dias registrados`, M, 80)
  }
  y = 116

  // ── Resumo do ciclo ────────────────────────────────────────────────────────
  heading('Resumo do ciclo')
  const regularidade = input.variability == null ? '—'
    : input.variability <= 3 ? 'Regular'
    : input.variability <= 7 ? 'Moderadamente regular'
    : 'Irregular'
  line('Comprimento médio do ciclo', `${input.avgCycleLen} dias`)
  line('Duração média da menstruação', `${input.avgPeriodLen} dias`)
  line('Variabilidade entre ciclos', input.variability == null ? '—' : `± ${input.variability} dias`)
  line('Regularidade', regularidade)
  line('Fase lútea média', input.lutealLen == null ? 'não confirmada' : `${input.lutealLen} dias`)
  y += 8

  // ── Histórico de ciclos ────────────────────────────────────────────────────
  const completed = input.cycles.filter((c) => c.comprimento != null)
  if (completed.length > 0) {
    heading('Histórico de ciclos')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(100, 116, 139)
    ensure(18)
    doc.text('Início', M, y)
    doc.text('Duração da menstruação', M + 150, y)
    doc.text('Comprimento do ciclo', M + 330, y)
    y += 6
    doc.setDrawColor(226, 232, 240)
    doc.line(M, y, PAGE_W - M, y)
    y += 14
    const recent = [...completed].sort((a, b) => (a.dataInicio > b.dataInicio ? -1 : 1)).slice(0, 12)
    for (const c of recent) {
      ensure(16)
      const dur = c.dataFim ? differenceInDays(parseISO(c.dataFim), parseISO(c.dataInicio)) + 1 : null
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(30, 41, 59)
      doc.text(format(parseISO(c.dataInicio), 'dd/MM/yyyy'), M, y)
      doc.text(dur ? `${dur} dias` : '—', M + 150, y)
      doc.text(`${c.comprimento} dias`, M + 330, y)
      y += 16
    }
    y += 10
  }

  // ── Humor e sintomas ───────────────────────────────────────────────────────
  const moods = countTop(input.logs.flatMap((l) => l.humor ?? []), 5)
  const symptoms = countTop(input.logs.flatMap((l) => l.sintomas ?? []), 6)
  if (moods.length > 0 || symptoms.length > 0) {
    heading('Humor e sintomas mais frequentes')
    if (moods.length > 0) {
      paragraph('Humor: ' + moods.map((m) => `${m.label} (${m.pct}%)`).join(', '))
    }
    if (symptoms.length > 0) {
      paragraph('Sintomas: ' + symptoms.map((s) => `${s.label} (${s.pct}%)`).join(', '))
    }
    y += 6
  }

  // ── Observações de saúde ───────────────────────────────────────────────────
  if (input.flags.length > 0) {
    heading('Pontos de atenção')
    for (const f of input.flags) {
      ensure(30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(217, 119, 6)
      doc.text(`• ${f.title}`, M, y)
      y += 14
      paragraph(f.text)
      y += 2
    }
  }

  // ── Footer / disclaimer ────────────────────────────────────────────────────
  ensure(60)
  y += 10
  doc.setDrawColor(226, 232, 240)
  doc.line(M, y, PAGE_W - M, y)
  y += 16
  paragraph(
    'Este relatório foi gerado automaticamente pelo app Ciclo a partir dos registros da usuária. ' +
      'Tem caráter informativo e não substitui avaliação médica. As previsões e estimativas baseiam-se ' +
      'no histórico registrado e podem variar.',
    [148, 163, 184],
  )

  // ── Output: share or download ──────────────────────────────────────────────
  const filename = `relatorio-ciclo-${format(new Date(), 'yyyy-MM-dd')}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  const canShareFile =
    typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  if (canShareFile) {
    try {
      await navigator.share({ files: [file], title: 'Relatório de Ciclo Menstrual' })
      return
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
    }
  }
  doc.save(filename)
}
