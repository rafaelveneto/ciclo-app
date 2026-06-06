import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { db, setSetting } from '../db/database'
import { useDb } from '../hooks/useDb'
import { usePwaInstall } from '../hooks/usePwaInstall'
import IosInstallBanner from '../components/IosInstallBanner'

const modos = [
  { value: 'geral', label: 'Acompanhamento geral' },
  { value: 'ttc', label: 'Tentando engravidar (TTC)' },
  { value: 'evitando', label: 'Evitando gravidez' },
  { value: 'gestacao', label: 'Gestação' },
  { value: 'perimenopausa', label: 'Perimenopausa / Menopausa' },
]

export default function Ajustes() {
  const { settings } = useDb()
  const { canInstall, isInstalled, isIosSafari, install } = usePwaInstall()
  const [modo, setModo] = useState('')
  const [ultimoPeriodo, setUltimoPeriodo] = useState('')
  const [comprimentoCiclo, setComprimentoCiclo] = useState('28')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings['modo']) setModo(settings['modo'])
    if (settings['ultimoPeriodo']) setUltimoPeriodo(settings['ultimoPeriodo'])
    if (settings['comprimentoCiclo']) setComprimentoCiclo(settings['comprimentoCiclo'])
  }, [settings])

  const handleSave = async () => {
    if (modo) await setSetting('modo', modo)
    if (ultimoPeriodo) await setSetting('ultimoPeriodo', ultimoPeriodo)
    if (comprimentoCiclo) await setSetting('comprimentoCiclo', comprimentoCiclo)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = async () => {
    const cycles = await db.cycles.toArray()
    const logs = await db.dailyLogs.toArray()
    const settingsData = await db.settings.toArray()
    const meds = await db.medications.toArray()

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: 1,
      cycles,
      dailyLogs: logs,
      settings: settingsData,
      medications: meds,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ciclo-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const data = JSON.parse(text)
        if (data.cycles) await db.cycles.bulkPut(data.cycles)
        if (data.dailyLogs) await db.dailyLogs.bulkPut(data.dailyLogs)
        if (data.settings) await db.settings.bulkPut(data.settings)
        if (data.medications) await db.medications.bulkPut(data.medications)
        alert('Dados importados com sucesso!')
        window.location.reload()
      } catch {
        alert('Erro ao importar os dados. Verifique o arquivo.')
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

      {/* PWA install */}
      {canInstall && !isInstalled && (
        <button
          onClick={install}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
        >
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2v13M8 11l4 4 4-4" />
              <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
            </svg>
            <div className="text-left">
              <p className="font-semibold text-sm">Instalar app</p>
              <p className="text-xs opacity-80">Adicionar à tela inicial</p>
            </div>
          </div>
          <span className="text-sm opacity-80">→</span>
        </button>
      )}
      {/* iOS Safari instructions */}
      {isIosSafari && !isInstalled && !canInstall && (
        <IosInstallBanner />
      )}

      {isInstalled && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm text-emerald-700 font-medium">App instalado no dispositivo</span>
        </div>
      )}

      {/* Modo de uso */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
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
                  ? 'border-rose-500 bg-rose-50 text-rose-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:border-rose-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ciclo info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Dados do ciclo
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Início do último período
          </label>
          <input
            type="date"
            value={ultimoPeriodo}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setUltimoPeriodo(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
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
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'
          }`}
        >
          {saved ? '✓ Salvo!' : 'Salvar configurações'}
        </button>
      </div>

      {/* Data management */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Dados
        </h2>
        <button
          onClick={handleExport}
          className="w-full border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          📤 Exportar dados (JSON)
        </button>
        <button
          onClick={handleImport}
          className="w-full border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          📥 Importar dados (JSON)
        </button>
        <button
          onClick={handleClearData}
          className="w-full border border-red-200 text-red-600 py-3 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors"
        >
          🗑️ Apagar todos os dados
        </button>
      </div>

      {/* About / Privacy */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Sobre &amp; Privacidade
        </h2>
        <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-800">Ciclo</strong> é um aplicativo de acompanhamento
            menstrual com foco em privacidade total.
          </p>
          <p>
            🔒 <strong>Todos os seus dados são armazenados exclusivamente no seu dispositivo.</strong>{' '}
            Nenhuma informação é enviada para servidores externos, não há contas de usuário, sem
            rastreamento ou analytics.
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
