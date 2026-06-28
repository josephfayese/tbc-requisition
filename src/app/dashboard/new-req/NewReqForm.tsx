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
  justification: string
  file: File | null
}

export default function NewReqForm({ departments, defaultDept }: { departments: string[]; defaultDept: string }) {
  const [dept, setDept] = useState(defaultDept || departments[0] || '')
  const [items, setItems] = useState<LineItem[]>([{ id: 1, description: '', qty: '1', unitPrice: '', justification: '', file: null }])
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const nextId = useRef(2)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  function addItem() {
    setItems((prev) => [...prev, { id: nextId.current++, description: '', qty: '1', unitPrice: '', justification: '', file: null }])
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: number, field: keyof Omit<LineItem, 'id' | 'file'>, value: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }

  function setItemFile(id: number, file: File | null) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, file } : i))
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
      justification: i.justification,
    }))
    if (parsed.some((i) => !i.description || i.amount <= 0)) {
      toast('All items need a description, quantity, and unit price', 'error')
      return
    }

    startTransition(async () => {
      const result = await submitRequisition(dept, parsed)
      if (result.error) { toast(result.error, 'error'); return }

      // Upload per-item attachments (lineItemIds come back in order)
      const lineItemIds = result.lineItemIds ?? []
      const supabase = createClient()
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        const lineItemId = lineItemIds[idx]
        if (item.file && result.reqId && lineItemId) {
          try {
            const ext = item.file.name.split('.').pop()
            const path = `${result.reqId}/${lineItemId}_${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('req-attachments')
              .upload(path, item.file)
            if (!upErr) {
              await saveAttachment(result.reqId, item.file.name, path, lineItemId)
            }
          } catch { /* non-critical */ }
        }
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
            <div key={item.id} style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}>
              {/* Main row */}
              <div className="li-grid" style={{ alignItems: 'center' }}>
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

              {/* Per-item justification + attachment */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    className="li-input"
                    placeholder="Justification for this item (optional)"
                    value={item.justification}
                    onChange={(e) => updateItem(item.id, 'justification', e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="ghost-btn"
                    style={{ fontSize: 11, padding: '6px 10px' }}
                    onClick={() => fileRefs.current[item.id]?.click()}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    {item.file ? item.file.name.slice(0, 20) + (item.file.name.length > 20 ? '…' : '') : 'Attach'}
                  </button>
                  {item.file && (
                    <button
                      type="button"
                      className="x-btn"
                      style={{ width: 26, height: 26, fontSize: 10 }}
                      onClick={() => {
                        setItemFile(item.id, null)
                        const ref = fileRefs.current[item.id]
                        if (ref) ref.value = ''
                      }}
                      aria-label="Remove attachment"
                    >✕</button>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[item.id] = el }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={(e) => setItemFile(item.id, e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
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

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            nextId.current = 2
            setItems([{ id: 1, description: '', qty: '1', unitPrice: '', justification: '', file: null }])
            setDept(defaultDept || departments[0] || '')
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
