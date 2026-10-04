'use client'

import { useState, useTransition } from 'react'
import { formatNaira, fmtDate, timeAgo, formatHours } from '@/lib/utils'
import StatusPill from '@/components/StatusPill'
import { verifyViewerPasscode } from '@/app/actions'

export interface ViewerStats {
  totalOutstanding: number
  outstandingCount: number
  totalRetired: number
  reconciledCount: number
  paymentQueueCount: number
  ytdTotal: number
  pipelineTotal: number
  rejectionRate: number
  avgSlaHours: number | null
  slaPct: number | null
  withinSla: number
  slaCount: number
  statusCounts: Record<string, { count: number; amount: number }>
  deptRows: { dept: string; disbursed: number; pipeline: number }[]
  outstandingReqs: { req_number: string; dept: string; requester: string; total: number; count: number; paid_at: string }[]
}

interface PendingItem {
  id: number
  description: string
  amount: number
  created_at: string
  req_number: string
  dept: string
  requester: string
}

interface FeedEntry {
  id: number
  action: string
  detail: string | null
  actor_name: string
  created_at: string
  req_id: number | null
  line_item_id: number | null
}

interface Props {
  pending: PendingItem[]
  feed: FeedEntry[]
  totalPending: number
  stats: ViewerStats | null
}

function getActionBadge(action: string): string {
  if (action.startsWith('Approved') || action.startsWith('Paid')) return 'approved'
  if (action.startsWith('Rejected')) return 'rejected'
  if (action.startsWith('Requisition')) return 'paid'
  return 'retired'
}

