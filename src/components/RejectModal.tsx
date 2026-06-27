'use client'

import { useState, useTransition } from 'react'
import { rejectItem } from '@/app/actions'
import { useToast } from './Toast'

interface Props {
  description: string
  onClose: () => void
  // Option A: pass lineItemId + onDone → uses the built-in DG rejectItem action
  lineItemId?: number
  onDone?: () => void
  // Option B: pass onConfirm → caller handles the action (e.g. financeRejectItem)
  onConfirm?: (reason: string) => Promise<void>
}

export default function RejectModal({ description, onClose, lineItemId, onDone, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleSubmit() {
    if (!reason.trim()) return
    startTransition(async () => {
      if (onConfirm) {
        // Caller-supplied action (e.g. Finance review)
        await onConfirm(reason.trim())
      } else if (lineItemId !== undefined && onDone) {
        // Built-in DG reject action
        const result = await rejectItem(lineItemId, reason.trim())
        if (result.error) { toast(result.error, 'error'); return }
        toast(`Rejected "${description}"`, 'error')
        onDone()
      }
    })
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--neg)', marginBottom: 4 }}>Reject Line Item</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{description}</div>
          </div>
          <button className="x-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>
            Reason for rejection <span style={{ color: 'var(--neg)' }}>*</span>
          </label>
          <textarea
            className="li-input"
            rows={3}
            placeholder="e.g. Defer to Q3 budget, insufficient documentation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ resize: 'vertical', minHeight: 80 }}
            autoFocus
          />
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>
            This reason will be visible to the requester and recorded in the audit log.
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="ghost-btn" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="act-btn act-reject"
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
            style={{ opacity: !reason.trim() || isPending ? 0.5 : 1 }}
          >
            {isPending ? 'Rejecting…' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  )
}
