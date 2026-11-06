'use client'

import { useState, useTransition } from 'react'
import { reconcileRequisition } from '@/app/actions'
import { formatNaira, fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import StatusPill from '@/components/StatusPill'

export interface LineItemRec {
  id: number; description: string; amount: number; status: 'paid' | 'retired'
  paid_at: string | null; retired_at: string | null; retirement_notes: string | null
}

export interface ReqGroup {
  req_id: number; req_number: string; dept: string; requester: string
  items: LineItemRec[]; reconciled: { actor_name: string; created_at: string } | null
}

type StatusFilter = 'all' | 'outstanding' | 'retired' | 'reconciled'

function getReqStatus(group: ReqGroup): 'outstanding' | 'retired' | 'reconciled' {
  if (group.reconciled) return 'reconciled'
  if (group.items.some(i => i.status === 'paid')) return 'outstanding'
  return 'retired'
}

export default function ReconciliationClient({ groups, userRole }: { groups: ReqGroup[]; userRole: string }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [reconcileNotes, setReconcileNotes] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [reconcilingId, setReconcilingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const canReconcile = ['finance', 'admin', 'chima'].includes(userRole)
  const depts = Array.from(new Set(groups.map(g => g.dept))).sort()

  const allItems = groups.flatMap(g => g.items)
  const totalDisbursed = allItems.reduce((s, i) => s + i.amount, 0)
  const totalRetired = allItems.filter(i => i.status === 'retired').reduce((s, i) => s + i.amount, 0)
  const totalOutstanding = allItems.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const reconciledCount = groups.filter(g => g.reconciled).length

  const filtered = groups.filter(g => {
    if (deptFilter !== 'all' && g.dept !== deptFilter) return false
    if (statusFilter !== 'all' && getReqStatus(g) !== statusFilter) return false
    return true
  })

  function isExpanded(reqId: number, group: ReqGroup) {
    if (reqId in expanded) return expanded[reqId]
    return getReqStatus(group) !== 'reconciled'
  }

  function handleReconcile(group: ReqGroup) {
    const notes = reconcileNotes[group.req_id]?.trim() ?? ''
    setReconcilingId(group.req_id)
    startTransition(async () => {
      const result = await reconcileRequisition(group.req_id, notes)
      if (result.error) { toast(result.error, 'error'); setReconcilingId(null); return }
      toast(`${group.req_number} marked as reconciled`, 'success')
      setReconcilingId(null)
      router.refresh()
    })
  }

  return (
    <>
      {/* Summary */}
      <div className="kit-stats" style={{ marginBottom: 24 }}>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Total disbursed</span><span className="fd-metric__value">{formatNaira(totalDisbursed)}</span></div>
        </div>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Total retired</span><span className="fd-metric__value">{formatNaira(totalRetired)}</span></div>
        </div>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Outstanding</span><span className={`fd-metric__value${totalOutstanding > 0 ? ' fd-metric__value--warn' : ''}`}>{formatNaira(totalOutstanding)}</span></div>
        </div>
        <div className="fd-card" style={{ padding: '16px 18px' }}>
          <div className="fd-metric"><span className="fd-metric__label">Reconciled</span><span className="fd-metric__value">{reconciledCount}</span><span className="fd-metric__sub">requisitions</span></div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="fd-affix">
          <select className="fd-input fd-select" style={{ width: 'auto', minWidth: 160 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="all">All departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="fd-seg">
          {(['all', 'outstanding', 'retired', 'reconciled'] as StatusFilter[]).map(s => (
            <button key={s} className="fd-seg__btn" aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s === 'outstanding' ? 'Outstanding' : s === 'retired' ? 'Fully retired' : 'Reconciled'}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filtered.length} requisition{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Groups */}
      {filtered.length === 0 ? (
        <div className="fd-empty">
          <div className="fd-empty__title">No requisitions match</div>
          Try adjusting your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(group => {
            const status = getReqStatus(group)
            const open = isExpanded(group.req_id, group)
            const groupTotal = group.items.reduce((s, i) => s + i.amount, 0)
            const groupRetired = group.items.filter(i => i.status === 'retired').reduce((s, i) => s + i.amount, 0)
            const groupOutstanding = groupTotal - groupRetired
            const canMarkReconciled = canReconcile && status === 'retired'

            return (
              <div key={group.req_id} className="fd-card fd-card--flush">
                <div
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: open ? '1px solid var(--border-divider)' : 'none' }}
                  onClick={() => setExpanded(p => ({ ...p, [group.req_id]: !open }))}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{group.req_number}</span>
                      <span className="fd-muted">·</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{group.dept}</span>
                      <span className="fd-muted">·</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{group.requester}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{group.items.length} item{group.items.length !== 1 ? 's' : ''} · {formatNaira(groupTotal)}</span>
                      {groupOutstanding > 0 && <span style={{ fontSize: 12, color: 'var(--pending-fg)', fontWeight: 600 }}>{formatNaira(groupOutstanding)} outstanding</span>}
                      {groupOutstanding === 0 && status !== 'reconciled' && <span style={{ fontSize: 12, color: 'var(--approved-fg)', fontWeight: 600 }}>Fully retired</span>}
                    </div>
                  </div>
                  <StatusPill status={status === 'outstanding' ? 'paid' : status === 'retired' ? 'retired' : 'approved'} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
                </div>

                {open && (
                  <div>
                    <div className="fd-table-wrap">
                      <table className="fd-table">
                        <thead><tr><th>Description</th><th className="fd-num">Amount</th><th>Paid</th><th>Retired</th><th className="fd-hide-mobile">Notes</th><th>Status</th></tr></thead>
                        <tbody>
                          {group.items.map(item => (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 600 }}>{item.description}</td>
                              <td className="fd-num">{formatNaira(item.amount)}</td>
                              <td className="fd-muted">{item.paid_at ? fmtDate(item.paid_at) : '—'}</td>
                              <td>{item.retired_at ? <span className="fd-muted">{fmtDate(item.retired_at)}</span> : <span style={{ color: 'var(--pending-fg)', fontWeight: 600 }}>Pending</span>}</td>
                              <td className="fd-muted fd-hide-mobile" style={{ maxWidth: 260 }}>{item.retirement_notes ?? '—'}</td>
                              <td><StatusPill status={item.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-divider)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: 'var(--surface-canvas)' }}>
                      <div style={{ flex: 1, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Disbursed: <strong>{formatNaira(groupTotal)}</strong></span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Retired: <strong style={{ color: 'var(--approved-fg)' }}>{formatNaira(groupRetired)}</strong></span>
                        {groupOutstanding > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pending-fg)' }}>Gap: {formatNaira(groupOutstanding)}</span>}
                      </div>
                      {group.reconciled && <span style={{ fontSize: 12, color: 'var(--approved-fg)' }}>Reconciled by {group.reconciled.actor_name} · {fmtDate(group.reconciled.created_at)}</span>}
                      {canMarkReconciled && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input className="fd-input" style={{ width: 240, height: 30 }} placeholder="Reconciliation note (optional)" value={reconcileNotes[group.req_id] ?? ''} onChange={e => setReconcileNotes(p => ({ ...p, [group.req_id]: e.target.value }))} />
                          <button className="fd-btn fd-btn--primary fd-btn--sm" onClick={() => handleReconcile(group)} disabled={isPending || reconcilingId === group.req_id}>
                            {reconcilingId === group.req_id ? 'Reconciling...' : 'Mark reconciled'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
