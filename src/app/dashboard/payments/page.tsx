import { createClient } from '@/lib/supabase/server'
import { formatNaira, fmtDateTime } from '@/lib/utils'
import StatusPill from '@/components/StatusPill'
import PayButton from './PayButton'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const canPay = profile?.role === 'chima' || profile?.role === 'admin'

  // Approved items (to pay)
  const { data: approvedItems } = await supabase
    .from('line_items')
    .select(`
      id, description, amount, status, decided_at,
      req_id,
      requisitions (req_number, dept, bank_name, account_number, account_name, profiles (name)),
      profiles!line_items_decided_by_fkey (name)
    `)
    .eq('status', 'approved')
    .order('decided_at', { ascending: true })

  // Recently paid items (last 20)
  const { data: paidItems } = await supabase
    .from('line_items')
    .select(`
      id, description, amount, status, paid_at,
      req_id,
      requisitions (req_number, dept, profiles (name)),
      profiles!line_items_paid_by_fkey (name)
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(20)

  const approved = approvedItems ?? []
  const paid = paidItems ?? []
  const totalPending = approved.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Payment Queue</div>
          <h1><em>Approved</em> Items</h1>
          <p className="masthead-sub">
            {approved.length} item{approved.length !== 1 ? 's' : ''} approved and awaiting payment ·{' '}
            <strong>{formatNaira(totalPending)}</strong> total outstanding
          </p>
        </div>
        {!canPay && (
          <div style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--warn)', maxWidth: 280 }}>
            Only Chima or Admin can mark items as paid.
          </div>
        )}
      </div>

      {/* Payment queue */}
      <div className="table-wrap" style={{ marginBottom: 32 }}>
        <div className="table-head">
          <span className="card-title">Awaiting Payment</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{approved.length} items · {formatNaira(totalPending)}</span>
        </div>
        {approved.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
            No approved items awaiting payment.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Req #</th>
                <th>Description</th>
                <th>Dept</th>
                <th>Requester</th>
                <th>Pay to</th>
                <th>Approved by</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                {canPay && <th style={{ width: 120 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {approved.map((item) => {
                const req = (item.requisitions as unknown) as { req_number: string; dept: string; bank_name: string | null; account_number: string | null; account_name: string | null; profiles: { name: string } } | null
                const approver = ((item as unknown) as { profiles?: { name: string } | null }).profiles
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{req?.req_number}</td>
                    <td className="strong">{item.description}</td>
                    <td>{req?.dept}</td>
                    <td>{req?.profiles?.name}</td>
                    <td>
                      {req?.account_number ? (
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 600 }}>{req.account_name}</div>
                          <div style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{req.account_number}</div>
                          <div style={{ color: 'var(--ink-4)' }}>{req.bank_name}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>{approver?.name ?? '—'}</td>
                    <td className="num strong">{formatNaira(item.amount)}</td>
                    {canPay && (
                      <td>
                        <PayButton lineItemId={item.id} description={item.description} amount={Number(item.amount)} />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recently paid */}
      <div className="section-title">
        <span className="bar" />
        Recently Paid
        <span className="count">{paid.length}</span>
      </div>
      <div className="table-wrap">
        {paid.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
            No payments recorded yet.
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Req #</th>
                <th>Description</th>
                <th>Dept</th>
                <th>Paid by</th>
                <th>Paid at</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paid.map((item) => {
                const req = (item.requisitions as unknown) as { req_number: string; dept: string } | null
                const payer = ((item as unknown) as { profiles?: { name: string } | null }).profiles
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{req?.req_number}</td>
                    <td className="strong">{item.description}</td>
                    <td>{req?.dept}</td>
                    <td>{payer?.name ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.paid_at ? fmtDateTime(item.paid_at as string) : '—'}</td>
                    <td className="num">{formatNaira(item.amount)}</td>
                    <td><StatusPill status="paid" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
