import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, upsertDailyLog, type DailyLog } from '../db/database'
import ChipSelector from '../components/ChipSelector'
import ScaleSelector from '../components/ScaleSelector'
import { mucoFertilityLabel } from '../lib/cycleCalc'

// Parses a decimal that may use a comma (pt-BR) or a dot. Returns undefined if empty/invalid.
function toNum(s: string): number | undefined {
  if (!s) return undefined
  const v = parseFloat(s.replace(',', '.'))
  return Number.isFinite(v) ? v : undefined
}
// Keeps only digits, comma and dot while typing.
const onlyDecimal = (s: string) => s.replace(/[^\d.,]/g, '')

// Section icons — thin SVG line art
function SectionIcon({ type }: { type: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const icons: Record<string, React.ReactElement> = {
    fluxo:    <svg {...props} stroke="#ef4444"><circle cx="12" cy="12" r="4"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>,
    muco:     <svg {...props} stroke="#06b6d4"><path d="M12 2c0 0-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13z"/></svg>,
    tbc:      <svg {...props} stroke="#8b5cf6"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>,
    sintomas: <svg {...props} stroke="#f97316"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
    humor:    <svg {...props} stroke="#ec4899"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>,
    energia:  <svg {...props} stroke="#eab308"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    sono:     <svg {...props} stroke="#6366f1"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    libido:   <svg {...props} stroke="#ec4899"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    apetite:  <svg {...props} stroke="#22c55e"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>,
    sexo:     <svg {...props} stroke="#f43f5e"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>,
    notas:    <svg {...props} stroke="#94a3b8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>,
  }
  return icons[type] ?? null
}

function Section({
  id,
  title,
  hasData,
  children,
  defaultOpen = false,
}: {
  id: string
  title: string
  hasData?: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all ${open ? 'border border-slate-100' : 'border border-slate-100'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <SectionIcon type={id} />
        <span className="flex-1 font-semibold text-slate-700 text-sm">{title}</span>
        {hasData && (
          <div className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(135deg, #22c55e, #06b6d4)' }} />
        )}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-50">{children}</div>}
    </div>
  )
}

const sintomasOptions = [
  { value: 'Cólicas',                label: 'Cólicas' },
  { value: 'Dor lombar',             label: 'Dor lombar' },
  { value: 'Dor de cabeça',          label: 'Dor de cabeça' },
  { value: 'Enxaqueca',              label: 'Enxaqueca' },
  { value: 'Sensibilidade nos seios',label: 'Seios sensíveis' },
  { value: 'Inchaço',                label: 'Inchaço' },
  { value: 'Náusea',                 label: 'Náusea' },
  { value: 'Tontura',                label: 'Tontura' },
  { value: 'Fadiga',                 label: 'Fadiga' },
  { value: 'Dores articulares',      label: 'Dores articulares' },
  { value: 'Acne',                   label: 'Acne' },
  { value: 'Dor pélvica lateral',    label: 'Dor pélvica (Mittelschmerz)' },
]

const humorOptions = [
  { value: 'Calma',          label: 'Calma' },
  { value: 'Irritabilidade', label: 'Irritabilidade' },
  { value: 'Ansiedade',      label: 'Ansiedade' },
  { value: 'Tristeza',       label: 'Tristeza' },
  { value: 'Choro fácil',    label: 'Choro fácil' },
  { value: 'Sensibilidade',  label: 'Sensibilidade' },
  { value: 'Euforia',        label: 'Euforia' },
  { value: 'Foco',           label: 'Foco' },
  { value: 'Confiança',      label: 'Confiança' },
  { value: 'Indiferença',    label: 'Indiferença' },
]

const apetiteOptions = [
  { value: 'Normal',   label: 'Normal' },
  { value: 'Aumentado',label: 'Aumentado' },
  { value: 'Reduzido', label: 'Reduzido' },
  { value: 'Doce',     label: 'Vontade de doce' },
  { value: 'Salgado',  label: 'Vontade de salgado' },
  { value: 'Carboidratos', label: 'Vontade de carboidratos' },
]

const digestaoOptions = [
  { value: 'normal',       label: 'Normal' },
  { value: 'constipacao',  label: 'Constipação' },
  { value: 'diarreia',     label: 'Diarreia' },
  { value: 'gases',        label: 'Gases / Inchaço' },
  { value: 'nausea',       label: 'Náusea digestiva' },
]

const fluxoOptions = [
  { value: 'spotting',      label: 'Manchas' },
  { value: 'leve',          label: 'Leve' },
  { value: 'moderado',      label: 'Moderado' },
  { value: 'intenso',       label: 'Intenso' },
  { value: 'muito intenso', label: 'Muito intenso' },
]

const corOptions = [
  { value: 'rosa',           label: 'Rosa' },
  { value: 'vermelho vivo',  label: 'Vermelho vivo' },
  { value: 'vermelho escuro',label: 'Verm. escuro' },
  { value: 'marrom',         label: 'Marrom' },
  { value: 'preto',          label: 'Preto' },
]

// Mucus options with clinical significance
const mucoOptions = [
  { value: 'seco',      label: 'Seco — sem muco (infértil)' },
  { value: 'pegajoso',  label: 'Pegajoso — grumoso (infértil)' },
  { value: 'cremoso',   label: 'Cremoso — branco opaco (possivelmente fértil)' },
  { value: 'aquoso',    label: 'Aquoso — claro e fluido (fértil)' },
  { value: 'elástico',  label: 'Elástico — clara de ovo (pico de fertilidade)' },
]

const mucoQuantidadeOptions = [
  { value: 'pouco',     label: 'Pouco' },
  { value: 'médio',     label: 'Médio' },
  { value: 'abundante', label: 'Abundante' },
]

export default function Registrar({ initialDate }: { initialDate?: string }) {
  const [selectedDate, setSelectedDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const existingLog = useLiveQuery(
    () => db.dailyLogs.where('data').equals(selectedDate).first(),
    [selectedDate],
  )

  const [fluxoIntensidade, setFluxoIntensidade] = useState('')
  const [fluxoCor, setFluxoCor] = useState('')
  const [fluxoCoagulos, setFluxoCoagulos] = useState(false)
  const [mucoTipo, setMucoTipo] = useState('')
  const [mucoQuantidade, setMucoQuantidade] = useState('')
  const [tbc, setTbc] = useState('')
  const [sintomas, setSintomas] = useState<string[]>([])
  const [humor, setHumor] = useState<string[]>([])
  const [energiaNivel, setEnergiaNivel] = useState<number | undefined>()
  const [sonoQualidade, setSonoQualidade] = useState<number | undefined>()
  const [sonoHoras, setSonoHoras] = useState('')
  const [libido, setLibido] = useState<number | undefined>()
  const [apetite, setApetite] = useState<string[]>([])
  const [digestao, setDigestao] = useState('')
  const [peso, setPeso] = useState('')
  const [sexoAtivo, setSexoAtivo] = useState(false)
  const [sexoProtecao, setSexoProtecao] = useState(false)
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (existingLog) {
      setFluxoIntensidade(existingLog.fluxo?.intensidade ?? '')
      setFluxoCor(existingLog.fluxo?.cor ?? '')
      setFluxoCoagulos(existingLog.fluxo?.coagulos ?? false)
      setMucoTipo(existingLog.muco?.tipo ?? '')
      setMucoQuantidade(existingLog.muco?.quantidade ?? '')
      setTbc(existingLog.tbc != null ? String(existingLog.tbc) : '')
      setSintomas(existingLog.sintomas ?? [])
      setHumor(existingLog.humor ?? [])
      setEnergiaNivel(existingLog.energiaNivel)
      setSonoQualidade(existingLog.sonoQualidade)
      setSonoHoras(existingLog.sonoHoras != null ? String(existingLog.sonoHoras) : '')
      setLibido(existingLog.libido)
      setApetite(existingLog.apetite ?? [])
      setDigestao(existingLog.digestao ?? '')
      setPeso(existingLog.peso != null ? String(existingLog.peso) : '')
      setSexoAtivo(existingLog.sexo?.ativo ?? false)
      setSexoProtecao(existingLog.sexo?.protecao ?? false)
      setNotas(existingLog.notas ?? '')
    } else {
      setFluxoIntensidade(''); setFluxoCor(''); setFluxoCoagulos(false)
      setMucoTipo(''); setMucoQuantidade(''); setTbc('')
      setSintomas([]); setHumor([])
      setEnergiaNivel(undefined); setSonoQualidade(undefined); setSonoHoras('')
      setLibido(undefined); setApetite([]); setDigestao(''); setPeso('')
      setSexoAtivo(false); setSexoProtecao(false); setNotas('')
    }
  }, [existingLog, selectedDate])

  const handleSave = async () => {
    setSaving(true)
    const log: DailyLog = {
      data: selectedDate,
      fluxo: fluxoIntensidade
        ? { intensidade: fluxoIntensidade, cor: fluxoCor || undefined, coagulos: fluxoCoagulos }
        : undefined,
      muco: mucoTipo ? { tipo: mucoTipo, quantidade: mucoQuantidade || undefined } : undefined,
      tbc: toNum(tbc),
      sintomas: sintomas.length > 0 ? sintomas : undefined,
      humor: humor.length > 0 ? humor : undefined,
      energiaNivel,
      sonoQualidade,
      sonoHoras: toNum(sonoHoras),
      libido,
      apetite: apetite.length > 0 ? apetite : undefined,
      digestao: digestao || undefined,
      peso: toNum(peso),
      sexo: sexoAtivo ? { ativo: true, protecao: sexoProtecao } : undefined,
      notas: notas || undefined,
    }
    await upsertDailyLog(log)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasData = (vals: (string | string[] | number | boolean | undefined)[]) =>
    vals.some((v) => (Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined && v !== false))

  return (
    <div className="px-4 pt-6 pb-6 space-y-3">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        <span className="gradient-text">Registrar</span>
      </h1>

      {/* Date picker */}
      <div className="gradient-border p-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Data do registro
        </label>
        <input
          type="date"
          value={selectedDate}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 bg-white text-sm"
        />
        {existingLog && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
            Editando registro existente
          </p>
        )}
      </div>

      {/* Fluxo */}
      <Section id="fluxo" title="Fluxo menstrual" defaultOpen
        hasData={hasData([fluxoIntensidade])}>
        <div className="space-y-4 pt-3">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Intensidade</p>
            <ChipSelector
              options={fluxoOptions}
              selected={fluxoIntensidade ? [fluxoIntensidade] : []}
              onChange={(vals) => setFluxoIntensidade(vals[vals.length - 1] ?? '')}
            />
          </div>
          {fluxoIntensidade && (
            <>
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Cor</p>
                <ChipSelector
                  options={corOptions}
                  selected={fluxoCor ? [fluxoCor] : []}
                  onChange={(vals) => setFluxoCor(vals[vals.length - 1] ?? '')}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={fluxoCoagulos}
                  onChange={(e) => setFluxoCoagulos(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-500" />
                <span className="text-sm text-slate-700">Presença de coágulos</span>
              </label>
            </>
          )}
        </div>
      </Section>

      {/* Muco cervical */}
      <Section id="muco" title="Muco cervical" hasData={hasData([mucoTipo])}>
        <div className="space-y-4 pt-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Observe o muco ao longo do dia. O tipo mais elástico e transparente indica maior fertilidade.
          </p>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Tipo</p>
            <div className="space-y-2">
              {mucoOptions.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setMucoTipo(mucoTipo === opt.value ? '' : opt.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-all ${
                    mucoTipo === opt.value
                      ? 'border-transparent text-white'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                  style={mucoTipo === opt.value ? { background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {mucoTipo && (
              <p className="text-xs font-semibold mt-2" style={{
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                → {mucoFertilityLabel(mucoTipo)}
              </p>
            )}
          </div>
          {mucoTipo && mucoTipo !== 'seco' && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Quantidade</p>
              <ChipSelector
                options={mucoQuantidadeOptions}
                selected={mucoQuantidade ? [mucoQuantidade] : []}
                onChange={(vals) => setMucoQuantidade(vals[vals.length - 1] ?? '')}
              />
            </div>
          )}
        </div>
      </Section>

      {/* TBC */}
      <Section id="tbc" title="Temperatura basal (TBC)" hasData={hasData([tbc])}>
        <div className="pt-3">
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Meça ao acordar, antes de sair da cama, sempre no mesmo horário. Use termômetro com 2 casas decimais.
          </p>
          <div className="relative">
            <input type="text" inputMode="decimal" value={tbc}
              onChange={(e) => setTbc(onlyDecimal(e.target.value))}
              placeholder="Ex: 36,50"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 text-base font-mono" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">°C</span>
          </div>
        </div>
      </Section>

      {/* Sintomas */}
      <Section id="sintomas" title="Sintomas físicos" hasData={hasData([sintomas])}>
        <div className="pt-3">
          <ChipSelector options={sintomasOptions} selected={sintomas} onChange={setSintomas} />
        </div>
      </Section>

      {/* Humor */}
      <Section id="humor" title="Humor e emoções" hasData={hasData([humor])}>
        <div className="pt-3">
          <ChipSelector options={humorOptions} selected={humor} onChange={setHumor} />
        </div>
      </Section>

      {/* Energia */}
      <Section id="energia" title="Energia" hasData={hasData([energiaNivel])}>
        <div className="pt-3">
          <ScaleSelector value={energiaNivel} onChange={setEnergiaNivel}
            labels={['Esgotada', 'Baixa', 'Boa', 'Ótima']} />
        </div>
      </Section>

      {/* Sono */}
      <Section id="sono" title="Sono" hasData={hasData([sonoQualidade, sonoHoras])}>
        <div className="space-y-4 pt-3">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Qualidade do sono</p>
            <ScaleSelector value={sonoQualidade} onChange={setSonoQualidade}
              labels={['Péssimo', 'Regular', 'Bom', 'Ótimo']} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Horas dormidas</p>
            <div className="relative">
              <input type="text" inputMode="decimal" value={sonoHoras}
                onChange={(e) => setSonoHoras(onlyDecimal(e.target.value))}
                placeholder="Ex: 7,5"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">h</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Libido */}
      <Section id="libido" title="Libido" hasData={hasData([libido])}>
        <div className="pt-3">
          <ScaleSelector value={libido} onChange={setLibido}
            labels={['Nenhuma', 'Baixa', 'Moderada', 'Alta']} />
        </div>
      </Section>

      {/* Apetite */}
      <Section id="apetite" title="Apetite e desejos" hasData={hasData([apetite, digestao])}>
        <div className="space-y-4 pt-3">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Apetite</p>
            <ChipSelector options={apetiteOptions} selected={apetite} onChange={setApetite} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Digestão</p>
            <ChipSelector
              options={digestaoOptions}
              selected={digestao ? [digestao] : []}
              onChange={(vals) => setDigestao(vals[vals.length - 1] ?? '')}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Peso (kg)</p>
            <div className="relative">
              <input type="text" inputMode="decimal" value={peso}
                onChange={(e) => setPeso(onlyDecimal(e.target.value))}
                placeholder="Ex: 62,5"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">kg</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Atividade sexual */}
      <Section id="sexo" title="Atividade sexual" hasData={hasData([sexoAtivo])}>
        <div className="space-y-3 pt-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={sexoAtivo}
              onChange={(e) => setSexoAtivo(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-400" />
            <span className="text-sm text-slate-700">Atividade sexual hoje</span>
          </label>
          {sexoAtivo && (
            <label className="flex items-center gap-3 cursor-pointer ml-7">
              <input type="checkbox" checked={sexoProtecao}
                onChange={(e) => setSexoProtecao(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-400" />
              <span className="text-sm text-slate-700">Usou proteção</span>
            </label>
          )}
        </div>
      </Section>

      {/* Notas */}
      <Section id="notas" title="Notas livres" hasData={hasData([notas])}>
        <div className="pt-3">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Anote qualquer observação sobre como você está se sentindo..."
            rows={4}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 text-sm leading-relaxed" />
        </div>
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95 disabled:opacity-60"
        style={{ background: saved
          ? 'linear-gradient(135deg, #22c55e, #34d399)'
          : 'linear-gradient(135deg, #ef4444, #f97316, #8b5cf6, #ec4899)'
        }}>
        {saved ? '✓ Registro salvo!' : saving ? 'Salvando...' : 'Salvar registro'}
      </button>
    </div>
  )
}
