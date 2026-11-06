import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, fmtDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Requisitions' }
import StatusPill from '@/components/StatusPill'
import MyReqActions from './MyReqActions'
import CsvExport from './CsvExport'

export default async function MyReqPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: reqs } = await supabase
    .from('requisitions')
    .select(`
      id, req_number, dept, created_at,
      line_items (id, description, amount, status, reason, created_at)
    `)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const all = reqs ?? []

  return (
    <div>
      <div className="fd-pagehead" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="fd-pagehead__title">Your submissions</h1>
          <p className="fd-pagehead__sub">{all.length} requisition{all.length !== 1 ? 's' : ''} submitted. Rejected items can be edited and resubmitted.</p>
        </div>
        {all.length > 0 && (
          <div className="fd-pagehead__actions">
            <CsvExport rows={all.flatMap((req) =>
              (req.line_items ?? []).map((item: { description: string; amount: number; status: string }) => ({
                req_number: req.req_number,
                dept: req.dept,
                req_date: fmtDate(req.created_at),
                description: item.description,
                amount: Number(item.amount),
                status: item.status,
              }))
            )} />
          </div>
        )}
      </div>

      {all.length === 0 && (
        <div className="fd-empty">
          <div className="fd-empty__title">No requisitions yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            <a href="/dashboard/new-req" style={{ color: 'var(--green-700)', textDecoration: 'none', fontWeight: 600 }}>Submit your first requisition</a>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {all.map((req) => {
          const items = req.line_items ?? []
          const total = items.reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0)
          const statuses = items.map((i: { status: string }) => i.status)
          const allPaid = statuses.every((s: string) => s === 'paid')
          const hasRejected = statuses.some((s: string) => s === 'rejected')
          const hasPending = statuses.some((s: string) => s === 'pending')

          let overallStatus: 'pending' | 'dg_approved' | 'approved' | 'rejected' | 'paid' = 'pending'
          if (allPaid) overallStatus = 'paid'
          else if (hasRejected && !hasPending) overallStatus = 'rejected'
          else if (statuses.every((s: string) => s === 'approved' || s === 'paid')) overallStatus = 'approved'
          else if (statuses.every((s: string) => s === 'dg_approved' || s === 'approved' || s === 'paid')) overallStatus = 'dg_approved'

          return (
            <div key={req.id} className="fd-card" style={{ overflow: 'hidden' }}>
              {/* Req header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-divider)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-body)', fontFamily: 'var(--mono)' }}>{req.req_number}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{req.dept} · {fmtDate(req.created_at)}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{formatNaira(total)}</span>
                  <StatusPill status={overallStatus} />
                </div>
              </div>

              {/* Line items */}
              <table className="fd-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th style={{ width: 200 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: { id: number; description: string; amount: number; status: string; reason: string | null }) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>
                        {item.description}
                        {item.reason && (
                          <span className="sub" style={{ color: 'var(--rejected-fg)' }}>Reason: {item.reason}</span>
                        )}
                      </td>
                      <td className="fd-num">{formatNaira(item.amount)}</td>
                      <td><StatusPill status={item.status as 'pending' | 'approved' | 'rejected' | 'paid'} /></td>
                      <td>
                        {item.status === 'rejected' && (
                          <MyReqActions item={{ id: item.id, description: item.description, amount: item.amount }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
