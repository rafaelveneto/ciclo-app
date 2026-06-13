import { upsertDailyLog, type DailyLog } from '../db/database'
import ChipSelector from './ChipSelector'

interface Props {
  todayLog: DailyLog | undefined
  today: string
  onNavigate: (tab: 'registrar') => void
}

// Curated quick subsets (values match Registrar's full lists, so data stays consistent).
const humorRapido = [
  { value: 'Calma', label: 'Calma' },
  { value: 'Irritabilidade', label: 'Irritabilidade' },
  { value: 'Ansiedade', label: 'Ansiedade' },
  { value: 'Tristeza', label: 'Tristeza' },
  { value: 'Euforia', label: 'Animada' },
  { value: 'Foco', label: 'Focada' },
]
const sintomasRapido = [
  { value: 'Cólicas', label: 'Cólicas' },
  { value: 'Dor de cabeça', label: 'Dor de cabeça' },
  { value: 'Inchaço', label: 'Inchaço' },
  { value: 'Fadiga', label: 'Cansaço' },
  { value: 'Sensibilidade nos seios', label: 'Seios sensíveis' },
  { value: 'Acne', label: 'Acne' },
]

const fluxoLabels: Record<string, string> = {
  spotting: 'Manchas', leve: 'Leve', moderado: 'Moderado', intenso: 'Intenso', 'muito intenso': 'Muito intenso',
}

/**
 * One-tap daily logging right from the home screen — the core engagement loop.
 * Tapping a chip saves immediately (merging into today's entry), so the woman
 * never has to open the full form for a quick mood/symptom note.
 */
export default function QuickLogHoje({ todayLog, today, onNavigate }: Props) {
  const humor = todayLog?.humor ?? []
  const sintomas = todayLog?.sintomas ?? []

  const update = (patch: Partial<DailyLog>) =>
    upsertDailyLog({ ...(todayLog ?? {}), data: today, ...patch })

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Registro de hoje</p>
        <button onClick={() => onNavigate('registrar')} className="text-xs font-semibold gradient-text">
          Registrar tudo →
        </button>
      </div>

      <p className="text-xs font-medium text-slate-400 mb-2">Como está seu humor?</p>
      <ChipSelector
        options={humorRapido}
        selected={humor}
        onChange={(v) => update({ humor: v.length ? v : undefined })}
      />

      <p className="text-xs font-medium text-slate-400 mt-4 mb-2">Algum sintoma?</p>
      <ChipSelector
        options={sintomasRapido}
        selected={sintomas}
        onChange={(v) => update({ sintomas: v.length ? v : undefined })}
      />

      {/* Other things already logged today (read-only summary) */}
      {(todayLog?.fluxo?.intensidade || todayLog?.tbc != null || todayLog?.notas) && (
        <div className="mt-4 pt-3 border-t border-slate-50 space-y-2">
          {todayLog?.fluxo?.intensidade && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span className="text-sm text-slate-600">Fluxo: {fluxoLabels[todayLog.fluxo.intensidade] ?? todayLog.fluxo.intensidade}</span>
            </div>
          )}
          {todayLog?.tbc != null && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-sm text-slate-600">TBC: {todayLog.tbc}°C</span>
            </div>
          )}
          {todayLog?.notas && (
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
              <span className="text-sm text-slate-600 line-clamp-2">{todayLog.notas}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
