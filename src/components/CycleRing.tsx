interface Props {
  cycleLen: number
  periodLen: number
  ovulationDay: number
  currentDay: number
  daysUntilNext: number
  phaseName: string
  phaseEmoji: string
}

const SIZE = 196
const STROKE = 15
const CX = SIZE / 2
const CY = SIZE / 2
const R = (SIZE - STROKE) / 2 - 2

/**
 * Signature cycle ring (like Flo/Clue/Glow): the whole cycle as a circle, colored
 * by phase, with a marker for "today" and a dot for predicted ovulation. The center
 * shows the current cycle day. Built as pure SVG — crisp and dependency-free.
 */
export default function CycleRing({
  cycleLen, periodLen, ovulationDay, currentDay, daysUntilNext, phaseName, phaseEmoji,
}: Props) {
  const len = Math.max(15, cycleLen)
  const ov = Math.min(Math.max(2, ovulationDay), len - 1)
  const period = Math.min(Math.max(1, periodLen), 8)
  const fertileStart = Math.max(period + 1, ov - 5)

  const polar = (angleDeg: number) => {
    const a = (angleDeg - 90) * (Math.PI / 180)
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
  }
  const arc = (startDay: number, endDay: number) => {
    const a0 = ((startDay - 1) / len) * 360
    const a1 = (endDay / len) * 360
    const s = polar(a0)
    const e = polar(a1)
    const large = a1 - a0 > 180 ? 1 : 0
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
  }

  const segments: { d0: number; d1: number; color: string }[] = [
    { d0: 1, d1: period, color: '#fb7185' },                       // menstrual
    { d0: period + 1, d1: fertileStart - 1, color: '#e2e8f0' },    // follicular
    { d0: fertileStart, d1: ov + 1, color: '#86efac' },           // fertile
    { d0: ov + 2, d1: len, color: '#ddd6fe' },                    // luteal
  ].filter((s) => s.d1 >= s.d0)

  // today marker
  const dayClamped = Math.min(Math.max(1, currentDay), len)
  const todayPos = polar(((dayClamped - 1 + 0.5) / len) * 360)
  // ovulation dot
  const ovPos = polar(((ov - 1 + 0.5) / len) * 360)

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* base ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {/* phase arcs */}
        {segments.map((s, i) => (
          <path key={i} d={arc(s.d0, s.d1)} fill="none" stroke={s.color}
            strokeWidth={STROKE} strokeLinecap="round" />
        ))}
        {/* ovulation dot */}
        <circle cx={ovPos.x} cy={ovPos.y} r={5} fill="#06b6d4" stroke="white" strokeWidth={2} />
        {/* today marker */}
        <circle cx={todayPos.x} cy={todayPos.y} r={9} fill="white" stroke="#8b5cf6" strokeWidth={3.5} />
      </svg>
      {/* center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-3xl font-bold text-slate-800 leading-none">{currentDay}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">dia do ciclo</span>
        <span className="text-sm mt-1.5">{phaseEmoji} <span className="font-semibold text-slate-600">{phaseName}</span></span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {daysUntilNext > 0
            ? `menstruação em ${daysUntilNext}d`
            : daysUntilNext === 0
            ? 'menstruação hoje'
            : `atrasada ${Math.abs(daysUntilNext)}d`}
        </span>
      </div>
    </div>
  )
}
