import { useState } from 'react'
import { articles, type Article } from '../lib/articles'

/**
 * Self-contained educational library. A card opens a full-screen overlay with a
 * list of short, responsible articles about the cycle. Fully offline.
 */
export default function SaibaMais() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Article | null>(null)

  const close = () => { setOpen(false); setSelected(null) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-left active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>📚</div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Aprenda sobre seu ciclo</p>
            <p className="text-xs text-slate-500 mt-0.5">Guias curtos sobre fases, fertilidade, TPM e mais</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-white max-w-md mx-auto flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
            <button onClick={selected ? () => setSelected(null) : close}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100" aria-label="Voltar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="font-bold text-slate-900 flex-1 truncate">
              {selected ? selected.titulo : 'Saiba mais'}
            </h2>
            <button onClick={close} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Fechar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="p-4 space-y-2.5">
                {articles.map((a) => (
                  <button key={a.id} onClick={() => setSelected(a)}
                    className="w-full text-left bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-3 active:scale-[0.99] transition-transform">
                    <span className="text-2xl leading-none mt-0.5">{a.emoji}</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{a.resumo}</p>
                    </div>
                  </button>
                ))}
                <p className="text-[11px] text-slate-400 leading-relaxed px-1 pt-2">
                  Conteúdo informativo, baseado em referências como FIGO, método Billings e Sensiplan.
                  Não substitui a orientação de um profissional de saúde.
                </p>
              </div>
            ) : (
              <div className="p-5">
                <div className="text-4xl mb-3">{selected.emoji}</div>
                <h1 className="text-xl font-bold text-slate-900 mb-4">{selected.titulo}</h1>
                <div className="space-y-3">
                  {selected.conteudo.map((p, i) => (
                    <p key={i} className="text-sm text-slate-600 leading-relaxed">{p}</p>
                  ))}
                </div>
                <div className="mt-6 px-4 py-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ⚕️ Informativo — para dúvidas ou sintomas que te preocupam, procure um profissional de saúde.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
