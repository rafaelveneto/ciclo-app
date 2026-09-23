import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db, type Medication } from '../db/database'

const vazio = (): Medication => ({
  nome: '', horario: '', frequencia: '', ativo: true, inicio: '', dose: '', observacao: '',
})

/**
 * Medications with a START date. That date is the point of this screen: several
 * common drugs (antidepressants, benzodiazepines, thyroid medication) can shift
 * cycle length, so lining a medication up against a change in the cycle is often
 * the most useful thing to bring to a doctor.
 */
export default function MedicamentosCard() {
  const meds = useLiveQuery(() => db.medications.toArray(), []) ?? []
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState<Medication>(vazio())

  const hoje = format(new Date(), 'yyyy-MM-dd')
  const set = <K extends keyof Medication>(k: K, v: Medication[K]) => setForm((f) => ({ ...f, [k]: v }))

  const abrirNovo = () => { setForm(vazio()); setAberto(true) }
  const abrirEdicao = (m: Medication) => { setForm({ ...m }); setAberto(true) }

  const salvar = async () => {
    if (!form.nome.trim()) return
    const dados = { ...form, nome: form.nome.trim() }
    if (dados.id != null) await db.medications.update(dados.id, dados)
    else await db.medications.add(dados)
    setAberto(false)
  }

  const excluir = async () => {
    if (form.id != null && window.confirm('Apagar este medicamento?')) {
      await db.medications.delete(form.id)
      setAberto(false)
    }
  }

  const ativos = meds.filter((m) => m.ativo)
  const inativos = meds.filter((m) => !m.ativo)

  const linha = (m: Medication) => (
    <button key={m.id} onClick={() => abrirEdicao(m)}
      className="w-full text-left border border-slate-100 rounded-xl p-3 flex items-center justify-between active:scale-[0.99] transition-transform">
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${m.ativo ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
          {m.nome}{m.dose ? ` · ${m.dose}` : ''}
        </p>
        <p className="text-[11px] text-slate-400">
          {m.inicio
            ? `desde ${format(parseISO(m.inicio), "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
            : 'sem data de início'}
          {m.fim ? ` · parou em ${format(parseISO(m.fim), 'd/MM/yyyy')}` : ''}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Medicamentos</p>
          <button onClick={abrirNovo} className="text-xs font-semibold gradient-text">+ Adicionar</button>
        </div>

        {meds.length === 0 ? (
          <p className="text-sm text-slate-400 leading-relaxed">
            Anote o que você toma e desde quando. Alguns medicamentos alteram o ciclo — com a data de
            início, dá para ver se alguma mudança no seu padrão coincidiu com eles.
          </p>
        ) : (
          <div className="space-y-2">
            {ativos.map(linha)}
            {inativos.length > 0 && (
              <>
                <p className="text-[11px] text-slate-400 pt-1">Não usa mais</p>
                {inativos.map(linha)}
              </>
            )}
          </div>
        )}
      </div>

      {aberto && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setAberto(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-2xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899)' }} />
            <h2 className="text-lg font-bold text-slate-900 mb-5">
              {form.id != null ? 'Editar medicamento' : 'Adicionar medicamento'}
            </h2>

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome</label>
            <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)}
              placeholder="Ex: Vortioxetina"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200" />

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dose (opcional)</label>
            <input type="text" value={form.dose ?? ''} onChange={(e) => set('dose', e.target.value)}
              placeholder="Ex: 10 mg"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200" />

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Desde quando toma</label>
            <input type="date" value={form.inicio ?? ''} max={hoje} onChange={(e) => set('inicio', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
            <p className="text-[11px] text-slate-400 mt-1 mb-4">
              Mesmo uma data aproximada ajuda a cruzar com mudanças no seu ciclo.
            </p>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)}
                className="w-4 h-4 rounded accent-violet-500" />
              <span className="text-sm text-slate-700">Ainda tomo este medicamento</span>
            </label>

            {!form.ativo && (
              <>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Parou em (opcional)</label>
                <input type="date" value={form.fim ?? ''} max={hoje} onChange={(e) => set('fim', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </>
            )}

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Observação (opcional)</label>
            <textarea value={form.observacao ?? ''} onChange={(e) => set('observacao', e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-200" />

            <div className="flex gap-3 mt-5">
              {form.id != null ? (
                <button onClick={excluir} className="px-4 border border-red-200 text-red-600 py-3 rounded-xl font-medium text-sm">
                  Apagar
                </button>
              ) : (
                <button onClick={() => setAberto(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium text-sm">
                  Cancelar
                </button>
              )}
              <button onClick={salvar} disabled={!form.nome.trim()}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                Salvar
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Este registro é só para acompanhamento. Nunca mude ou interrompa um medicamento por
              conta própria — fale com quem receitou.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
