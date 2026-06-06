import { phaseLabel, type CyclePrediction } from '../lib/cycleCalc'

interface Props {
  phase: CyclePrediction['currentPhase']
  className?: string
}

export default function PhaseTag({ phase, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white phase-${phase} ${className}`}
    >
      {phaseLabel(phase)}
    </span>
  )
}
