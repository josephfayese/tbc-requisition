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

  // ── Fetch all data in parallel ────────────────────────────────────────────

  const [
    { data: outstandingItems },
    { data: retiredAgg },
    { count: approvedCount },
    { data: reconLog },
    { data: allItems },
    { data: allReqs },
  ] = await Promise.all([
    // Paid items not yet retired (outstanding retirements widget)
    supabase
      .from('line_items')
      .select('id, description, amount, paid_at, requisitions!inner(req_number, dept, profiles(name))')
      .eq('status', 'paid')
      .order('paid_at', { ascending: true }),

    // Retired totals
    supabase.from('line_items').select('amount').eq('status', 'retired'),

    // Payment / approval queue count
    supabase.from('line_items').select('*', { count: 'exact', head: true }).eq('status', 'approved'),

    // Reconciled requisitions
    supabase.from('audit_log').select('req_id').or('action.eq.Reconciled,action.eq.Auto-reconciled'),

    // All line items for analytics
    supabase
      .from('line_items')
      .select('id, amount, status, paid_at, decided_at, created_at, requisitions!inner(dept)')
      .order('created_at', { ascending: false }),

    // All requisitions (for dept grouping)
    supabase.from('requisitions').select('id, dept, created_at'),
  ])

  // ── Core totals ───────────────────────────────────────────────────────────
  const outstanding = outstandingItems ?? []
  const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.amount), 0)
  const totalRetired = (retiredAgg ?? []).reduce((s, i) => s + Number(i.amount), 0)
  const reconciledReqIds = new Set((reconLog ?? []).map((r) => r.req_id))

  // ── Analytics computations ────────────────────────────────────────────────
  const items = allItems ?? []
  const now = new Date()
  const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString()

  // YTD: items paid or retired this calendar year
  const ytdItems = items.filter(
    (i) => ['paid', 'retired'].includes(i.status) && i.paid_at && i.paid_at >= ytdStart
  )
  const ytdTotal = ytdItems.reduce((s, i) => s + Number(i.amount), 0)

  // Pipeline: pending + approved
  const pipelineItems = items.filter((i) => ['pending', 'approved'].includes(i.status))
  const pipelineTotal = pipelineItems.reduce((s, i) => s + Number(i.amount), 0)

  // Rejection rate
  const decidedItems = items.filter((i) => ['approved', 'rejected', 'paid', 'retired'].includes(i.status))
  const rejectedItems = items.filter((i) => i.status === 'rejected')
  const rejectionRate = decidedItems.length > 0
    ? Math.round((rejectedItems.length / decidedItems.length) * 100)
    : 0

  // Avg days from submission to payment (for paid/retired items with paid_at)
  const paidItems = items.filter((i) => ['paid', 'retired'].includes(i.status) && i.paid_at && i.created_at)
  const avgDaysToPay = paidItems.length > 0
    ? Math.round(
        paidItems.reduce((s, i) => {
          const diff = (new Date(i.paid_at!).getTime() - new Date(i.created_at).getTime()) / 86400000
          return s + diff
        }, 0) / paidItems.length
      )
    : null

  // Spend by department (paid + retired only)
  const deptMap: Record<string, { paid: number; retired: number; pending: number; approved: number }> = {}
  for (const item of items) {
    const dept = (item.requisitions as unknown as { dept: string }).dept ?? 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = { paid: 0, retired: 0, pending: 0, approved: 0 }
    if (item.status === 'paid') deptMap[dept].paid += Number(item.amount)
    else if (item.status === 'retired') deptMap[dept].retired += Number(item.amount)
    else if (item.status === 'pending') deptMap[dept].pending += Number(item.amount)
    else if (item.status === 'approved') deptMap[dept].approved += Number(item.amount)
  }
  const deptRows = Object.entries(deptMap)
    .map(([dept, v]) => ({ dept, disbursed: v.paid + v.retired, pipeline: v.pending + v.approved }))
    .filter((d) => d.disbursed > 0 || d.pipeline > 0)
    .sort((a, b) => b.disbursed - a.disbursed)
  const maxDisbursed = Math.max(...deptRows.map((d) => d.disbursed), 1)

  // Monthly disbursements — last 6 months
  const months: { label: string; key: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    months.push({ label, key, amount: 0 })
  }
  for (const item of items) {
    if (!['paid', 'retired'].includes(item.status) || !item.paid_at) continue
    const key = item.paid_at.slice(0, 7)
    const month = months.find((m) => m.key === key)
    if (month) month.amount += Number(item.amount)
  }
  const maxMonthAmount = Math.max(...months.map((m) => m.amount), 1)

  // Status breakdown (pipeline funnel)
  const statusCounts: Record<string, { count: number; amount: number }> = {}
  for (const item of items) {
    if (!statusCounts[item.status]) statusCounts[item.status] = { count: 0, amount: 0 }
    statusCounts[item.status].count++
    statusCounts[item.status].amount += Number(item.amount)
  }

  // Outstanding retirements grouped by req
  const reqMap: Record<string, { req_number: string; dept: string; requester: string; total: number; count: number; paid_at: string }> = {}
  for (const item of outstanding) {
    const req = item.requisitions as any
    const key = req.req_number
    if (!reqMap[key]) reqMap[key] = { req_number: req.req_number, dept: req.dept, requester: req.profiles?.name ?? '—', total: 0, count: 0, paid_at: item.paid_at }
    reqMap[key].total += Number(item.amount)
    reqMap[key].count += 1
  }
  const outstandingReqs = Object.values(reqMap).slice(0, 8)

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      {/* Masthead */}
      <div className="masthead" style={{ marginBottom: 32 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Overview</div>
          <h1>Dashboard</h1>
          <p className="masthead-sub">Welcome back, {profile.name}.</p>
        </div>
      </div>

      {/* ── Row 1: Core flow stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <StatCard label="Outstanding" value={formatNaira(totalOutstanding)} sub={`${outstanding.length} paid, not retired`} color={totalOutstanding > 0 ? 'var(--warn)' : 'var(--ink-4)'} href="/dashboard/reconciliation" />
        <StatCard label="Total Retired" value={formatNaira(totalRetired)} sub="funds fully accounted for" color="var(--pos)" href="/dashboard/reconciliation" />
        <StatCard label="Reconciled Reqs" value={String(reconciledReqIds.size)} sub="signed off by finance" color="var(--brand)" href="/dashboard/reconciliation" />
        {(profile.role === 'chima' || profile.role === 'admin') && (
          <StatCard label="Payment Queue" value={String(approvedCount ?? 0)} sub="approved, awaiting payment" color={(approvedCount ?? 0) > 0 ? 'var(--brand)' : 'var(--ink-4)'} href="/dashboard/payments" />
        )}
        {profile.role === 'finance' && (
          <StatCard label="Approval Queue" value={String(approvedCount ?? 0)} sub="items pending deliberation" color={(approvedCount ?? 0) > 0 ? 'var(--warn)' : 'var(--ink-4)'} href="/dashboard/approve" />
        )}
      </div>

      {/* ── Row 2: Accounting KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatCard label="YTD Disbursed" value={formatNaira(ytdTotal)} sub={`${now.getFullYear()} paid & retired`} color="var(--ink)" href="/dashboard/reconciliation" />
        <StatCard label="Pipeline Value" value={formatNaira(pipelineTotal)} sub="pending + approved items" color="var(--purple)" href="/dashboard/approve" />
        <StatCard label="Rejection Rate" value={`${rejectionRate}%`} sub={`${rejectedItems.length} of ${decidedItems.length} decided`} color={rejectionRate > 20 ? 'var(--neg)' : 'var(--ink-4)'} href="/dashboard/approve" />
        <StatCard label="Avg Days to Pay" value={avgDaysToPay !== null ? `${avgDaysToPay}d` : '—'} sub="submission → bank payment" color="var(--ink-3)" href="/dashboard/payments" />
      </div>

      {/* ── Spend by Department ── */}
      <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Spend by Department</div>
      <div className="card" style={{ marginBottom: 28, overflow: 'hidden' }}>
        {deptRows.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--ink-4)' }}>No disbursement data yet.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Disbursed</th>
                <th style={{ textAlign: 'right' }}>In Pipeline</th>
                <th style={{ width: 160 }}>Share of Spend</th>
              </tr>
            </thead>
            <tbody>
              {deptRows.map((d) => (
                <tr key={d.dept}>
                  <td className="strong">{d.dept}</td>
                  <td className="num" style={{ color: 'var(--pos)', fontWeight: 600 }}>{formatNaira(d.disbursed)}</td>
                  <td className="num" style={{ color: 'var(--purple)', fontSize: 12 }}>{d.pipeline > 0 ? formatNaira(d.pipeline) : '—'}</td>
                  <td style={{ paddingRight: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((d.disbursed / maxDisbursed) * 100)}%`, height: '100%', background: 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', minWidth: 32, textAlign: 'right' }}>
                        {Math.round((d.disbursed / maxDisbursed) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-tint)' }}>
                <td style={{ fontWeight: 700, fontSize: 13, padding: '12px 16px' }}>Total</td>
                <td className="num strong" style={{ color: 'var(--pos)' }}>{formatNaira(deptRows.reduce((s, d) => s + d.disbursed, 0))}</td>
                <td className="num" style={{ color: 'var(--purple)', fontWeight: 600 }}>{formatNaira(deptRows.reduce((s, d) => s + d.pipeline, 0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Monthly Disbursements ── */}
      <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Monthly Disbursements — Last 6 Months</div>
      <div className="card" style={{ padding: '20px 24px', marginBottom: 28 }}>
        {months.every((m) => m.amount === 0) ? (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', padding: '12px 0' }}>No payment data in this period.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {months.map((m) => {
              const pct = Math.round((m.amount / maxMonthAmount) * 100)
              const isCurrentMonth = m.key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
              return (
                <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  {m.amount > 0 && (
                    <div style={{ fontSize: 9, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
                      {formatNaira(m.amount).replace('₦', '')}
                    </div>
                  )}
                  <div style={{
                    width: '100%', background: isCurrentMonth ? 'var(--brand)' : 'var(--brand-soft)',
                    borderRadius: '4px 4px 0 0', height: `${Math.max(pct, m.amount > 0 ? 4 : 0)}%`,
                    border: isCurrentMonth ? 'none' : '1px solid var(--brand-line)',
                    minHeight: m.amount > 0 ? 4 : 0,
                  }} />
                  <div style={{ fontSize: 10, color: isCurrentMonth ? 'var(--brand)' : 'var(--ink-4)', fontWeight: isCurrentMonth ? 700 : 400, whiteSpace: 'nowrap' }}>
                    {m.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Status Funnel ── */}
      <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Requisition Pipeline Breakdown</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 32 }}>
        {[
          { key: 'pending', label: 'Pending', color: 'var(--warn)', bg: 'var(--warn-soft)' },
          { key: 'approved', label: 'Approved', color: 'var(--pos)', bg: 'var(--pos-soft)' },
          { key: 'paid', label: 'Paid', color: 'var(--brand)', bg: 'var(--brand-soft)' },
          { key: 'retired', label: 'Retired', color: 'var(--ink)', bg: 'var(--bg-sunken)' },
          { key: 'rejected', label: 'Rejected', color: 'var(--neg)', bg: 'var(--neg-soft)' },
        ].map(({ key, label, color, bg }) => {
          const s = statusCounts[key] ?? { count: 0, amount: 0 }
          return (
            <div key={key} className="card" style={{ padding: '14px 16px', background: bg, border: `1px solid ${color}22` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>{s.count}</div>
              <div style={{ fontSize: 11, color, opacity: 0.75 }}>{s.amount > 0 ? formatNaira(s.amount) : '—'}</div>
            </div>
          )
        })}
      </div>

      {/* ── Outstanding Retirements ── */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ margin: 0 }}>
          <span className="bar" />Outstanding Retirements
          {outstanding.length > 0 && <span className="count">{outstanding.length}</span>}
        </div>
        <Link href="/dashboard/reconciliation" style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}>
          View full reconciliation →
        </Link>
      </div>
      <div className="table-wrap" style={{ marginBottom: 32 }}>
        {outstandingReqs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>All clear</div>
            <div style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>No paid items waiting for retirement.</div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Req #</th><th>Department</th><th>Requester</th><th>Items</th><th>Paid</th>
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
            Showing 8 of {outstanding.length}.{' '}
            <Link href="/dashboard/reconciliation" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
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

function StatCard({ label, value, sub, color, href }: { label: string; value: string; sub: string; color: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '16px 18px', cursor: 'pointer' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{sub}</div>
      </div>
    </Link>
  )
}

function ActionCard({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: label }} />
        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{sub}</div>
      </div>
    </Link>
  )
}
