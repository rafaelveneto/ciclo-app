import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsertDailyLog, type DailyLog } from '../db/database'
import ChipSelector from '../components/ChipSelector'
import ScaleSelector from '../components/ScaleSelector'

const sintomasOptions = [
  { value: 'Cólicas', label: 'Cólicas' },
  { value: 'Dor lombar', label: 'Dor lombar' },
  { value: 'Dor de cabeça', label: 'Dor de cabeça' },
  { value: 'Sensibilidade nos seios', label: 'Sensib. nos seios' },
  { value: 'Inchaço', label: 'Inchaço' },
  { value: 'Náusea', label: 'Náusea' },
  { value: 'Tontura', label: 'Tontura' },
  { value: 'Fadiga', label: 'Fadiga' },
  { value: 'Dores articulares', label: 'Dores articulares' },
  { value: 'Acne', label: 'Acne' },
]

const humorOptions = [
  { value: 'Calma', label: 'Calma' },
  { value: 'Irritabilidade', label: 'Irritabilidade' },
  { value: 'Ansiedade', label: 'Ansiedade' },
  { value: 'Tristeza', label: 'Tristeza' },
  { value: 'Choro fácil', label: 'Choro fácil' },
  { value: 'Euforia', label: 'Euforia' },
  { value: 'Foco', label: 'Foco' },
  { value: 'Confiança', label: 'Confiança' },
]

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-slate-700">{title}</span>
        <span className="text-slate-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export default function Registrar() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const existingLog = useLiveQuery(
    () => db.dailyLogs.where('data').equals(selectedDate).first(),
    [selectedDate],
  )

  // Form state
  const [fluxoIntensidade, setFluxoIntensidade] = useState<string>('')
  const [fluxoCor, setFluxoCor] = useState<string>('')
  const [fluxoCoagulos, setFluxoCoagulos] = useState(false)
  const [mucoTipo, setMucoTipo] = useState<string>('')
  const [tbc, setTbc] = useState<string>('')
  const [sintomas, setSintomas] = useState<string[]>([])
  const [humor, setHumor] = useState<string[]>([])
  const [energiaNivel, setEnergiaNivel] = useState<number | undefined>()
  const [sonoQualidade, setSonoQualidade] = useState<number | undefined>()
  const [sonoHoras, setSonoHoras] = useState<string>('')
  const [libido, setLibido] = useState<number | undefined>()
  const [sexoAtivo, setSexoAtivo] = useState(false)
  const [sexoProtecao, setSexoProtecao] = useState(false)
  const [notas, setNotas] = useState('')

  // Populate form when existing log loads
  useEffect(() => {
    if (existingLog) {
      setFluxoIntensidade(existingLog.fluxo?.intensidade ?? '')
      setFluxoCor(existingLog.fluxo?.cor ?? '')
      setFluxoCoagulos(existingLog.fluxo?.coagulos ?? false)
      setMucoTipo(existingLog.muco?.tipo ?? '')
      setTbc(existingLog.tbc != null ? String(existingLog.tbc) : '')
      setSintomas(existingLog.sintomas ?? [])
      setHumor(existingLog.humor ?? [])
      setEnergiaNivel(existingLog.energiaNivel)
      setSonoQualidade(existingLog.sonoQualidade)
      setSonoHoras(existingLog.sonoHoras != null ? String(existingLog.sonoHoras) : '')
      setLibido(existingLog.libido)
      setSexoAtivo(existingLog.sexo?.ativo ?? false)
      setSexoProtecao(existingLog.sexo?.protecao ?? false)
      setNotas(existingLog.notas ?? '')
    } else {
      // Clear form for new date
      setFluxoIntensidade('')
      setFluxoCor('')
      setFluxoCoagulos(false)
      setMucoTipo('')
      setTbc('')
      setSintomas([])
      setHumor([])
      setEnergiaNivel(undefined)
      setSonoQualidade(undefined)
      setSonoHoras('')
      setLibido(undefined)
      setSexoAtivo(false)
      setSexoProtecao(false)
      setNotas('')
    }
  }, [existingLog, selectedDate])

  const handleSave = async () => {
    setSaving(true)
    const log: DailyLog = {
      data: selectedDate,
      fluxo: fluxoIntensidade
        ? { intensidade: fluxoIntensidade, cor: fluxoCor || undefined, coagulos: fluxoCoagulos }
        : undefined,
      muco: mucoTipo ? { tipo: mucoTipo } : undefined,
      tbc: tbc ? parseFloat(tbc) : undefined,
      sintomas: sintomas.length > 0 ? sintomas : undefined,
      humor: humor.length > 0 ? humor : undefined,
      energiaNivel,
      sonoQualidade,
      sonoHoras: sonoHoras ? parseFloat(sonoHoras) : undefined,
      libido,
      sexo: { ativo: sexoAtivo, protecao: sexoProtecao },
      notas: notas || undefined,
    }
    await upsertDailyLog(log)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fluxoOptions = [
    { value: 'spotting', label: 'Manchas' },
    { value: 'leve', label: 'Leve' },
    { value: 'moderado', label: 'Moderado' },
    { value: 'intenso', label: 'Intenso' },
    { value: 'muito intenso', label: 'Muito intenso' },
  ]

  const corOptions = [
    { value: 'vermelho vivo', label: 'Vermelho vivo' },
    { value: 'vermelho escuro', label: 'Verm. escuro' },
    { value: 'marrom', label: 'Marrom' },
    { value: 'rosa', label: 'Rosa' },
    { value: 'laranja', label: 'Laranja' },
  ]

  const mucoOptions = [
    { value: 'seco', label: 'Seco' },
    { value: 'pegajoso', label: 'Pegajoso' },
    { value: 'cremoso', label: 'Cremoso' },
    { value: 'aquoso', label: 'Aquoso' },
    { value: 'elástico', label: 'Elástico (clara de ovo)' },
  ]

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Registrar</h1>

      {/* Date picker */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <label className="block text-sm font-semibold text-slate-600 mb-2">Data do registro</label>
        <input
          type="date"
          value={selectedDate}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        {existingLog && (
          <p className="text-xs text-amber-600 mt-2">
            ✏️ Você já tem um registro para esta data. Editando...
          </p>
        )}
      </div>

      {/* Fluxo menstrual */}
      <Section title="🩸 Fluxo menstrual" defaultOpen>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-500 mb-2">Intensidade</p>
            <ChipSelector
              options={fluxoOptions}
              selected={fluxoIntensidade ? [fluxoIntensidade] : []}
              onChange={(vals) => setFluxoIntensidade(vals[vals.length - 1] ?? '')}
            />
          </div>
          {fluxoIntensidade && (
            <>
              <div>
                <p className="text-sm text-slate-500 mb-2">Cor</p>
                <ChipSelector
                  options={corOptions}
                  selected={fluxoCor ? [fluxoCor] : []}
                  onChange={(vals) => setFluxoCor(vals[vals.length - 1] ?? '')}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fluxoCoagulos}
                  onChange={(e) => setFluxoCoagulos(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-500"
                />
                <span className="text-sm text-slate-700">Presença de coágulos</span>
              </label>
            </>
          )}
        </div>
      </Section>

      {/* Muco cervical */}
      <Section title="💧 Muco cervical">
        <div>
          <p className="text-sm text-slate-500 mb-2">Tipo</p>
          <ChipSelector
            options={mucoOptions}
            selected={mucoTipo ? [mucoTipo] : []}
            onChange={(vals) => setMucoTipo(vals[vals.length - 1] ?? '')}
          />
        </div>
      </Section>

      {/* Temperatura basal */}
      <Section title="🌡️ Temperatura basal (TBC)">
        <div>
          <p className="text-sm text-slate-500 mb-2">Temperatura (°C) — meça ao acordar, sem sair da cama</p>
          <input
            type="number"
            step="0.01"
            min="35"
            max="40"
            value={tbc}
            onChange={(e) => setTbc(e.target.value)}
            placeholder="Ex: 36.50"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </Section>

      {/* Sintomas */}
      <Section title="💊 Sintomas físicos">
        <ChipSelector
          options={sintomasOptions}
          selected={sintomas}
          onChange={setSintomas}
        />
      </Section>

      {/* Humor */}
      <Section title="💭 Humor">
        <ChipSelector
          options={humorOptions}
          selected={humor}
          onChange={setHumor}
        />
      </Section>

      {/* Energia */}
      <Section title="⚡ Energia">
        <ScaleSelector value={energiaNivel} onChange={setEnergiaNivel} />
      </Section>

      {/* Sono */}
      <Section title="😴 Sono">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-500 mb-2">Qualidade do sono</p>
            <ScaleSelector
              value={sonoQualidade}
              onChange={setSonoQualidade}
              labels={['Péssimo', 'Regular', 'Bom', 'Ótimo']}
            />
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-2">Horas dormidas</p>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={sonoHoras}
              onChange={(e) => setSonoHoras(e.target.value)}
              placeholder="Ex: 7.5"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>
      </Section>

      {/* Libido */}
      <Section title="💕 Libido">
        <ScaleSelector
          value={libido}
          onChange={setLibido}
          labels={['Nenhuma', 'Baixa', 'Moderada', 'Alta']}
        />
      </Section>

      {/* Atividade sexual */}
      <Section title="❤️ Atividade sexual">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sexoAtivo}
              onChange={(e) => setSexoAtivo(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-500"
            />
            <span className="text-sm text-slate-700">Atividade sexual hoje</span>
          </label>
          {sexoAtivo && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sexoProtecao}
                onChange={(e) => setSexoProtecao(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-500"
              />
              <span className="text-sm text-slate-700">Usou proteção</span>
            </label>
          )}
        </div>
      </Section>

      {/* Notas */}
      <Section title="📝 Notas livres">
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Anote qualquer observação sobre como você está se sentindo..."
          rows={4}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"
        />
      </Section>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all shadow-md ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'
        } disabled:opacity-60`}
      >
        {saved ? '✓ Salvo!' : saving ? 'Salvando...' : 'Salvar registro'}
      </button>
    </div>
  )
}
