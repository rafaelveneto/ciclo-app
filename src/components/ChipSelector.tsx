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
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              isSelected
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