export default function ViewerClient({ pending, feed, totalPending, stats }: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, startVerify] = useTransition()

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    startVerify(async () => {
      const { ok } = await verifyViewerPasscode(input)
      if (ok) {
        setUnlocked(true)
        setError('')
      } else {
        setError('Incorrect passcode. Please try again.')
        setInput('')
      }
    })
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-title)', margin: '8px 0 6px', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
              Passcode required
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Enter the group passcode to view the live requisition dashboard.
            </p>
          </div>
          <div className="fd-card" style={{ padding: 24 }}>
            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fd-field">
                <label className="fd-field__label">Group passcode</label>
                <input
                  className="fd-input"
                  type="text"
                  placeholder="Enter passcode"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, fontSize: 16, textAlign: 'center' }}
                />
                {error && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rejected-fg)', fontWeight: 500 }}>{error}</div>
                )}
              </div>
              <button type="submit" className="fd-btn fd-btn--primary fd-btn--block" disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Unlock dashboard'}
              </button>
            </form>
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-disabled)' }}>
            Read-only · No login required
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Group dashboard</h1>
          <p className="fd-pagehead__sub">Read-only · Refreshed on each page load</p>
        </div>
        <button onClick={() => setUnlocked(false)} className="fd-btn fd-btn--ghost fd-btn--sm">
          Lock
        </button>
      </div>

      {/* Summary stats */}
      <div className="kit-stats" style={{ marginBottom: 12 }}>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Pending items</span><span className="fd-metric__value">{pending.length}</span><span className="fd-metric__sub">awaiting approval</span></div>
        </div>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Total pending value</span><span className="fd-metric__value">{formatNaira(totalPending)}</span><span className="fd-metric__sub">across all departments</span></div>
        </div>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Recent decisions</span><span className="fd-metric__value">{feed.filter(f => f.action.startsWith('Approved') || f.action.startsWith('Rejected')).length}</span><span className="fd-metric__sub">in audit log</span></div>
        </div>
      </div>

      {stats && (
        <>
          {/* Core flow stats */}
          <div className="kit-stats" style={{ marginBottom: 12 }}>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Outstanding</span><span className={`fd-metric__value${stats.totalOutstanding > 0 ? ' fd-metric__value--warn' : ''}`}>{formatNaira(stats.totalOutstanding)}</span><span className="fd-metric__sub">{stats.outstandingCount} paid, not retired</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Total retired</span><span className="fd-metric__value">{formatNaira(stats.totalRetired)}</span><span className="fd-metric__sub">funds fully accounted for</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Reconciled reqs</span><span className="fd-metric__value">{stats.reconciledCount}</span><span className="fd-metric__sub">signed off by finance</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Payment queue</span><span className="fd-metric__value">{stats.paymentQueueCount}</span><span className="fd-metric__sub">approved, awaiting payment</span></div>
            </div>
          </div>

          {/* Accounting KPIs */}
          <div className="kit-stats" style={{ marginBottom: 12 }}>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">YTD disbursed</span><span className="fd-metric__value">{formatNaira(stats.ytdTotal)}</span><span className="fd-metric__sub">paid &amp; retired this year</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Pipeline value</span><span className="fd-metric__value">{formatNaira(stats.pipelineTotal)}</span><span className="fd-metric__sub">pending + approved items</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Rejection rate</span><span className={`fd-metric__value${stats.rejectionRate > 20 ? ' fd-metric__value--warn' : ''}`}>{stats.rejectionRate}%</span><span className="fd-metric__sub">of all decided items</span></div>
            </div>
          </div>

          {/* Payment SLA */}
          <div className="kit-stats" style={{ marginBottom: 28 }}>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Avg approval → payment</span><span className="fd-metric__value">{stats.avgSlaHours !== null ? formatHours(stats.avgSlaHours) : '—'}</span><span className="fd-metric__sub">benchmark SLA: 2 hours</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">Within 2h SLA</span><span className="fd-metric__value">{stats.slaPct !== null ? `${stats.slaPct}%` : '—'}</span><span className="fd-metric__sub">{stats.withinSla} of {stats.slaCount} payments</span></div>
            </div>
            <div className="fd-card" style={{ padding: '16px 18px' }}>
              <div className="fd-metric"><span className="fd-metric__label">SLA breaches</span><span className={`fd-metric__value${(stats.slaCount - stats.withinSla) > 0 ? ' fd-metric__value--warn' : ''}`}>{stats.slaCount - stats.withinSla}</span><span className="fd-metric__sub">paid after 2 hours</span></div>
            </div>
          </div>

          {/* Status funnel */}
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Requisition pipeline breakdown</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { key: 'pending', label: 'Pending', color: 'var(--pending-fg)', bg: 'var(--pending-bg)' },
              { key: 'approved', label: 'Approved', color: 'var(--approved-fg)', bg: 'var(--approved-bg)' },
              { key: 'paid', label: 'Paid', color: 'var(--paid-fg)', bg: 'var(--paid-bg)' },
              { key: 'retired', label: 'Retired', color: 'var(--text-title)', bg: 'var(--surface-canvas)' },
              { key: 'rejected', label: 'Rejected', color: 'var(--rejected-fg)', bg: 'var(--rejected-bg)' },
            ].map(({ key, label, color, bg }) => {
              const s = stats.statusCounts[key] ?? { count: 0, amount: 0 }
              return (
                <div key={key} className="fd-card" style={{ padding: '14px 16px', background: bg }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>{s.count}</div>
                  <div style={{ fontSize: 11, color, opacity: 0.75 }}>{s.amount > 0 ? formatNaira(s.amount) : '—'}</div>
                </div>
              )
            })}
          </div>

          {/* Spend by department */}
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Spend by department</h2>
          <div className="fd-card fd-card--flush" style={{ marginBottom: 28 }}>
            {stats.deptRows.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No disbursement data yet.</div>
            ) : (
              <div className="fd-table-wrap">
                <table className="fd-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th className="fd-num">Disbursed</th>
                      <th className="fd-num">In pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.deptRows.map((d) => (
                      <tr key={d.dept}>
                        <td style={{ fontWeight: 600 }}>{d.dept}</td>
                        <td className="fd-num" style={{ color: 'var(--approved-fg)', fontWeight: 600 }}>{formatNaira(d.disbursed)}</td>
                        <td className="fd-num fd-muted" style={{ fontSize: 12 }}>{d.pipeline > 0 ? formatNaira(d.pipeline) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Outstanding retirements */}
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Outstanding retirements
            {stats.outstandingCount > 0 && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--pending-bg)', color: 'var(--pending-fg)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{stats.outstandingCount}</span>}
          </h2>
          <div className="fd-card fd-card--flush" style={{ marginBottom: 28 }}>
            {stats.outstandingReqs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No paid items waiting for retirement.</div>
            ) : (
              <div className="fd-table-wrap">
                <table className="fd-table">
                  <thead>
                    <tr>
                      <th>Req #</th><th>Department</th><th>Requester</th><th>Items</th><th>Paid</th>
                      <th className="fd-num">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.outstandingReqs.map((req) => (
                      <tr key={req.req_number}>
                        <td style={{ fontSize: 12, fontWeight: 700 }}>{req.req_number}</td>
                        <td>{req.dept}</td>
                        <td>{req.requester}</td>
                        <td className="fd-muted" style={{ fontSize: 12 }}>{req.count} item{req.count !== 1 ? 's' : ''}</td>
                        <td className="fd-muted" style={{ fontSize: 12 }}>{fmtDate(req.paid_at)}</td>
                        <td className="fd-num" style={{ fontWeight: 600, color: 'var(--pending-fg)' }}>{formatNaira(req.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="kit-grid-halves">
        {/* Pending items for discussion */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Pending for discussion
            <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--pending-bg)', color: 'var(--pending-fg)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{pending.length}</span>
          </h2>
          {pending.length === 0 ? (
            <div className="fd-empty">
              <div className="fd-empty__title">Queue is clear</div>
              No pending items.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map((item) => (
                <div key={item.id} className="fd-card" style={{ padding: '12px 16px', borderLeft: '3px solid var(--pending-fg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-title)' }}>{item.description}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pending-fg)', flexShrink: 0 }}>{formatNaira(item.amount)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {item.req_number} · {item.dept} · {item.requester} · {fmtDate(item.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent decisions feed */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Recent decisions
            <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--surface-canvas)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{feed.length}</span>
          </h2>
          {feed.length === 0 ? (
            <div className="fd-empty">
              <div className="fd-empty__title">No decisions yet</div>
              No decisions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feed.map((entry) => {
                const badge = getActionBadge(entry.action)
                return (
                  <div key={entry.id} className="fd-card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-title)' }}>{entry.action}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(entry.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {entry.actor_name}{entry.detail ? ` · ${entry.detail}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
