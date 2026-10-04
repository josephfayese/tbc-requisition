'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatNaira, fmtDate, formatHours } from '@/lib/utils'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  profileName: string
  profileRole: string
  allItems: any[]
  reconciledReqIds: (number | null)[]
  approvedCount: number
}

type Preset = 'week' | 'month' | 'quarter' | 'ytd' | 'all'

function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  switch (preset) {
    case 'week': { const d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return { from: d.toISOString().slice(0, 10), to } }
    case 'month': return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to }
    case 'quarter': { const qm = Math.floor(now.getMonth() / 3) * 3; return { from: `${now.getFullYear()}-${String(qm + 1).padStart(2, '0')}-01`, to } }
    case 'ytd': return { from: `${now.getFullYear()}-01-01`, to }
    default: return { from: '', to: '' }
  }
}

function inRange(dateStr: string | null, from: string, to: string): boolean {
  if (!dateStr) return false
  if (!from && !to) return true
  const d = dateStr.slice(0, 10)
  return (!from || d >= from) && (!to || d <= to)
}

interface Insight { severity: 'pos' | 'neg' | 'warn' | 'info'; title: string; detail: string }

function computeInsights(
  items: any[], rejectionRate: number, avgSlaHours: number | null,
  overdueCount: number, months: { amount: number }[], deptRows: { dept: string; disbursed: number }[],
  pipelineTotal: number, totalRetired: number, approvedCount: number,
): Insight[] {
  const signals: Insight[] = []
  if (rejectionRate > 25) signals.push({ severity: 'warn', title: `High rejection rate: ${rejectionRate}%`, detail: 'Review submission guidelines with heads of department to reduce rework.' })
  if (avgSlaHours !== null && avgSlaHours > 2) signals.push({ severity: 'neg', title: `Payment SLA breached: avg ${formatHours(avgSlaHours)}`, detail: 'Average approval-to-payment time exceeds the 2-hour benchmark.' })
  if (overdueCount > 3) signals.push({ severity: 'warn', title: `${overdueCount} overdue retirements`, detail: 'Items are past their 15-day retirement window. Follow up with requesters.' })
  if (months.length >= 4) {
    const cur = months[months.length - 1].amount
    const avg = months.slice(months.length - 4, months.length - 1).reduce((s, m) => s + m.amount, 0) / 3
    if (avg > 0 && cur > avg * 1.5) signals.push({ severity: 'info', title: `Spending spike: ${Math.round((cur / avg) * 100)}% of 3-month average`, detail: 'This month\'s disbursements are significantly above recent averages.' })
  }
  const totalDisbursed = deptRows.reduce((s, d) => s + d.disbursed, 0)
  if (totalDisbursed > 0) { for (const dept of deptRows) { const pct = Math.round((dept.disbursed / totalDisbursed) * 100); if (pct > 50) { signals.push({ severity: 'info', title: `${dept.dept} accounts for ${pct}% of spend`, detail: 'One department dominates total disbursements.' }); break } } }
  if (pipelineTotal > totalRetired && totalRetired > 0) signals.push({ severity: 'warn', title: 'Pipeline exceeds retired funds', detail: `Pipeline value (${formatNaira(pipelineTotal)}) is higher than total retired (${formatNaira(totalRetired)}).` })
  if (approvedCount > 5) signals.push({ severity: 'warn', title: `${approvedCount} items in payment queue`, detail: 'A backlog is forming. Clear approved items promptly.' })
  if (signals.length === 0) signals.push({ severity: 'info', title: 'No issues detected', detail: 'Rejection rate, payment SLA, and retirements are within healthy ranges.' })
  return signals
}

