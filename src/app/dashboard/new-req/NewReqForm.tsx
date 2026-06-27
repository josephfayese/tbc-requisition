'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitRequisition, saveAttachment } from '@/app/actions'
import { formatNaira } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { createClient } from '@/lib/supabase/client'

interface LineItem {
  id: number
  description: string
  qty: string
  unitPrice: string
}

export default function NewReqForm({ departments, defaultDept }: { departments: string[]; defaultDept: string }) {
  const [dept, setDept] = useState(defaultDept || departments[0] || '')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ id: 1, description: '', qty: '1', unitPrice: '' }])
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const nextId = useRef(2)
  const fileRef = useRef<HTMLInputElement>(null)

  function addItem() {
    setItems((prev) => [...prev, { id: nextId.current++, description: '', qty: '1', unitPrice: '' }])
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: number, field: keyof Omit<LineItem, 'id'>, value: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }

  function itemTotal(item: LineItem) {
    const q = parseFloat(item.qty) || 0
    const p = parseFloat(item.unitPrice) || 0
    return q * p
  }

  const total = items.reduce((s, i) => s + itemTotal(i), 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = items.map((i) => ({
      description: i.description.trim(),
      qty: parseInt(i.qty) || 1,
      unitPrice: parseFloat(i.unitPrice) || 0,
      amount: itemTotal(i),
    }))
    if (parsed.some((i) => !i.description || i.amount <= 0)) {
      toast('All items need a description, quantity, and unit price', 'error')
      return
    }

    startTransition(async () => {
      const result = await submitRequisition(dept, parsed, notes)
      if (result.error) { toast(result.error, 'error'); return }

      // Upload attachment if provided
      if (attachFile && result.reqId) {
        try {
          const supabase = createClient()
          const ext = attachFile.name.split('.').pop()
          const path = `${result.reqId}/${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('req-attachments')
            .upload(path, attachFile)
          if (!upErr) {
            await saveAttachment(result.reqId, attachFile.name, path)
          }
        } catch { /* non-critical — requisition already saved */ }
      }

      toast(`${result.reqNumber} submitted successfully!`, 'success')
      router.push('/dashboard/my-req')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Department */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>
          Department
        </label>
        <select className="li-input" value={dept} onChange={(e) => setDept(e.target.value)} required>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Justification / Notes */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>
          Justification / Notes <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span>
        </label>
        <textarea
          className="li-input"
          rows={3}
          placeholder="Briefly explain the purpose of this requisition…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ resize: 'vertical', minHeight: 72 }}
        />
      </div>

      {/* Line items */}
      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div className="table-head">
          <span className="card-title">Line Items</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · <strong style={{ color: 'var(--ink-2)' }}>{formatNaira(total)}</strong>
          </span>
        </div>

        <div style={{ padding: '8px 16px 0' }}>
          {/* Header */}
          <div className="li-grid li-grid-head">
            <div>Description</div>
            <div style={{ textAlign: 'center' }}>Qty</div>
            <div style={{ textAlign: 'right' }}>Unit Price (₦)</div>
            <div style={{ textAlign: 'right' }}>Total</div>
            <div />
          </div>

          {items.map((item, idx) => (
            <div key={item.id} className="li-grid li-grid-row">
              <input
                className="li-input"
                placeholder={`Item ${idx + 1}`}
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                autoComplete="off"
                required
              />
              <input
                className="li-input"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={item.qty}
                onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                style={{ textAlign: 'center' }}
                required
              />
              <input
                className="li-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={item.unitPrice}
                onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                style={{ textAlign: 'right' }}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', padding: '0 4px' }}>
                {itemTotal(item) > 0 ? formatNaira(itemTotal(item)) : '—'}
              </div>
              <button
                type="button"
                className="x-btn"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                style={{ opacity: items.length === 1 ? 0.3 : 1 }}
                aria-label="Remove item"
              >✕</button>
            </div>
          ))}

          <div style={{ padding: '12px 0' }}>
            <button type="button" className="ghost-btn" onClick={addItem}>
              <span>+</span> Add line item
            </button>
          </div>
        </div>

        {/* Total */}
        <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tint)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatNaira(total)}</span>
        </div>
      </div>

      {/* Attachment */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>
              Supporting Document <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-4)' }}>(optional · PDF, JPG, PNG · max 10MB)</span>
            </div>
            {attachFile && (
              <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 4, fontWeight: 500 }}>
                📎 {attachFile.name}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="ghost-btn" style={{ fontSize: 12 }} onClick={() => fileRef.current?.click()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              {attachFile ? 'Change file' : 'Attach file'}
            </button>
            {attachFile && (
              <button type="button" className="x-btn" onClick={() => { setAttachFile(null); if (fileRef.current) fileRef.current.value = '' }} aria-label="Remove attachment">✕</button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            nextId.current = 2
            setItems([{ id: 1, description: '', qty: '1', unitPrice: '' }])
            setDept(defaultDept || departments[0] || '')
            setNotes('')
            setAttachFile(null)
            if (fileRef.current) fileRef.current.value = ''
          }}
        >
          Reset
        </button>
        <button type="submit" className="pri-btn" disabled={isPending || items.every((i) => !i.description)}>
          {isPending ? 'Submitting…' : 'Submit Requisition'}
        </button>
      </div>
    </form>
  )
}
