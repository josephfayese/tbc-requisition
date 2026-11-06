import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { formatNaira, fmtDateTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Payment Queue' }
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
    <div>
      <div className="fd-pagehead" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="fd-pagehead__title">Approved items</h1>
          <p className="fd-pagehead__sub">
            {approved.length} item{approved.length !== 1 ? 's' : ''} approved and awaiting payment ·{' '}
            <strong>{formatNaira(totalPending)}</strong> total outstanding
          </p>
        </div>
        {!canPay && (
          <div style={{ background: 'var(--pending-bg)', border: '1px solid var(--pending-fg)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--pending-fg)', maxWidth: 280 }}>
            Only Chima or Admin can mark items as paid.
          </div>
        )}
      </div>

      {/* Payment queue */}
      <div className="fd-card fd-card--flush" style={{ marginBottom: 32 }}>
        <div className="fd-card__head">
          <span className="fd-card__title">Awaiting payment</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{approved.length} items · {formatNaira(totalPending)}</span>
        </div>
        {approved.length === 0 ? (
          <div className="fd-empty">
            No approved items awaiting payment.
          </div>
        ) : (
          <table className="fd-table">
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
                    <td style={{ fontWeight: 600 }}>{item.description}</td>
                    <td>{req?.dept}</td>
                    <td>{req?.profiles?.name}</td>
                    <td>
                      {req?.account_number ? (
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 600 }}>{req.account_name}</div>
                          <div style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{req.account_number}</div>
                          <div style={{ color: 'var(--text-muted)' }}>{req.bank_name}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td>{approver?.name ?? '—'}</td>
                    <td className="fd-num" style={{ fontWeight: 600 }}>{formatNaira(item.amount)}</td>
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
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
        Recently paid
        <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--surface-canvas)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{paid.length}</span>
      </h2>
      <div className="fd-card fd-card--flush">
        {paid.length === 0 ? (
          <div className="fd-empty">
            No payments recorded yet.
          </div>
        ) : (
          <table className="fd-table">
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
                    <td style={{ fontWeight: 600 }}>{item.description}</td>
                    <td>{req?.dept}</td>
                    <td>{payer?.name ?? '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.paid_at ? fmtDateTime(item.paid_at as string) : '—'}</td>
                    <td className="fd-num">{formatNaira(item.amount)}</td>
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
