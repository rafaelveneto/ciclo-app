interface Props {
  value: number | undefined
  onChange: (v: number) => void
  labels?: [string, string, string, string]
}

const defaultLabels: [string, string, string, string] = ['Nenhum', 'Leve', 'Moderado', 'Intenso']

const gradients = [
  'linear-gradient(135deg, #94a3b8, #64748b)',
  'linear-gradient(135deg, #34d399, #22d3ee)',
  'linear-gradient(135deg, #fbbf24, #f97316)',
  'linear-gradient(135deg, #f97316, #ef4444)',
]

export default function ScaleSelector({ value, onChange, labels = defaultLabels }: Props) {
  return (
    <div className="flex gap-2">
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          style={value === i ? { background: gradients[i], border: 'none' } : {}}
          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
            value === i
              ? 'text-white shadow-sm'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
