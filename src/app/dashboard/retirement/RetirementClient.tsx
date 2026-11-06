'use client'

import { useState, useTransition } from 'react'
import { retireItem, saveAttachment } from '@/app/actions'
import { formatNaira, fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface PaidItem {
  id: number; description: string; amount: number; qty: number
  unit_price: number | null; paid_at: string; req_number: string; dept: string
}

interface RetiredItem {
  id: number; description: string; amount: number
  retirement_notes: string; retired_at: string; req_number: string; dept: string
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
    if (!note) { toast('Please enter retirement notes for this item.', 'error'); return }
    setRetiring(item.id)
    startTransition(async () => {
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
        <div className="fd-empty" style={{ marginBottom: 24 }}>
          <div className="fd-empty__title">No items pending retirement</div>
          Items will appear here once they have been paid.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {items.map(item => (
            <div key={item.id} className="fd-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-body)' }}>{item.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {item.req_number} · {item.dept} · Paid {fmtDate(item.paid_at)}
                    {item.qty > 1 && ` · ${item.qty} × ${formatNaira(item.unit_price ?? item.amount / item.qty)}`}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--paid-fg)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatNaira(item.amount)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  className="fd-input fd-textarea"
                  rows={2}
                  placeholder="Describe how the funds were used, include receipt reference..."
                  value={notes[item.id] ?? ''}
                  onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label className="fd-btn fd-btn--secondary fd-btn--sm" style={{ cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    {files[item.id] ? files[item.id].name : 'Attach receipt'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(p => ({ ...p, [item.id]: f })) }} />
                  </label>
                  <button
                    className="fd-btn fd-btn--primary fd-btn--sm"
                    onClick={() => handleRetire(item)}
                    disabled={isPending || retiring === item.id || !notes[item.id]?.trim()}
                  >
                    {retiring === item.id ? 'Retiring...' : 'Submit retirement'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {retired.length > 0 && (
        <div className="fd-card fd-card--flush">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-divider)' }}>
            <h2 className="fd-card__title" style={{ margin: 0 }}>Retired items</h2>
          </div>
          <div className="fd-table-wrap">
            <table className="fd-table">
              <thead>
                <tr><th>Description</th><th>Requisition</th><th className="fd-hide-mobile">Retirement notes</th><th className="fd-num">Amount</th><th>Retired</th></tr>
              </thead>
              <tbody>
                {retired.map(it => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.description}</td>
                    <td className="fd-muted" style={{ fontSize: 13 }}>{it.req_number} · {it.dept}</td>
                    <td className="fd-muted fd-hide-mobile" style={{ fontSize: 13, maxWidth: 240 }}>{it.retirement_notes}</td>
                    <td className="fd-num" style={{ fontWeight: 600 }}>{formatNaira(it.amount)}</td>
                    <td className="fd-muted">{fmtDate(it.retired_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
