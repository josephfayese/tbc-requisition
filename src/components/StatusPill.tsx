export type ItemStatus = 'pending' | 'dg_approved' | 'approved' | 'rejected' | 'paid' | 'retired'

const STATUS_MAP: Record<ItemStatus, { cls: string; label: string }> = {
  pending:     { cls: 'fd-badge--pending',   label: 'Pending' },
  dg_approved: { cls: 'fd-badge--approved',  label: 'DG approved' },
  approved:    { cls: 'fd-badge--approved',  label: 'Approved' },
  rejected:    { cls: 'fd-badge--rejected',  label: 'Rejected' },
  paid:        { cls: 'fd-badge--paid',      label: 'Paid' },
  retired:     { cls: 'fd-badge--retired',   label: 'Retired' },
}

export default function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status as ItemStatus] ?? { cls: 'fd-badge--retired', label: status }
  return (
    <span className={`fd-badge ${s.cls}`}>
      <span className="fd-badge__dot" />
      {s.label}
    </span>
  )
}
