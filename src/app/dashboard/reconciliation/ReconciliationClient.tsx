'use client'

import { useState, useTransition } from 'react'
import { reconcileRequisition } from '@/app/actions'
import { formatNaira, fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'

export interface LineItemRec {
  id: number
  description: string
  amount: number
  status: 'paid' | 'retired'
  paid_at: string | null
  retired_at: string | null
  retirement_notes: string | null
}

export interface ReqGroup {
  req_id: number
  req_number: string
  dept: string
  requester: string
  items: LineItemRec[]
  reconciled: { actor_name: string; created_at: string } | null
}

type StatusFilter = 'all' | 'outstanding' | 'retired' | 'reconciled'

function getReqStatus(group: ReqGroup): 'outstanding' | 'retired' | 'reconciled' {
  if (group.reconciled) return 'reconciled'
  if (group.items.some((i) => i.status === 'paid')) return 'outstanding'
  return 'retired'
}

export default function ReconciliationClient({
  groups,
  userRole,
}: {
  groups: ReqGroup[]
  userRole: string
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [reconcileNotes, setReconcileNotes] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [reconcilingId, setReconcilingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const canReconcile = ['finance', 'admin', 'chima'].includes(userRole)

  const depts = Array.from(new Set(groups.map((g) => g.dept))).sort()

  // Summary stats across all groups
  const allItems = groups.flatMap((g) => g.items)
  const totalDisbursed = allItems.reduce((s, i) => s + i.amount, 0)
  const totalRetired = allItems.filter((i) => i.status === 'retired').reduce((s, i) => s + i.amount, 0)
  const totalOutstanding = allItems.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const reconciledCount = groups.filter((g) => g.reconciled).length

  const filtered = groups.filter((g) => {
    if (deptFilter !== 'all' && g.dept !== deptFilter) return false
    const s = getReqStatus(g)
    if (statusFilter !== 'all' && s !== statusFilter) return false
    return true
  })

  function isExpanded(reqId: number, group: ReqGroup) {
    // Default: expanded when outstanding or fully-retired; collapsed when reconciled
    if (reqId in expanded) return expanded[reqId]
    return getReqStatus(group) !== 'reconciled'
  }

  function toggleExpand(reqId: number, group: ReqGroup) {
    setExpanded((p) => ({ ...p, [reqId]: !isExpanded(reqId, group) }))
  }

  function handleReconcile(group: ReqGroup) {
    const notes = reconcileNotes[group.req_id]?.trim() ?? ''
    setReconcilingId(group.req_id)
    startTransition(async () => {
      const result = await reconcileRequisition(group.req_id, notes)
      if (result.error) {
        toast(result.error, 'error')
        setReconcilingId(null)
        return
      }
      toast(`${group.req_number} marked as reconciled`, 'success')
      setReconcilingId(null)
      router.refresh()
    })
  }

  return (
    <>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Disbursed" value={formatNaira(totalDisbursed)} color="var(--ink)" />
        <StatCard label="Total Retired" value={formatNaira(totalRetired)} color="var(--pos)" />
        <StatCard
          label="Outstanding"
          value={formatNaira(totalOutstanding)}
          color={totalOutstanding > 0 ? 'var(--warn)' : 'var(--ink-4)'}
        />
        <StatCard label="Reconciled" value={`${reconciledCount} req${reconciledCount !== 1 ? 's' : ''}`} color="var(--brand)" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="li-input"
          style={{ width: 'auto', minWidth: 160 }}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="all">All departments</option>
          {depts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'outstanding', 'retired', 'reconciled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid var(--line-2)',
                cursor: 'pointer',
                background: statusFilter === s ? 'var(--brand)' : 'var(--surface)',
                color: statusFilter === s ? '#fff' : 'var(--ink-3)',
              }}
            >
              {s === 'all' ? 'All' : s === 'outstanding' ? 'Outstanding' : s === 'retired' ? 'Fully Retired' : 'Reconciled'}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 'auto' }}>
          {filtered.length} requisition{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Requisition groups */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No requisitions match the selected filters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((group) => {
            const status = getReqStatus(group)
            const open = isExpanded(group.req_id, group)
            const groupTotal = group.items.reduce((s, i) => s + i.amount, 0)
            const groupRetired = group.items.filter((i) => i.status === 'retired').reduce((s, i) => s + i.amount, 0)
            const groupOutstanding = groupTotal - groupRetired
            const canMarkReconciled = canReconcile && status === 'retired'

            return (
              <div key={group.req_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: 'pointer',
                    borderBottom: open ? '1px solid var(--line-2)' : 'none',
                  }}
                  onClick={() => toggleExpand(group.req_id, group)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                        {group.req_number}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{group.dept}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{group.requester}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''} · {formatNaira(groupTotal)} disbursed
                      </span>
                      {groupOutstanding > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 600 }}>
                          {formatNaira(groupOutstanding)} outstanding
                        </span>
                      )}
                      {groupOutstanding === 0 && status !== 'reconciled' && (
                        <span style={{ fontSize: 11, color: 'var(--pos)', fontWeight: 600 }}>
                          Fully retired · ready to reconcile
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={status} />
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    style={{
                      color: 'var(--ink-4)',
                      transform: open ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>

                {open && (
                  <div>
                    {/* Line items table */}
                    <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th>Paid</th>
                            <th>Retired</th>
                            <th>Retirement Notes</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item) => (
                            <tr key={item.id}>
                              <td className="strong">{item.description}</td>
                              <td className="num">{formatNaira(item.amount)}</td>
                              <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                                {item.paid_at ? fmtDate(item.paid_at) : '—'}
                              </td>
                              <td style={{ fontSize: 12 }}>
                                {item.retired_at ? (
                                  <span style={{ color: 'var(--ink-3)' }}>{fmtDate(item.retired_at)}</span>
                                ) : (
                                  <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Pending</span>
                                )}
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 260 }}>
                                {item.retirement_notes ?? <span style={{ color: 'var(--ink-4)' }}>—</span>}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                                  textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4,
                                  background: item.status === 'retired'
                                    ? 'rgba(22,163,74,0.1)'
                                    : 'var(--warn-soft)',
                                  color: item.status === 'retired' ? 'var(--pos)' : 'var(--warn)',
                                }}>
                                  {item.status === 'retired' ? 'Retired' : 'Paid'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer: totals + reconcile action */}
                    <div style={{
                      padding: '12px 18px',
                      borderTop: '1px solid var(--line-2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      background: 'var(--bg)',
                    }}>
                      <div style={{ flex: 1, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                          Disbursed: <strong style={{ color: 'var(--ink)' }}>{formatNaira(groupTotal)}</strong>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                          Retired: <strong style={{ color: 'var(--pos)' }}>{formatNaira(groupRetired)}</strong>
                        </span>
                        {groupOutstanding > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn)' }}>
                            Gap: {formatNaira(groupOutstanding)}
                          </span>
                        )}
                      </div>

                      {group.reconciled && (
                        <span style={{ fontSize: 12, color: 'var(--pos)' }}>
                          ✓ Reconciled by {group.reconciled.actor_name} · {fmtDate(group.reconciled.created_at)}
                        </span>
                      )}

                      {canMarkReconciled && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            className="li-input"
                            style={{ width: 240 }}
                            placeholder="Reconciliation note (optional)"
                            value={reconcileNotes[group.req_id] ?? ''}
                            onChange={(e) =>
                              setReconcileNotes((p) => ({ ...p, [group.req_id]: e.target.value }))
                            }
                          />
                          <button
                            className="act-btn act-approve"
                            onClick={() => handleReconcile(group)}
                            disabled={isPending || reconcilingId === group.req_id}
                            style={{ opacity: isPending ? 0.5 : 1 }}
                          >
                            {reconcilingId === group.req_id ? 'Reconciling…' : 'Mark Reconciled'}
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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'outstanding' | 'retired' | 'reconciled' }) {
  const config = {
    outstanding: { label: 'Outstanding', bg: 'var(--warn-soft)', color: 'var(--warn)' },
    retired: { label: 'Fully Retired', bg: 'rgba(22,163,74,0.1)', color: 'var(--pos)' },
    reconciled: { label: 'Reconciled', bg: 'var(--brand-soft)', color: 'var(--brand)' },
  }[status]

  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 5,
      background: config.bg, color: config.color,
      flexShrink: 0,
    }}>
      {config.label}
    </span>
  )
}