export default function DashboardClient({ profileName, profileRole, allItems, reconciledReqIds, approvedCount }: Props) {
  const [preset, setPreset] = useState<Preset>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  function selectPreset(p: Preset) { setPreset(p); const r = getPresetRange(p); setFromDate(r.from); setToDate(r.to) }
  function handleFromChange(v: string) { setFromDate(v); setPreset('all') }
  function handleToChange(v: string) { setToDate(v); setPreset('all') }

  const data = useMemo(() => {
    const now = new Date()
    const isFiltered = fromDate || toDate
    const items = isFiltered ? allItems.filter(i => inRange(i.created_at, fromDate, toDate)) : allItems
    const outstanding = allItems.filter(i => i.status === 'paid')
    const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.amount), 0)
    const nowISO = now.toISOString()
    const overdueItems = outstanding.filter(i => i.retirement_due_at && i.retirement_due_at < nowISO)
    const retiredItems = items.filter(i => i.status === 'retired')
    const totalRetired = retiredItems.reduce((s, i) => s + Number(i.amount), 0)
    const reconciledSet = new Set(reconciledReqIds)
    const pipelineItems = items.filter(i => ['pending', 'approved'].includes(i.status))
    const pipelineTotal = pipelineItems.reduce((s, i) => s + Number(i.amount), 0)
    const ytdItems = items.filter(i => ['paid', 'retired'].includes(i.status) && i.paid_at)
    const ytdTotal = ytdItems.reduce((s, i) => s + Number(i.amount), 0)
    const decidedItems = items.filter(i => ['approved', 'rejected', 'paid', 'retired'].includes(i.status))
    const rejectedItems = items.filter(i => i.status === 'rejected')
    const rejectionRate = decidedItems.length > 0 ? Math.round((rejectedItems.length / decidedItems.length) * 100) : 0
    const paidItems = items.filter(i => ['paid', 'retired'].includes(i.status) && i.paid_at && i.created_at)
    const avgDaysToPay = paidItems.length > 0 ? Math.round(paidItems.reduce((s, i) => s + (new Date(i.paid_at!).getTime() - new Date(i.created_at).getTime()) / 86400000, 0) / paidItems.length) : null
    const slaItems = items.filter(i => ['paid', 'retired'].includes(i.status) && i.decided_at && i.paid_at)
    const slaDurations = slaItems.map(i => (new Date(i.paid_at!).getTime() - new Date(i.decided_at!).getTime()) / 3600000)
    const avgSlaHours = slaDurations.length > 0 ? slaDurations.reduce((s, h) => s + h, 0) / slaDurations.length : null
    const withinSla = slaDurations.filter(h => h <= 2).length
    const slaPct = slaDurations.length > 0 ? Math.round((withinSla / slaDurations.length) * 100) : null

    const deptMap: Record<string, { paid: number; retired: number; pending: number; approved: number }> = {}
    for (const item of items) { const dept = item.requisitions.dept ?? 'Unknown'; if (!deptMap[dept]) deptMap[dept] = { paid: 0, retired: 0, pending: 0, approved: 0 }; if (item.status === 'paid') deptMap[dept].paid += Number(item.amount); else if (item.status === 'retired') deptMap[dept].retired += Number(item.amount); else if (item.status === 'pending') deptMap[dept].pending += Number(item.amount); else if (item.status === 'approved') deptMap[dept].approved += Number(item.amount) }
    const deptRows = Object.entries(deptMap).map(([dept, v]) => ({ dept, disbursed: v.paid + v.retired, pipeline: v.pending + v.approved })).filter(d => d.disbursed > 0 || d.pipeline > 0).sort((a, b) => b.disbursed - a.disbursed)
    const maxDisbursed = Math.max(...deptRows.map(d => d.disbursed), 1)

    const months: { label: string; key: string; amount: number }[] = []
    if (isFiltered && fromDate) { const start = new Date(fromDate); const end = toDate ? new Date(toDate) : now; const d = new Date(start.getFullYear(), start.getMonth(), 1); while (d <= end) { months.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, amount: 0 }); d.setMonth(d.getMonth() + 1) } }
    else { for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, amount: 0 }) } }
    for (const item of items) { if (!['paid', 'retired'].includes(item.status) || !item.paid_at) continue; const m = months.find(m => m.key === item.paid_at.slice(0, 7)); if (m) m.amount += Number(item.amount) }
    const maxMonthAmount = Math.max(...months.map(m => m.amount), 1)

    const statusCounts: Record<string, { count: number; amount: number }> = {}
    for (const item of items) { if (!statusCounts[item.status]) statusCounts[item.status] = { count: 0, amount: 0 }; statusCounts[item.status].count++; statusCounts[item.status].amount += Number(item.amount) }

    const reqMap: Record<string, { req_number: string; dept: string; requester: string; total: number; count: number; paid_at: string }> = {}
    for (const item of outstanding) { const req = item.requisitions; const key = req.req_number; if (!reqMap[key]) reqMap[key] = { req_number: req.req_number, dept: req.dept, requester: req.profiles?.name ?? '—', total: 0, count: 0, paid_at: item.paid_at! }; reqMap[key].total += Number(item.amount); reqMap[key].count += 1 }
    const outstandingReqs = Object.values(reqMap).slice(0, 8)

    const insights = computeInsights(items, rejectionRate, avgSlaHours, overdueItems.length, months, deptRows, pipelineTotal, totalRetired, approvedCount)
    return { items, outstanding, totalOutstanding, totalRetired, reconciledSet, pipelineTotal, ytdTotal, rejectionRate, rejectedItems, decidedItems, avgDaysToPay, paidItems, avgSlaHours, slaPct, withinSla, slaItems, slaDurations, deptRows, maxDisbursed, months, maxMonthAmount, statusCounts, outstandingReqs, insights, overdueItems }
  }, [allItems, reconciledReqIds, approvedCount, fromDate, toDate])

  const now = new Date()
  const presets: { key: Preset; label: string }[] = [
    { key: 'week', label: 'This week' }, { key: 'month', label: 'This month' },
    { key: 'quarter', label: 'This quarter' }, { key: 'ytd', label: 'YTD' }, { key: 'all', label: 'All time' },
  ]

  const insightColor: Record<string, string> = { pos: 'var(--approved-fg)', neg: 'var(--rejected-fg)', warn: 'var(--pending-fg)', info: 'var(--paid-fg)' }

  return (
    <div>
      {/* Page header */}
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Dashboard</h1>
          <p className="fd-pagehead__sub">Welcome back, {profileName}.</p>
        </div>
      </div>

      {/* Date filters */}
      <div className="fd-card" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Period</span>
        <div className="fd-seg">
          {presets.map(p => (
            <button key={p.key} className="fd-seg__btn" aria-pressed={preset === p.key} onClick={() => selectPreset(p.key)}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="date" className="fd-input" value={fromDate} onChange={e => handleFromChange(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, maxWidth: 150, height: 30 }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>to</span>
          <input type="date" className="fd-input" value={toDate} onChange={e => handleToChange(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, maxWidth: 150, height: 30 }} />
        </div>
        {(fromDate || toDate) && preset === 'all' && (
          <button className="fd-btn fd-btn--ghost fd-btn--sm" onClick={() => selectPreset('all')}>Clear</button>
        )}
      </div>

      {/* Core metrics */}
      <div className="kit-stats" style={{ marginBottom: 12 }}>
        <MetricCard label="Outstanding" value={formatNaira(data.totalOutstanding)} sub={`${data.outstanding.length} paid, not retired`} warn={data.totalOutstanding > 0} />
        <MetricCard label="Total retired" value={formatNaira(data.totalRetired)} sub="Funds fully accounted for" />
        <MetricCard label="Reconciled" value={String(data.reconciledSet.size)} sub="Signed off by finance" />
        {(profileRole === 'chima' || profileRole === 'admin') && (
          <MetricCard label="Payment queue" value={String(approvedCount)} sub="Approved, awaiting payment" warn={approvedCount > 0} />
        )}
      </div>

      <div className="kit-stats" style={{ marginBottom: 24 }}>
        <MetricCard label="Disbursed" value={formatNaira(data.ytdTotal)} sub={preset === 'all' ? `${now.getFullYear()} paid and retired` : 'In selected period'} />
        <MetricCard label="Pipeline value" value={formatNaira(data.pipelineTotal)} sub="Pending + approved items" />
        <MetricCard label="Rejection rate" value={`${data.rejectionRate}%`} sub={`${data.rejectedItems.length} of ${data.decidedItems.length} decided`} warn={data.rejectionRate > 20} />
        <MetricCard label="Avg days to pay" value={data.avgDaysToPay !== null ? `${data.avgDaysToPay}d` : '—'} sub="Submission to bank payment" />
      </div>

      {/* Payment SLA */}
      <div className="fd-card" style={{ marginBottom: 24 }}>
        <div className="fd-card__head">
          <h2 className="fd-card__title">Payment SLA</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Benchmark: 2 hours</span>
        </div>
        <div className="kit-stats">
          <div className="fd-metric">
            <span className="fd-metric__label">Avg approval to payment</span>
            <span className={`fd-metric__value${data.avgSlaHours !== null && data.avgSlaHours > 2 ? ' fd-metric__value--warn' : ''}`}>{data.avgSlaHours !== null ? formatHours(data.avgSlaHours) : '—'}</span>
            <span className="fd-metric__sub">{data.slaItems.length} payment{data.slaItems.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="fd-metric">
            <span className="fd-metric__label">Within 2h SLA</span>
            <span className="fd-metric__value">{data.slaPct !== null ? `${data.slaPct}%` : '—'}</span>
            <span className="fd-metric__sub">{data.withinSla} of {data.slaDurations.length} within benchmark</span>
          </div>
          <div className="fd-metric">
            <span className="fd-metric__label">SLA breaches</span>
            <span className={`fd-metric__value${data.slaDurations.length - data.withinSla > 0 ? ' fd-metric__value--warn' : ''}`}>{data.slaDurations.length - data.withinSla}</span>
            <span className="fd-metric__sub">Payments initiated after 2 hours</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="fd-card" style={{ marginBottom: 24 }}>
        <div className="fd-card__head">
          <h2 className="fd-card__title">Insights</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.insights.map((ins, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderTop: i > 0 ? '1px solid var(--border-divider)' : 'none' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: insightColor[ins.severity], marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-body)' }}>{ins.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{ins.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="kit-grid-halves" style={{ marginBottom: 24 }}>
        {/* Department spend */}
        <div className="fd-card">
          <div className="fd-card__head">
            <h2 className="fd-card__title">By department</h2>
          </div>
          {data.deptRows.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No disbursement data yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.deptRows.map(d => (
                <div key={d.dept} style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,1fr) auto', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span>{d.dept}</span>
                  <div style={{ height: 10, background: 'var(--cream-200)', borderRadius: 999 }}>
                    <div style={{ width: `${Math.round((d.disbursed / data.maxDisbursed) * 100)}%`, height: '100%', background: 'var(--green-700)', borderRadius: 999 }} />
                  </div>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatNaira(d.disbursed)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly bars */}
        <div className="fd-card">
          <div className="fd-card__head">
            <h2 className="fd-card__title">Monthly disbursements</h2>
          </div>
          {data.months.every(m => m.amount === 0) ? (
            <div style={{ color: 'var(--text-muted)' }}>No payment data in this period.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {data.months.map(m => {
                const pct = Math.round((m.amount / data.maxMonthAmount) * 100)
                const isCurrent = m.key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                return (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    {m.amount > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{formatNaira(m.amount).replace('₦', '')}</div>}
                    <div style={{ width: '100%', background: isCurrent ? 'var(--green-700)' : 'var(--green-100)', borderRadius: '4px 4px 0 0', height: `${Math.max(pct, m.amount > 0 ? 4 : 0)}%`, minHeight: m.amount > 0 ? 4 : 0 }} />
                    <div style={{ fontSize: 10, color: isCurrent ? 'var(--green-700)' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>{m.label}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status funnel */}
      <div className="fd-card" style={{ marginBottom: 24 }}>
        <div className="fd-card__head"><h2 className="fd-card__title">Pipeline breakdown</h2></div>
        <div className="kit-stats">
          {[
            { key: 'pending', label: 'Pending', bg: 'var(--pending-bg)', fg: 'var(--pending-fg)' },
            { key: 'approved', label: 'Approved', bg: 'var(--approved-bg)', fg: 'var(--approved-fg)' },
            { key: 'paid', label: 'Paid', bg: 'var(--paid-bg)', fg: 'var(--paid-fg)' },
            { key: 'retired', label: 'Retired', bg: 'var(--retired-bg)', fg: 'var(--retired-fg)' },
            { key: 'rejected', label: 'Rejected', bg: 'var(--rejected-bg)', fg: 'var(--rejected-fg)' },
          ].map(({ key, label, bg, fg }) => {
            const s = data.statusCounts[key] ?? { count: 0, amount: 0 }
            return (
              <div key={key} style={{ padding: '14px 16px', background: bg, borderRadius: 'var(--radius-lg)' }}>
                <div className="fd-metric__label" style={{ color: fg }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: fg, fontVariantNumeric: 'tabular-nums', margin: '4px 0 2px' }}>{s.count}</div>
                <div style={{ fontSize: 12, color: fg, opacity: 0.8 }}>{s.amount > 0 ? formatNaira(s.amount) : '—'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Outstanding retirements */}
      <div className="fd-card fd-card--flush" style={{ marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-divider)' }}>
          <h2 className="fd-card__title" style={{ margin: 0 }}>Outstanding retirements</h2>
          <Link href="/dashboard/reconciliation" style={{ fontSize: 13, fontWeight: 600 }}>View all</Link>
        </div>
        {data.outstandingReqs.length === 0 ? (
          <div className="fd-empty" style={{ border: 0 }}>
            <div className="fd-empty__title">All clear</div>
            No paid items waiting for retirement.
          </div>
        ) : (
          <div className="fd-table-wrap">
            <table className="fd-table">
              <thead><tr><th>Req #</th><th>Department</th><th className="fd-hide-mobile">Requester</th><th className="fd-hide-mobile">Items</th><th>Paid</th><th className="fd-num">Outstanding</th></tr></thead>
              <tbody>
                {data.outstandingReqs.map(req => (
                  <tr key={req.req_number}>
                    <td style={{ fontWeight: 600 }}>{req.req_number}</td>
                    <td>{req.dept}</td>
                    <td className="fd-hide-mobile">{req.requester}</td>
                    <td className="fd-hide-mobile fd-muted">{req.count} item{req.count !== 1 ? 's' : ''}</td>
                    <td className="fd-muted">{fmtDate(req.paid_at)}</td>
                    <td className="fd-num" style={{ fontWeight: 600, color: 'var(--pending-fg)' }}>{formatNaira(req.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="fd-card">
        <div className="fd-card__head"><h2 className="fd-card__title">Quick actions</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <ActionLink href="/dashboard/reconciliation" label="Reconciliation" sub="Verify retired funds" />
          {(profileRole === 'chima' || profileRole === 'admin') && <ActionLink href="/dashboard/payments" label="Payment queue" sub="Mark approved items paid" />}
          {(profileRole === 'finance' || profileRole === 'admin') && <ActionLink href="/dashboard/approve" label="Approval queue" sub="Review pending items" />}
          <ActionLink href="/dashboard/viewer" label="Group viewer" sub="Organisation-wide overview" />
          {profileRole === 'admin' && <>
            <ActionLink href="/dashboard/admin" label="Users and roles" sub="Manage team access" />
            <ActionLink href="/dashboard/audit" label="Audit log" sub="Immutable change log" />
          </>}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="fd-card" style={{ padding: '16px 18px' }}>
      <div className="fd-metric">
        <span className="fd-metric__label">{label}</span>
        <span className={`fd-metric__value${warn ? ' fd-metric__value--warn' : ''}`}>{value}</span>
        <span className="fd-metric__sub">{sub}</span>
      </div>
    </div>
  )
}

function ActionLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', display: 'block' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-body)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
    </Link>
  )
}
