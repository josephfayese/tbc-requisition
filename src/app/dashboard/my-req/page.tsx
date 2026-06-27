import { createClient } from '@/lib/supabase/server'
import { formatNaira, fmtDate } from '@/lib/utils'
import StatusPill from '@/components/StatusPill'
import MyReqActions from './MyReqActions'

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
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />My Requisitions</div>
          <h1>Your <em>Submissions</em></h1>
          <p className="masthead-sub">{all.length} requisition{all.length !== 1 ? 's' : ''} submitted. Rejected items can be edited and resubmitted.</p>
        </div>
      </div>

      {all.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>No requisitions yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
            <a href="/dashboard/new-req" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>Submit your first requisition →</a>
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
            <div key={req.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Req header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{req.req_number}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{req.dept} · {fmtDate(req.created_at)}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatNaira(total)}</span>
                  <StatusPill status={overallStatus} />
                </div>
              </div>

              {/* Line items */}
              <table className="tbl">
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
                      <td className="strong">
                        {item.description}
                        {item.reason && (
                          <span className="sub" style={{ color: 'var(--neg)' }}>Reason: {item.reason}</span>
                        )}
                      </td>
                      <td className="num">{formatNaira(item.amount)}</td>
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
