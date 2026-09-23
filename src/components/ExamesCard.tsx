import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db, type Exame } from '../db/database'
import { useCycle } from '../hooks/useCycle'
import { EXAME_CATALOGO, itemPorChave, statusValor, textoReferencia } from '../lib/exames'

const toNum = (s: string): number | undefined => {
  if (!s.trim()) return undefined
  const v = parseFloat(s.replace(',', '.'))
  return Number.isFinite(v) ? v : undefined
}
const onlyDecimal = (s: string) => s.replace(/[^\d.,]/g, '')

const corStatus: Record<string, string> = {
  baixo: 'text-sky-600',
  alto: 'text-orange-600',
  dentro: 'text-emerald-600',
  'sem-referencia': 'text-slate-500',
}
const rotuloStatus: Record<string, string> = {
  baixo: 'abaixo da faixa comum',
  alto: 'acima da faixa comum',
  dentro: 'dentro da faixa comum',
  'sem-referencia': '',
}

export default function ExamesCard() {
  const exames = useLiveQuery(() => db.exames.orderBy('data').reverse().toArray(), []) ?? []
  const { lastPeriodStart } = useCycle()
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [valores, setValores] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState('')
  const [salvando, setSalvando] = useState(false)

  const hoje = format(new Date(), 'yyyy-MM-dd')

  const abrir = () => {
    setData(hoje); setValores({}); setNotas(''); setAberto(true)
  }

  const salvar = async () => {
    const preenchidos = Object.entries(valores)
      .map(([chave, v]) => ({ chave, valor: toNum(v) }))
      .filter((x): x is { chave: string; valor: number } => x.valor !== undefined)
    if (preenchidos.length === 0 && !notas.trim()) return
    setSalvando(true)
    // Cycle day at collection — FSH/estradiol are only interpretable with it.
    let diaDoCiclo: number | undefined
    if (lastPeriodStart) {
      const d = differenceInDays(parseISO(data), parseISO(lastPeriodStart)) + 1
      if (d >= 1 && d <= 60) diaDoCiclo = d
    }
    await db.exames.add({ data, diaDoCiclo, valores: preenchidos, notas: notas.trim() || undefined })
    setSalvando(false)
    setAberto(false)
  }

  const excluir = async (e: Exame) => {
    if (e.id != null && window.confirm('Apagar este exame?')) await db.exames.delete(e.id)
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Exames de sangue</p>
          <button onClick={abrir} className="text-xs font-semibold gradient-text">+ Adicionar</button>
        </div>

        {exames.length === 0 ? (
          <p className="text-sm text-slate-400 leading-relaxed">
            Registre seus exames para acompanhar a evolução e levar tudo junto na consulta.
          </p>
        ) : (
          <div className="space-y-3">
            {exames.map((e) => (
              <div key={e.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {format(parseISO(e.data), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {e.diaDoCiclo && (
                      <p className="text-[11px] text-slate-400">dia {e.diaDoCiclo} do ciclo</p>
                    )}
                  </div>
                  <button onClick={() => excluir(e)} className="text-xs text-slate-300 hover:text-red-500" aria-label="Apagar exame">
                    apagar
                  </button>
                </div>
                <div className="space-y-1">
                  {e.valores.map((v) => {
                    const item = itemPorChave(v.chave)
                    const st = statusValor(v.chave, v.valor)
                    return (
                      <div key={v.chave} className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-slate-500">{item?.label ?? v.chave}</span>
                        <span className={`text-xs font-semibold ${corStatus[st]}`}>
                          {v.valor} {item?.unidade}
                          {st !== 'dentro' && st !== 'sem-referencia' && (
                            <span className="font-normal"> · {rotuloStatus[st]}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {e.notas && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{e.notas}</p>}
              </div>
            ))}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              As faixas mostradas são as de referência mais comuns. Vale sempre a faixa impressa no
              laudo do seu laboratório — e a interpretação é do seu médico.
            </p>
          </div>
        )}
      </div>

      {aberto && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setAberto(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10 shadow-2xl max-h-[88vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }} />
            <h2 className="text-lg font-bold text-slate-900 mb-1">Adicionar exame</h2>
            <p className="text-sm text-slate-500 mb-5">Preencha só o que aparecer no seu laudo.</p>

            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data da coleta</label>
            <input type="date" value={data} max={hoje} onChange={(ev) => setData(ev.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200" />

            <div className="space-y-3">
              {EXAME_CATALOGO.map((item) => (
                <div key={item.chave}>
                  <div className="flex items-baseline justify-between mb-1">
                    <label className="text-sm text-slate-700">{item.label}</label>
                    <span className="text-[11px] text-slate-400">{textoReferencia(item)}</span>
                  </div>
                  <input type="text" inputMode="decimal" placeholder={item.unidade}
                    value={valores[item.chave] ?? ''}
                    onChange={(ev) => setValores((p) => ({ ...p, [item.chave]: onlyDecimal(ev.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
                  {item.cicloDependente && (
                    <p className="text-[11px] text-cyan-600 mt-1">Depende do dia do ciclo — registramos isso junto.</p>
                  )}
                </div>
              ))}
            </div>

            <label className="block text-xs font-semibold text-slate-500 mt-4 mb-1.5">Outros resultados / observações</label>
            <textarea value={notas} onChange={(ev) => setNotas(ev.target.value)} rows={3}
              placeholder="Cole aqui qualquer outro resultado do laudo"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-200" />

            <div className="flex gap-3 mt-5">
              <button onClick={() => setAberto(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-medium text-sm">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>
                {salvando ? 'Salvando…' : 'Salvar exame'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
