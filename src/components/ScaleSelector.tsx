interface Props {
  value: number | undefined
  onChange: (v: number) => void
  labels?: [string, string, string, string]
}

const defaultLabels: [string, string, string, string] = ['Nenhum', 'Leve', 'Moderado', 'Intenso']

export default function ScaleSelector({ value, onChange, labels = defaultLabels }: Props) {
  return (
    <div className="flex gap-2">
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
            value === i
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
