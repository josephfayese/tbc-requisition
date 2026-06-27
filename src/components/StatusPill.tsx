export type ItemStatus = 'pending' | 'dg_approved' | 'approved' | 'rejected' | 'paid' | 'retired'

const STATUS_MAP: Record<ItemStatus, { bg: string; color: string; label: string }> = {
  pending:     { bg: 'var(--warn-soft)',   color: 'var(--warn)',   label: 'Pending' },
  dg_approved: { bg: 'var(--purple-soft)', color: 'var(--purple)', label: 'DG Approved' },
  approved:    { bg: 'var(--info-soft)',   color: 'var(--info)',   label: 'Approved' },
  rejected:    { bg: 'var(--neg-soft)',    color: 'var(--neg)',    label: 'Rejected' },
  paid:        { bg: 'var(--pos-soft)',    color: 'var(--pos)',    label: 'Paid' },
  retired:     { bg: 'var(--bg-sunken)',   color: 'var(--ink-3)', label: 'Retired' },
}

export default function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status as ItemStatus] ?? { bg: 'var(--bg-sunken)', color: 'var(--ink-4)', label: status }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, lineHeight: 1.4,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}
