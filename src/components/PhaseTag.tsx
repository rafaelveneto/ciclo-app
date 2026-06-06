import { phaseLabel, phaseColors, type CyclePrediction } from '../lib/cycleCalc'

interface Props {
  phase: CyclePrediction['currentPhase']
  className?: string
}

export default function PhaseTag({ phase, className = '' }: Props) {
  const colors = phaseColors(phase)
  const label = phaseLabel(phase)

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      {label}
    </span>
  )
}
