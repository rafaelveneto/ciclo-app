import { useState, useEffect } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db, setSetting, buildBackup, importBackup } from '../db/database'
import { useDb } from '../hooks/useDb'
import { usePwaInstall } from '../hooks/usePwaInstall'

const modos = [
  { value: 'geral', label: 'Acompanhamento geral' },
  { value: 'ttc', label: 'Tentando engravidar (TTC)' },
  { value: 'evitando', label: 'Evitando gravidez' },
  { value: 'gestacao', label: 'Gestação' },
  { value: 'perimenopausa', label: 'Perimenopausa / Menopausa' },
]

export default function Ajustes() {
  const { settings, allLogs } = useDb()
  const { isInstalled } = usePwaInstall()
  const [nome, setNome] = useState('')
  const [modo, setModo] = useState('')
  const [ultimoPeriodo, setUltimoPeriodo] = useState('')
  const [comprimentoCiclo, setComprimentoCiclo] = useState('28')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null)

  // Backup status
  const ultimoBackup = settings['ultimoBackup'] ? parseISO(settings['ultimoBackup']) : null
  const diasDesdeBackup = ultimoBackup ? differenceInDays(new Date(), ultimoBackup) : null
  const backupVencido = diasDesdeBackup == null || diasDesdeBackup >= 30
  const primeiroRegistro = allLogs[0]?.data ?? null

  useEffect(() => {
    if (settings['nome']) setNome(settings['nome'])
    if (settings['modo']) setModo(settings['modo'])
    if (settings['ultimoPeriodo']) setUltimoPeriodo(settings['ultimoPeriodo'])
    if (settings['comprimentoCiclo']) setComprimentoCiclo(settings['comprimentoCiclo'])
  }, [settings])

  const handleSave = async () => {
    if (nome.trim()) await setSetting('nome', nome.trim())
    if (modo) await setSetting('modo', modo)
    if (ultimoPeriodo) await setSetting('ultimoPeriodo', ultimoPeriodo)
    if (comprimentoCiclo) await setSetting('comprimentoCiclo', comprimentoCiclo)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    setBusy('export')
    try {
      const data = await buildBackup()
      const json = JSON.stringify(data)
      const filename = `ciclo-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      const file = new File([json], filename, { type: 'application/json' })

      // On mobile, prefer the native share sheet so the file can go straight to
      // WhatsApp / Drive / e-mail / AirDrop — the easiest way to move to a new phone.
      const canShareFile =
        typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      if (canShareFile) {
        try {
          await navigator.share({ files: [file], title: 'Backup do Ciclo' })
        } catch (err) {
          // User cancelled the share sheet — that's fine, just stop.
          if ((err as Error)?.name === 'AbortError') return
          downloadBlob(json, filename)
        }
      } else {
        downloadBlob(json, filename)
      }
      await setSetting('ultimoBackup', new Date().toISOString())
    } finally {
      setBusy(null)
    }
  }

  const downloadBlob = (json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setBusy('import')
      try {
        const data = JSON.parse(await file.text())
        if (!data || (!data.dailyLogs && !data.settings && !data.medications)) {
          alert('Este arquivo não parece ser um backup do Ciclo.')
          return
        }
        const r = await importBackup(data)
        alert(`Backup restaurado!\n\n${r.logs} dias · ${r.settings} ajustes · ${r.meds} medicamentos`)
        window.location.reload()
      } catch {
        alert('Erro ao importar. Verifique se o arquivo é um backup válido do Ciclo.')
      } finally {
        setBusy(null)
      }
    }
    input.click()
  }

  const handleClearData = async () => {
    if (
      window.confirm(
        'Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.',
      )
    ) {
      await db.cycles.clear()
      await db.dailyLogs.clear()
      await db.settings.clear()
      await db.medications.clear()
      window.location.reload()
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">
        <span className="gradient-text">Ajustes</span>
      </h1>

      {/* Install confirmation (the global banner handles prompting when not installed) */}
      {isInstalled && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm text-emerald-700 font-medium">App instalado no dispositivo</span>
        </div>
      )}

      {/* Privacy — our biggest differentiator */}
      <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
        <div className="flex items-center gap-2.5 mb-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <p className="font-bold text-base">Seus dados são só seus</p>
        </div>
        <p className="text-sm text-white/85 leading-relaxed mb-3">
          Diferente da maioria dos apps, o Ciclo guarda tudo apenas no seu aparelho.
        </p>
        <div className="space-y-1.5">
          {['Sem conta e sem login', 'Nada é enviado para a nuvem', 'Sem rastreamento e sem anúncios', 'Você exporta ou apaga quando quiser'].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-90">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm text-white/90">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modo de uso */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Modo de uso
        </h2>
        <div className="space-y-2">
          {modos.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setModo(m.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border transition-colors text-sm ${
                modo === m.value
                  ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:border-violet-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ciclo info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
          Perfil &amp; ciclo
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Seu nome
          </label>
          <input
            type="text"
            value={nome}
            maxLength={40}
            placeholder="Seu nome ou apelido"
            onChange={(e) => setNome(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Início do último período
          </label>
          <input
            type="date"
            value={ultimoPeriodo}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setUltimoPeriodo(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Comprimento médio do ciclo (dias)
          </label>
          <input
            type="number"
            min="21"
            max="45"
            value={comprimentoCiclo}
            onChange={(e) => setComprimentoCiclo(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all"
          style={{ background: saved
            ? 'linear-gradient(135deg, #22c55e, #34d399)'
            : 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
        >
          {saved ? '✓ Salvo!' : 'Salvar configurações'}
        </button>
      </div>

      {/* Backup reminder */}
      {allLogs.length > 0 && backupVencido && (
        <div className="rounded-2xl p-4 border flex items-start gap-3" style={{
          borderColor: 'rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.06)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.4 2.6L21 8" /><path d="M21 3v5h-5" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {diasDesdeBackup == null ? 'Faça seu primeiro backup' : 'Hora de fazer backup'}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
              Seus dados ficam só neste aparelho. Guarde uma cópia para não perder seu
              histórico se trocar de celular ou limpar o navegador.
            </p>
          </div>
        </div>
      )}

      {/* Backup & data */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Backup &amp; dados
        </h2>

        {/* Data summary */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">{allLogs.length} dias registrados</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {primeiroRegistro
                ? `desde ${format(parseISO(primeiroRegistro), "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
                : 'nenhum registro ainda'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Último backup</p>
            <p className={`text-xs font-medium ${backupVencido ? 'text-orange-500' : 'text-emerald-600'}`}>
              {ultimoBackup
                ? format(ultimoBackup, "d/MM/yyyy", { locale: ptBR })
                : 'nunca'}
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={busy != null}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {busy === 'export' ? 'Gerando…' : 'Salvar / enviar backup'}
        </button>
        <button
          onClick={handleImport}
          disabled={busy != null}
          className="w-full border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><polyline points="8 10 12 14 16 10" /><line x1="12" y1="14" x2="12" y2="2" />
          </svg>
          {busy === 'import' ? 'Restaurando…' : 'Restaurar backup'}
        </button>
        <p className="text-xs text-slate-400 leading-relaxed text-center px-2">
          Para mudar de celular: salve o backup, abra o Ciclo no aparelho novo e toque em Restaurar.
        </p>

        <button
          onClick={handleClearData}
          className="w-full border border-red-200 text-red-600 py-3 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors mt-1"
        >
          Apagar todos os dados
        </button>
      </div>

      {/* About */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Sobre
        </h2>
        <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-800">Ciclo</strong> é um aplicativo de acompanhamento
            menstrual feito para ser a sua melhor amiga durante todo o ciclo.
          </p>
          <p>
            ⚕️ Este app é apenas informativo e não substitui orientação médica profissional.
            Consulte sempre um profissional de saúde para decisões sobre saúde reprodutiva.
          </p>
          <p className="text-xs text-slate-400 mt-2">Versão 1.0.0 · Ciclo App</p>
        </div>
      </div>
    </div>
  )
}
