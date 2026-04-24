interface SignalProps {
  isDecisionMaker: boolean | null
  hasBudgetSignal: boolean | null
  mentionedProblem: boolean | null
  timingUrgency: boolean | null
}

const LABELS = ['Decision maker', 'Budget', 'Problema', 'Urgencia']

export function SignalDots({ isDecisionMaker, hasBudgetSignal, mentionedProblem, timingUrgency }: SignalProps) {
  const values = [isDecisionMaker, hasBudgetSignal, mentionedProblem, timingUrgency]
  return (
    <div className="flex items-center gap-1">
      {values.map((val, i) => (
        <span
          key={i}
          title={LABELS[i]}
          className={`w-2 h-2 rounded-full ${val ? 'bg-orange-400' : 'bg-white/15'}`}
        />
      ))}
    </div>
  )
}

export function SignalList({ isDecisionMaker, hasBudgetSignal, mentionedProblem, timingUrgency }: SignalProps) {
  const signals = [
    { label: 'Decision maker', value: isDecisionMaker },
    { label: 'Budget signal', value: hasBudgetSignal },
    { label: 'Mencionó problema', value: mentionedProblem },
    { label: 'Urgencia / timing', value: timingUrgency },
  ]
  return (
    <div className="space-y-2">
      {signals.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-2.5 text-sm">
          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              value ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/20'
            }`}
          >
            {value ? '✓' : '×'}
          </span>
          <span className={value ? 'text-white/80' : 'text-white/30'}>{label}</span>
        </div>
      ))}
    </div>
  )
}
