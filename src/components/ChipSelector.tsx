interface Props {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
  className?: string
}

export default function ChipSelector({ options, selected, onChange, className = '' }: Props) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            style={isSelected ? { background: 'linear-gradient(135deg, #ef4444, #f97316, #8b5cf6)', border: 'none' } : {}}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isSelected
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
