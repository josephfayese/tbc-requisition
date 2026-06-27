'use client'

import { useState, useTransition } from 'react'
import { retireItem, saveAttachment } from '@/app/actions'
import { formatNaira, fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PaidItem {
  id: number
  description: string
  amount: number
  qty: number
  unit_price: number | null
  paid_at: string
  req_number: string
  dept: string
}

interface RetiredItem {
  id: number
  description: string
  amount: number
  retirement_notes: string
  retired_at: string
  req_number: string
  dept: string
}

export default function RetirementClient({ items, retired }: { items: PaidItem[]; retired: RetiredItem[] }) {
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [files, setFiles] = useState<Record<number, File>>({})
  const [retiring, setRetiring] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleRetire(item: PaidItem) {
    const note = notes[item.id]?.trim()
    if (!note) { toast('Please enter retirement notes for this item', 'error'); return }
    setRetiring(item.id)
    startTransition(async () => {
      // Upload file if provided
      const file = files[item.id]
      if (file) {
        try {
          const supabase = createClient()
          const ext = file.name.split('.').pop()
          const path = `retirement/${item.id}/${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage.from('req-attachments').upload(path, file)
          if (!upErr) await saveAttachment(0, file.name, path)
        } catch { /* non-critical */ }
      }

      const result = await retireItem(item.id, note)
      if (result.error) { toast(result.error, 'error'); setRetiring(null); return }
      toast(`"${item.description}" retired`, 'success')
      setRetiring(null)
      router.refresh()
    })
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>No items pending retirement</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
            Items will appear here once they have been paid.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          <div className="section-title"><span className="bar" />Awaiting Retirement <span className="count">{items.length}</span></div>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{item.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>
                    {item.req_number} · {item.dept} · Paid {fmtDate(item.paid_at)}
                    {item.qty > 1 && ` · ${item.qty} × ${formatNaira(item.unit_price ?? item.amount / item.qty)}`}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--pos)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatNaira(item.amount)}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  className="li-input"
                  rows={2}
                  placeholder="Describe how the funds were used, include receipt reference…"
                  value={notes[item.id] ?? ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [item.id]: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: 60 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)', border: '1px dashed var(--line-2)', borderRadius: 7, padding: '6px 12px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    {files[item.id] ? files[item.id].name : 'Attach receipt'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) setFiles((p) => ({ ...p, [item.id]: f }))
                      }}
                    />
                  </label>
                  <button
                    className="act-btn act-approve"
                    onClick={() => handleRetire(item)}
                    disabled={isPending || retiring === item.id || !notes[item.id]?.trim()}
                    style={{ opacity: !notes[item.id]?.trim() || isPending ? 0.5 : 1 }}
                  >
                    {retiring === item.id ? 'Retiring…' : 'Submit Retirement'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {retired.length > 0 && (
        <>
          <div className="section-title"><span className="bar" />Retired Items <span className="count">{retired.length}</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Requisition</th>
                  <th>Retirement Notes</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Retired</th>
                </tr>
              </thead>
              <tbody>
                {retired.map((it) => (
                  <tr key={it.id}>
                    <td className="strong">{it.description}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.req_number} · {it.dept}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)', maxWidth: 240 }}>{it.retirement_notes}</td>
                    <td className="num strong">{formatNaira(it.amount)}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-4)' }}>{fmtDate(it.retired_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
