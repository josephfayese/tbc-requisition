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
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Queue is clear</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>No pending items at the moment.</div>
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
        <div className="seg">
          <button data-on={view === 'grouped' ? 'true' : 'false'} onClick={() => setView('grouped')}>Grouped</button>
          <button data-on={view === 'flat' ? 'true' : 'false'} onClick={() => setView('flat')}>Flat list</button>
        </div>
      </div>

      {view === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.values(grouped).map((group) => {
            const groupTotal = group.items.reduce((s, i) => s + i.amount, 0)
            return (
              <div key={group.req_number} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg-tint)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{group.req_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                        {group.dept} · by {group.requester} · {fmtDate(group.req_created_at)}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNaira(groupTotal)}
                    </div>
                  </div>
                  {group.notes && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)', background: 'var(--bg-raised)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>Justification: </span>
                      {group.notes}
                    </div>
                  )}
                </div>
                <table className="tbl">
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
                        <td className="strong">{item.description}</td>
                        <td style={{ textAlign: 'center', color: 'var(--ink-3)' }}>{item.qty}</td>
                        <td className="num" style={{ color: 'var(--ink-3)' }}>{item.unit_price ? formatNaira(item.unit_price) : '—'}</td>
                        <td className="num strong">{formatNaira(item.amount)}</td>
                        {canApprove && (
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="act-btn act-reject" disabled={pendingId === item.id} onClick={() => setRejectTarget({ id: item.id, description: item.description })}>✕ Reject</button>
                              <button className="act-btn act-approve" disabled={pendingId === item.id} onClick={() => handleApprove(item.id, item.description)}>
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
            )
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-head">
            <span className="card-title">All Pending Items</span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{items.length} items · {formatNaira(items.reduce((s, i) => s + i.amount, 0))} total</span>
          </div>
          <table className="tbl">
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
                  <td className="strong">{item.description}</td>
                  <td>{item.dept}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.requester}</td>
                  <td className="num">{formatNaira(item.amount)}</td>
                  {canApprove && (
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="act-btn act-reject" disabled={pendingId === item.id} onClick={() => setRejectTarget({ id: item.id, description: item.description })}>✕ Reject</button>
                        <button className="act-btn act-approve" disabled={pendingId === item.id} onClick={() => handleApprove(item.id, item.description)}>
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
      )}

      {/* Inline reject modal */}
      {rejectTarget && (
        <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) { setRejectTarget(null); setRejectReason('') } }}>
          <div className="modal-card">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--neg)', marginBottom: 4 }}>Reject Item</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{rejectTarget.description}</div>
              </div>
              <button className="x-btn" onClick={() => { setRejectTarget(null); setRejectReason('') }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>
                Reason <span style={{ color: 'var(--neg)' }}>*</span>
              </label>
              <textarea
                className="li-input"
                rows={3}
                autoFocus
                placeholder="Reason for rejection — visible to the requester…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="ghost-btn" onClick={() => { setRejectTarget(null); setRejectReason('') }}>Cancel</button>
              <button className="act-btn act-reject" onClick={handleRejectSubmit} disabled={!rejectReason.trim() || pendingId !== null} style={{ opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                {pendingId !== null ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
