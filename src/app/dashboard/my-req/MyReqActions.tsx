'use client'

import { useState, useTransition } from 'react'
import { resubmitItem } from '@/app/actions'
import { useToast } from '@/components/Toast'

interface Props {
  item: { id: number; description: string; amount: number }
}

export default function MyReqActions({ item }: Props) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(item.description)
  const [amount, setAmount] = useState(String(item.amount))
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleResubmit() {
    const amt = parseFloat(amount)
    if (!desc.trim() || isNaN(amt) || amt <= 0) {
      toast('Please fill in a valid description and amount', 'error')
      return
    }
    startTransition(async () => {
      const result = await resubmitItem(item.id, desc.trim(), amt)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast('Item resubmitted for review', 'success')
        setEditing(false)
      }
    })
  }

  if (!editing) {
    return (
      <button
        className="act-btn"
        style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: 11 }}
        onClick={() => setEditing(true)}
      >
        ✏ Edit &amp; resubmit
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        className="li-input"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
        style={{ fontSize: 12, padding: '6px 8px' }}
      />
      <input
        className="li-input"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        min="1"
        step="0.01"
        style={{ fontSize: 12, padding: '6px 8px', textAlign: 'right' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="act-btn act-approve"
          onClick={handleResubmit}
          disabled={isPending}
          style={{ fontSize: 11, flex: 1, justifyContent: 'center' }}
        >
          {isPending ? '…' : 'Resubmit'}
        </button>
        <button
          className="act-btn"
          style={{ background: 'var(--bg-sunken)', color: 'var(--ink-3)', fontSize: 11 }}
          onClick={() => { setEditing(false); setDesc(item.description); setAmount(String(item.amount)) }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
