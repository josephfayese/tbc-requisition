'use client'

import { useState, useTransition } from 'react'
import { approveItem, rejectItem } from '@/app/actions'
import { formatNaira, fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'

interface Item {
  id: number
  description: string
  amount: number
  qty: number
  unit_price: number | null
  created_at: string
  req_id: number
  req_number: string
  dept: string
  notes: string
  req_created_at: string
  requester: string
  resubmission_note: string
}

export default function ApproveClient({ items, canApprove }: { items: Item[]; canApprove: boolean }) {
  const [view, setView] = useState<'grouped' | 'flat'>('grouped')
  const [rejectTarget, setRejectTarget] = useState<{ id: number; description: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleApprove(id: number, description: string) {
    setPendingId(id)
    startTransition(async () => {
      const result = await approveItem(id)
      setPendingId(null)
      if (result.error) toast(result.error, 'error')
      else { toast(`Approved "${description}"`, 'success'); router.refresh() }
    })
  }

  function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) return
    const { id, description } = rejectTarget
    setPendingId(id)
    startTransition(async () => {
      const result = await rejectItem(id, rejectReason.trim())
      setPendingId(null)
      if (result.error) { toast(result.error, 'error'); return }
      toast(`Rejected "${description}"`, 'error')
      setRejectTarget(null)
      setRejectReason('')
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <div className="fd-empty">
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-body)' }}>Queue is clear</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>No pending items at the moment.</div>
      </div>
    )
  }

  const grouped = items.reduce((acc, item) => {
    const key = item.req_number
    if (!acc[key]) acc[key] = { req_number: item.req_number, dept: item.dept, requester: item.requester, req_created_at: item.req_created_at, notes: item.notes, items: [] }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { req_number: string; dept: string; requester: string; req_created_at: string; notes: string; items: Item[] }>)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div className="fd-seg">
          <button className="fd-seg__btn" aria-pressed={view === 'grouped'} onClick={() => setView('grouped')}>Grouped</button>
          <button className="fd-seg__btn" aria-pressed={view === 'flat'} onClick={() => setView('flat')}>Flat list</button>
        </div>
      </div>

      {view === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.values(grouped).map((group) => {
            const groupTotal = group.items.reduce((s, i) => s + i.amount, 0)
            return (
              <div key={group.req_number} className="fd-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-divider)', background: 'var(--bg-tint)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-body)', fontFamily: 'var(--mono)' }}>{group.req_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {group.dept} · by {group.requester} · {fmtDate(group.req_created_at)}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNaira(groupTotal)}
                    </div>
                  </div>
                  {group.notes && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-card)', border: '1px solid var(--border-divider)', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Justification: </span>
                      {group.notes}
                    </div>
                  )}
                </div>
                <div className="fd-table-wrap">
                <table className="fd-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      {canApprove && <th style={{ textAlign: 'right', width: 180 }}>Decision</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          {item.description}
                          {item.resubmission_note && (
                            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--green-700)', background: 'var(--approved-bg)', border: '1px solid rgba(30,105,52,.18)', borderRadius: 4, padding: '4px 8px' }}>
                              <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>Resubmission note: </span>
                              {item.resubmission_note}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{item.qty}</td>
                        <td className="fd-num" style={{ color: 'var(--text-muted)' }}>{item.unit_price ? formatNaira(item.unit_price) : '—'}</td>
                        <td className="fd-num" style={{ fontWeight: 600 }}>{formatNaira(item.amount)}</td>
                        {canApprove && (
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="fd-btn fd-btn--danger fd-btn--sm" disabled={pendingId === item.id} onClick={() => setRejectTarget({ id: item.id, description: item.description })}>✕ Reject</button>
                              <button className="fd-btn fd-btn--primary fd-btn--sm" disabled={pendingId === item.id} onClick={() => handleApprove(item.id, item.description)}>
                                {pendingId === item.id ? '…' : '✓ Approve'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="fd-card fd-card--flush">
          <div className="fd-card__head">
            <span className="fd-card__title">All pending items</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} items · {formatNaira(items.reduce((s, i) => s + i.amount, 0))} total</span>
          </div>
          <div className="fd-table-wrap">
          <table className="fd-table">
            <thead>
              <tr>
                <th>Req #</th><th>Description</th><th>Dept</th><th>By</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                {canApprove && <th style={{ textAlign: 'right', width: 180 }}>Decision</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{item.req_number}</td>
                  <td style={{ fontWeight: 600 }}>
                    {item.description}
                    {item.resubmission_note && (
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--green-700)', background: 'var(--approved-bg)', border: '1px solid rgba(30,105,52,.18)', borderRadius: 4, padding: '4px 8px' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>Resubmission note: </span>
                        {item.resubmission_note}
                      </div>
                    )}
                  </td>
                  <td>{item.dept}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.requester}</td>
                  <td className="fd-num">{formatNaira(item.amount)}</td>
                  {canApprove && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="fd-btn fd-btn--danger fd-btn--sm" disabled={pendingId === item.id} onClick={() => setRejectTarget({ id: item.id, description: item.description })}>✕ Reject</button>
                        <button className="fd-btn fd-btn--primary fd-btn--sm" disabled={pendingId === item.id} onClick={() => handleApprove(item.id, item.description)}>
                          {pendingId === item.id ? '…' : '✓ Approve'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Inline reject modal */}
      {rejectTarget && (
        <div className="fd-scrim" onClick={(e) => { if (e.target === e.currentTarget) { setRejectTarget(null); setRejectReason('') } }}>
          <div className="fd-dialog">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rejected-fg)', marginBottom: 4 }}>Reject item</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{rejectTarget.description}</div>
              </div>
              <button className="fd-iconbtn" onClick={() => { setRejectTarget(null); setRejectReason('') }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Reason <span style={{ color: 'var(--rejected-fg)' }}>*</span>
              </label>
              <textarea
                className="fd-input"
                rows={3}
                autoFocus
                placeholder="Reason for rejection — visible to the requester…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-divider)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="fd-btn fd-btn--ghost" onClick={() => { setRejectTarget(null); setRejectReason('') }}>Cancel</button>
              <button className="fd-btn fd-btn--danger fd-btn--sm" onClick={handleRejectSubmit} disabled={!rejectReason.trim() || pendingId !== null} style={{ opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                {pendingId !== null ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
