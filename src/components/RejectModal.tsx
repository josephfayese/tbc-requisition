'use client'

import { useState, useTransition } from 'react'
import { rejectItem } from '@/app/actions'
import { useToast } from './Toast'

interface Props {
  description: string
  onClose: () => void
  lineItemId?: number
  onDone?: () => void
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
        await onConfirm(reason.trim())
      } else if (lineItemId !== undefined && onDone) {
        const result = await rejectItem(lineItemId, reason.trim())
        if (result.error) { toast(result.error, 'error'); return }
        toast(`Rejected "${description}"`, 'error')
        onDone()
      }
    })
  }

  return (
    <div className="fd-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fd-dialog">
        <h2 className="fd-dialog__title">Reject line item</h2>
        <p className="fd-dialog__body">{description}</p>

        <div className="fd-field">
          <label className="fd-field__label">
            Reason for rejection <span style={{ color: 'var(--rejected-fg)' }}>*</span>
          </label>
          <textarea
            className="fd-input fd-textarea"
            rows={3}
            placeholder="e.g. Defer to Q3 budget, insufficient documentation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <span className="fd-field__help">
            This reason will be visible to the requester and recorded in the audit log.
          </span>
        </div>

        <div className="fd-dialog__actions">
          <button className="fd-btn fd-btn--secondary" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="fd-btn fd-btn--danger"
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? 'Rejecting...' : 'Confirm rejection'}
          </button>
        </div>
      </div>
    </div>
  )
}
