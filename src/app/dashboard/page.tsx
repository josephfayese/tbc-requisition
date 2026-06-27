import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatNaira, fmtDate } from '@/lib/utils'

// Roles that get a full home page vs. a direct redirect
const REDIRECT_ROLES: Record<string, string> = {
  hod:    '/dashboard/new-req',
  dg:     '/dashboard/approve',
  backup: '/dashboard/approve',
  pastor: '/dashboard/approve',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Non-home roles go straight to their module
  if (REDIRECT_ROLES[profile.role]) redirect(REDIRECT_ROLES[profile.role])

  // ── Data for finance / chima / admin ──────────────────────────────────────

  // Paid items (outstanding — not yet retired)
  const { data: outstandingItems } = await supabase
    .from('line_items')
    .select(`
      id, description, amount, paid_at,
      requisitions!inner(req_number, dept, profiles(name))
    `)
    .eq('status', 'paid')
    .order('paid_at', { ascending: true })

  // Retired items total
  const { data: retiredAgg } = await supabase
    .from('line_items')
    .select('amount')
    .eq('status', 'retired')

  // Approved items (payment queue)
  const { count: approvedCount } = await supabase
    .from('line_items')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')

  // Reconciled req count (distinct req_ids in audit_log with action = 'Reconciled')
  const { data: reconLog } = await supabase
    .from('audit_log')
    .select('req_id')
    .eq('action', 'Reconciled')

  const outstanding = outstandingItems ?? []
  const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.amount), 0)
  const totalRetired = (retiredAgg ?? []).reduce((s, i) => s + Number(i.amount), 0)
  const reconciledReqIds = new Set((reconLog ?? []).map((r) => r.req_id))

  // Group outstanding items by requisition for the widget
  const reqMap: Record<string, { req_number: string; dept: string; requester: string; total: number; count: number; paid_at: string }> = {}
  for (const item of outstanding) {
    const req = item.requisitions as any
    const key = req.req_number
    if (!reqMap[key]) {
      reqMap[key] = {
        req_number: req.req_number,
        dept: req.dept,
        requester: req.profiles?.name ?? '—',
        total: 0,
        count: 0,
        paid_at: item.paid_at,
      }
    }
    reqMap[key].total += Number(item.amount)
    reqMap[key].count += 1
  }
  const outstandingReqs = Object.values(reqMap).slice(0, 8)

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      {/* Masthead */}
      <div className="masthead" style={{ marginBottom: 32 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Overview</div>
          <h1>Dashboard</h1>
          <p className="masthead-sub">
            Welcome back, {profile.name}.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatCard
          label="Outstanding"
          value={formatNaira(totalOutstanding)}
          sub={`${outstanding.length} item${outstanding.length !== 1 ? 's' : ''} paid, not yet retired`}
          color={totalOutstanding > 0 ? 'var(--warn)' : 'var(--ink-4)'}
          href="/dashboard/reconciliation"
        />
        <StatCard
          label="Total Retired"
          value={formatNaira(totalRetired)}
          sub="funds accounted for"
          color="var(--pos)"
          href="/dashboard/reconciliation"
        />
        <StatCard
          label="Reconciled Reqs"
          value={String(reconciledReqIds.size)}
          sub="signed off by finance"
          color="var(--brand)"
          href="/dashboard/reconciliation"
        />
        {(profile.role === 'chima' || profile.role === 'admin') && (
          <StatCard
            label="Payment Queue"
            value={String(approvedCount ?? 0)}
            sub="items approved, awaiting payment"
            color={(approvedCount ?? 0) > 0 ? 'var(--brand)' : 'var(--ink-4)'}
            href="/dashboard/payments"
          />
        )}
        {profile.role === 'finance' && (
          <StatCard
            label="Approval Queue"
            value={String(approvedCount ?? 0)}
            sub="items pending deliberation"
            color={(approvedCount ?? 0) > 0 ? 'var(--warn)' : 'var(--ink-4)'}
            href="/dashboard/approve"
          />
        )}
      </div>

      {/* Reconciliation widget */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <span className="bar" />Outstanding Retirements
          {outstanding.length > 0 && <span className="count">{outstanding.length}</span>}
        </div>
        <Link
          href="/dashboard/reconciliation"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}
        >
          View full reconciliation →
        </Link>
      </div>

      <div className="table-wrap" style={{ marginBottom: 32 }}>
        {outstandingReqs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>All clear</div>
            <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
              No paid items are waiting for retirement.
            </div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Req #</th>
                <th>Department</th>
                <th>Requester</th>
                <th>Items</th>
                <th>Paid</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {outstandingReqs.map((req) => (
                <tr key={req.req_number}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{req.req_number}</td>
                  <td>{req.dept}</td>
                  <td>{req.requester}</td>
                  <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{req.count} item{req.count !== 1 ? 's' : ''}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-4)' }}>{fmtDate(req.paid_at)}</td>
                  <td className="num strong" style={{ color: 'var(--warn)' }}>{formatNaira(req.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {outstanding.length > 8 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-2)', fontSize: 12, color: 'var(--ink-4)' }}>
            Showing 8 of {outstanding.length} outstanding items.{' '}
            <Link href="/dashboard/reconciliation" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="section-title"><span className="bar" />Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <ActionCard href="/dashboard/reconciliation" label="Reconciliation" sub="Verify retired funds" />
        {(profile.role === 'chima' || profile.role === 'admin') && (
          <ActionCard href="/dashboard/payments" label="Payment Queue" sub="Mark approved items paid" />
        )}
        {(profile.role === 'finance' || profile.role === 'admin') && (
          <ActionCard href="/dashboard/approve" label="Approval Queue" sub="Review pending items" />
        )}
        <ActionCard href="/dashboard/viewer" label="Group Dashboard" sub="Org-wide overview" />
        {profile.role === 'admin' && (
          <>
            <ActionCard href="/dashboard/admin" label="Users &amp; Roles" sub="Manage team access" />
            <ActionCard href="/dashboard/audit" label="Audit History" sub="Immutable change log" />
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, sub, color, href,
}: {
  label: string; value: string; sub: string; color: string; href: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '16px 18px', cursor: 'pointer' }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 6,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{sub}</div>
      </div>
    </Link>
  )
}

function ActionCard({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}
          dangerouslySetInnerHTML={{ __html: label }}
        />
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{sub}</div>
      </div>
    </Link>
  )
}
