import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fillFlowRange } from '../db/database'

interface Props {
  open: boolean
  onClose: () => void
  initialStart?: string
  initialEnd?: string
}

const intensidades = [
  { value: 'leve', label: 'Leve' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'intenso', label: 'Intenso' },
]

/**
 * Capture a whole menstruation span at once (start → end). Fills each day's flow
 * via fillFlowRange, which keeps the derived-cycle model correct without storing a
 * separate "end date". Useful when she didn't log every single day.
 */
export default function RegistrarPeriodo({ open, onClose, initialStart, initialEnd }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [inicio, setInicio] = useState(initialStart ?? today)
  const [fim, setFim] = useState(initialEnd ?? today)
  const [intensidade, setIntensidade] = useState('moderado')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setInicio(initialStart ?? today)
      setFim(initialEnd ?? today)
      setIntensidade('moderado')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStart, initialEnd])

  if (!open) return null

  const span = differenceInDays(parseISO(fim), parseISO(inicio))
  const erro = span < 0
    ? 'A data de término não pode ser antes do início.'
    : span > 14
    ? 'O período parece muito longo (máx. 15 dias).'
    : fim > today
    ? 'A data de término não pode ser no futuro.'
    : null
  const dias = span >= 0 ? span + 1 : 0

  const salvar = async () => {
    if (erro) return
    setSaving(true)
    await fillFlowRange(inicio, fim, intensidade)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: 'linear-gradient(90deg, #fb7185, #ec4899)' }} />

        <h2 className="text-lg font-bold text-slate-900 mb-1">Registrar menstruação</h2>
        <p className="text-sm text-slate-500 mb-5">Marque os dias do seu sangramento de uma vez.</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Início</label>
              <input type="date" value={inicio} max={today} onChange={(e) => setInicio(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Término</label>
              <input type="date" value={fim} min={inicio} max={today} onChange={(e) => setFim(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Intensidade do fluxo</label>
            <div className="flex gap-2">
              {intensidades.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setIntensidade(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
                    intensidade === opt.value
                      ? 'border-transparent text-white font-medium'
                      : 'border-slate-200 text-slate-600'
                  }`}
                  style={intensidade === opt.value ? { background: 'linear-gradient(135deg, #fb7185, #ef4444)' } : {}}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Aplicado aos dias ainda sem registro. Você pode ajustar cada dia depois.
            </p>
          </div>

          {erro
            ? <p className="text-xs text-rose-500">{erro}</p>
            : <p className="text-xs text-slate-500">Serão marcados <strong>{dias}</strong> {dias === 1 ? 'dia' : 'dias'} de menstruação.</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium text-sm">
              Cancelar
            </button>
            <button onClick={salvar} disabled={!!erro || saving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #fb7185, #ec4899)' }}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
