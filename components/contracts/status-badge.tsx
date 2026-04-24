import { STATUS_COLORS, STATUS_LABELS, type ContractStatus } from '@/types/contracts'

export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
