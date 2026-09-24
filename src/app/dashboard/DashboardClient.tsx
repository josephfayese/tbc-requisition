'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatNaira, fmtDate, formatHours } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  id: number
  description: string
  amount: number | string
  status: string
  paid_at: string | null
  decided_at: string | null
  created_at: string
  retirement_due_at: string | null
  req_id: number
  requisitions: {
    req_number: string
    dept: string
    user_id: string
    profiles: { name: string } | null
  }
}

interface Props {
  profileName: string
  profileRole: string
  allItems: LineItem[]
  reconciledReqIds: number[]
  approvedCount: number
}

type Preset = 'week' | 'month' | 'quarter' | 'ytd' | 'all'

// ─── Date helpers ───────────────────────────────────────────────────────────

function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)

  switch (preset) {
    case 'week': {
      const d = new Date(now)
      const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // Monday
      return { from: d.toISOString().slice(0, 10), to }
    }
    case 'month': {
      return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to }
    }
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3
      return { from: `${now.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}-01`, to }
    }
    case 'ytd': {
      return { from: `${now.getFullYear()}-01-01`, to }
    }
    case 'all':
    default:
      return { from: '', to: '' }
  }
}

function inRange(dateStr: string | null, from: string, to: string): boolean {
  if (!dateStr) return false
  if (!from && !to) return true
  const d = dateStr.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

// ─── Insight engine ─────────────────────────────────────────────────────────

interface Insight {
  severity: 'pos' | 'neg' | 'warn' | 'info'
  title: string
  detail: string
}

function computeInsights(
  items: LineItem[],
  rejectionRate: number,
  avgSlaHours: number | null,
  overdueCount: number,
  months: { amount: number }[],
  deptRows: { dept: string; disbursed: number }[],
  pipelineTotal: number,
  totalRetired: number,
  approvedCount: number,
): Insight[] {
  const signals: Insight[] = []

  if (rejectionRate > 25) {
    signals.push({
      severity: 'warn',
      title: `High rejection rate: ${rejectionRate}%`,
      detail: 'Review submission guidelines with Heads of Department to reduce rework and speed up approvals.',
    })
  }

  if (avgSlaHours !== null && avgSlaHours > 2) {
    signals.push({
      severity: 'neg',
      title: `Payment SLA breached: avg ${formatHours(avgSlaHours)}`,
      detail: 'Average approval-to-payment time exceeds the 2-hour benchmark. Prioritize clearing the payment queue.',
    })
  }

  if (overdueCount > 3) {
    signals.push({
      severity: 'warn',
      title: `${overdueCount} overdue retirements`,
      detail: 'Items are past their 15-day retirement window. Follow up with requesters to submit retirement notes.',
    })
  }

  // Spending spike: current month vs. average of prior 3
  if (months.length >= 4) {
    const currentMonth = months[months.length - 1].amount
    const priorAvg = months.slice(months.length - 4, months.length - 1).reduce((s, m) => s + m.amount, 0) / 3
    if (priorAvg > 0 && currentMonth > priorAvg * 1.5) {
      const pct = Math.round((currentMonth / priorAvg) * 100)
      signals.push({
        severity: 'info',
        title: `Spending spike: ${pct}% of 3-month average`,
        detail: 'This month\'s disbursements are significantly above recent averages. Review for unusual or one-off expenditures.',
      })
    }
  }

  // Department concentration
  const totalDisbursed = deptRows.reduce((s, d) => s + d.disbursed, 0)
  if (totalDisbursed > 0) {
    for (const dept of deptRows) {
      const pct = Math.round((dept.disbursed / totalDisbursed) * 100)
      if (pct > 50) {
        signals.push({
          severity: 'info',
          title: `${dept.dept} accounts for ${pct}% of spend`,
          detail: 'One department dominates total disbursements. Verify this aligns with your budget allocation.',
        })
        break
      }
    }
  }

  if (pipelineTotal > totalRetired && totalRetired > 0) {
    signals.push({
      severity: 'warn',
      title: 'Pipeline exceeds retired funds',
      detail: `Pipeline value (${formatNaira(pipelineTotal)}) is higher than total retired (${formatNaira(totalRetired)}). Monitor cash flow capacity.`,
    })
  }

  if (approvedCount > 5) {
    signals.push({
      severity: 'warn',
      title: `${approvedCount} items in payment queue`,
      detail: 'A backlog is forming. Clear approved items promptly to maintain the 2-hour payment SLA.',
    })
  }

  if (signals.length === 0) {
    signals.push({
      severity: 'pos',
      title: 'All clear',
      detail: 'Rejection rate, payment SLA, and retirements are within healthy ranges. No action required.',
    })
  }

  return signals
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardClient({ profileName, profileRole, allItems, reconciledReqIds, approvedCount }: Props) {
  const [preset, setPreset] = useState<Preset>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  function selectPreset(p: Preset) {
    setPreset(p)
    const range = getPresetRange(p)
    setFromDate(range.from)
    setToDate(range.to)
  }

  function handleFromChange(v: string) {
    setFromDate(v)
    setPreset('all') // custom range disengages preset unless it happens to match
  }

  function handleToChange(v: string) {
    setToDate(v)
    setPreset('all')
  }

  // Memoize all computations
  const data = useMemo(() => {
    const now = new Date()
    const isFiltered = fromDate || toDate

    // Filter items by date range (based on created_at)
    const items = isFiltered
      ? allItems.filter((i) => inRange(i.created_at, fromDate, toDate))
      : allItems

    // ── Outstanding retirements (always real-time — paid items not retired) ──
    const outstanding = allItems.filter((i) => i.status === 'paid')
    const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.amount), 0)

    // Overdue retirements
    const nowISO = now.toISOString()
    const overdueItems = outstanding.filter(
      (i) => i.retirement_due_at && i.retirement_due_at < nowISO
    )

    // ── Retired total (within date range) ──
    const retiredItems = items.filter((i) => i.status === 'retired')
    const totalRetired = retiredItems.reduce((s, i) => s + Number(i.amount), 0)

    // ── Reconciled count ──
    const reconciledSet = new Set(reconciledReqIds)

    // ── Pipeline ──
    const pipelineItems = items.filter((i) => ['pending', 'approved'].includes(i.status))
    const pipelineTotal = pipelineItems.reduce((s, i) => s + Number(i.amount), 0)

    // ── YTD (within range if filtered, else calendar year) ──
    const ytdItems = items.filter(
      (i) => ['paid', 'retired'].includes(i.status) && i.paid_at
    )
    const ytdTotal = ytdItems.reduce((s, i) => s + Number(i.amount), 0)

    // ── Rejection rate ──
    const decidedItems = items.filter((i) => ['approved', 'rejected', 'paid', 'retired'].includes(i.status))
    const rejectedItems = items.filter((i) => i.status === 'rejected')
    const rejectionRate = decidedItems.length > 0
      ? Math.round((rejectedItems.length / decidedItems.length) * 100)
      : 0

    // ── Avg days to pay ──
    const paidItems = items.filter((i) => ['paid', 'retired'].includes(i.status) && i.paid_at && i.created_at)
    const avgDaysToPay = paidItems.length > 0
      ? Math.round(
          paidItems.reduce((s, i) => {
            const diff = (new Date(i.paid_at!).getTime() - new Date(i.created_at).getTime()) / 86400000
            return s + diff
          }, 0) / paidItems.length
        )
      : null

    // ── Payment SLA ──
    const SLA_HOURS = 2
    const slaItems = items.filter(
      (i) => ['paid', 'retired'].includes(i.status) && i.decided_at && i.paid_at
    )
    const slaDurations = slaItems.map(
      (i) => (new Date(i.paid_at!).getTime() - new Date(i.decided_at!).getTime()) / 3600000
    )
    const avgSlaHours = slaDurations.length > 0
      ? slaDurations.reduce((s, h) => s + h, 0) / slaDurations.length
      : null
    const withinSla = slaDurations.filter((h) => h <= SLA_HOURS).length
    const slaPct = slaDurations.length > 0 ? Math.round((withinSla / slaDurations.length) * 100) : null

    // ── Dept breakdown ──
    const deptMap: Record<string, { paid: number; retired: number; pending: number; approved: number }> = {}
    for (const item of items) {
      const dept = item.requisitions.dept ?? 'Unknown'
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

    // ── Monthly disbursements ──
    // Determine month range from filter or default last 6
    const months: { label: string; key: string; amount: number }[] = []
    if (isFiltered && fromDate) {
      const start = new Date(fromDate)
      const end = toDate ? new Date(toDate) : now
      const d = new Date(start.getFullYear(), start.getMonth(), 1)
      while (d <= end) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        months.push({ label, key, amount: 0 })
        d.setMonth(d.getMonth() + 1)
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
        months.push({ label, key, amount: 0 })
      }
    }
    for (const item of items) {
      if (!['paid', 'retired'].includes(item.status) || !item.paid_at) continue
      const key = item.paid_at.slice(0, 7)
      const month = months.find((m) => m.key === key)
      if (month) month.amount += Number(item.amount)
    }
    const maxMonthAmount = Math.max(...months.map((m) => m.amount), 1)

    // ── Status funnel ──
    const statusCounts: Record<string, { count: number; amount: number }> = {}
    for (const item of items) {
      if (!statusCounts[item.status]) statusCounts[item.status] = { count: 0, amount: 0 }
      statusCounts[item.status].count++
      statusCounts[item.status].amount += Number(item.amount)
    }

    // ── Outstanding by req ──
    const reqMap: Record<string, { req_number: string; dept: string; requester: string; total: number; count: number; paid_at: string }> = {}
    for (const item of outstanding) {
      const req = item.requisitions
      const key = req.req_number
      if (!reqMap[key]) reqMap[key] = { req_number: req.req_number, dept: req.dept, requester: req.profiles?.name ?? '—', total: 0, count: 0, paid_at: item.paid_at! }
      reqMap[key].total += Number(item.amount)
      reqMap[key].count += 1
    }
    const outstandingReqs = Object.values(reqMap).slice(0, 8)

    // ── Insights ──
    const insights = computeInsights(
      items, rejectionRate, avgSlaHours, overdueItems.length,
      months, deptRows, pipelineTotal, totalRetired, approvedCount,
    )

    return {
      items, outstanding, totalOutstanding, totalRetired,
      reconciledSet, pipelineTotal, ytdTotal,
      rejectionRate, rejectedItems, decidedItems,
      avgDaysToPay, paidItems,
      avgSlaHours, slaPct, withinSla, slaItems, slaDurations,
      deptRows, maxDisbursed,
      months, maxMonthAmount,
      statusCounts, outstandingReqs,
      insights, overdueItems,
    }
  }, [allItems, reconciledReqIds, approvedCount, fromDate, toDate])

  const now = new Date()
  const SLA_HOURS = 2

  const presets: { key: Preset; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'ytd', label: 'YTD' },
    { key: 'all', label: 'All Time' },
  ]

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      {/* Masthead */}
      <div className="masthead" style={{ marginBottom: 20 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Overview</div>
          <h1>Dashboard</h1>
          <p className="masthead-sub">Welcome back, {profileName}.</p>
        </div>
      </div>

      {/* ── Date Filters ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
          Period
        </div>
        <div className="seg">
          {presets.map((p) => (
            <button key={p.key} data-on={preset === p.key ? 'true' : 'false'} onClick={() => selectPreset(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input
            type="date"
            className="li-input"
            value={fromDate}
            onChange={(e) => handleFromChange(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, maxWidth: 150 }}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>to</span>
          <input
            type="date"
            className="li-input"
            value={toDate}
            onChange={(e) => handleToChange(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12, maxWidth: 150 }}
          />
        </div>
        {(fromDate || toDate) && preset === 'all' && (
          <button
            className="ghost-btn"
            style={{ padding: '5px 10px', fontSize: 11 }}
            onClick={() => selectPreset('all')}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Row 1: Core flow stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <StatCard label="Outstanding" value={formatNaira(data.totalOutstanding)} sub={`${data.outstanding.length} paid, not retired`} color={data.totalOutstanding > 0 ? 'var(--warn)' : 'var(--ink-4)'} href="/dashboard/reconciliation" />
        <StatCard label="Total Retired" value={formatNaira(data.totalRetired)} sub="funds fully accounted for" color="var(--pos)" href="/dashboard/reconciliation" />
        <StatCard label="Reconciled Reqs" value={String(data.reconciledSet.size)} sub="signed off by finance" color="var(--brand)" href="/dashboard/reconciliation" />
        {(profileRole === 'chima' || profileRole === 'admin') && (
          <StatCard label="Payment Queue" value={String(approvedCount)} sub="approved, awaiting payment" color={approvedCount > 0 ? 'var(--brand)' : 'var(--ink-4)'} href="/dashboard/payments" />
        )}
        {profileRole === 'finance' && (
          <StatCard label="Approval Queue" value={String(approvedCount)} sub="items pending deliberation" color={approvedCount > 0 ? 'var(--warn)' : 'var(--ink-4)'} href="/dashboard/approve" />
        )}
      </div>

      {/* ── Row 2: Accounting KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatCard label="Disbursed" value={formatNaira(data.ytdTotal)} sub={preset === 'all' ? `${now.getFullYear()} paid & retired` : 'in selected period'} color="var(--ink)" href="/dashboard/reconciliation" />
        <StatCard label="Pipeline Value" value={formatNaira(data.pipelineTotal)} sub="pending + approved items" color="var(--purple)" href="/dashboard/approve" />
        <StatCard label="Rejection Rate" value={`${data.rejectionRate}%`} sub={`${data.rejectedItems.length} of ${data.decidedItems.length} decided`} color={data.rejectionRate > 20 ? 'var(--neg)' : 'var(--ink-4)'} href="/dashboard/approve" />
        <StatCard label="Avg Days to Pay" value={data.avgDaysToPay !== null ? `${data.avgDaysToPay}d` : '—'} sub="submission → bank payment" color="var(--ink-3)" href="/dashboard/payments" />
      </div>

      {/* ── Payment SLA ── */}
      <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Payment SLA — Approval to Payment (Benchmark: 2 hours)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        <StatCard
          label="Avg Approval → Payment"
          value={data.avgSlaHours !== null ? formatHours(data.avgSlaHours) : '—'}
          sub={`across ${data.slaItems.length} payment${data.slaItems.length !== 1 ? 's' : ''}`}
          color={data.avgSlaHours !== null && data.avgSlaHours > SLA_HOURS ? 'var(--neg)' : 'var(--pos)'}
          href="/dashboard/payments"
        />
        <StatCard
          label="Within 2h SLA"
          value={data.slaPct !== null ? `${data.slaPct}%` : '—'}
          sub={`${data.withinSla} of ${data.slaDurations.length} paid within benchmark`}
          color={data.slaPct !== null && data.slaPct < 80 ? 'var(--warn)' : 'var(--pos)'}
          href="/dashboard/payments"
        />
        <StatCard
          label="SLA Breaches"
          value={String(data.slaDurations.length - data.withinSla)}
          sub="payments initiated after 2 hours"
          color={data.slaDurations.length - data.withinSla > 0 ? 'var(--neg)' : 'var(--ink-4)'}
          href="/dashboard/payments"
        />
      </div>

      {/* ── Insights Panel ── */}
      <div className="section-title" style={{ marginBottom: 12 }}>
        <span className="bar" />Insights & Recommendations
        <span className="count">{data.insights.length}</span>
      </div>
      <div className="signal-feed" style={{ marginBottom: 28 }}>
        {data.insights.map((insight, idx) => (
          <div key={idx} className="signal">
            <div className={`signal-sev ${insight.severity}`} />
            <div className="signal-body">
              <div className="signal-line">
                <span className="signal-title">{insight.title}</span>
              </div>
              <div className="signal-meta">{insight.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Spend by Department ── */}
      <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Spend by Department</div>
      <div className="card" style={{ marginBottom: 28, overflow: 'hidden' }}>
        {data.deptRows.length === 0 ? (
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
              {data.deptRows.map((d) => (
                <tr key={d.dept}>
                  <td className="strong">{d.dept}</td>
                  <td className="num" style={{ color: 'var(--pos)', fontWeight: 600 }}>{formatNaira(d.disbursed)}</td>
                  <td className="num" style={{ color: 'var(--purple)', fontSize: 12 }}>{d.pipeline > 0 ? formatNaira(d.pipeline) : '—'}</td>
                  <td style={{ paddingRight: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((d.disbursed / data.maxDisbursed) * 100)}%`, height: '100%', background: 'var(--brand)', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', minWidth: 32, textAlign: 'right' }}>
                        {Math.round((d.disbursed / data.maxDisbursed) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-tint)' }}>
                <td style={{ fontWeight: 700, fontSize: 13, padding: '12px 16px' }}>Total</td>
                <td className="num strong" style={{ color: 'var(--pos)' }}>{formatNaira(data.deptRows.reduce((s, d) => s + d.disbursed, 0))}</td>
                <td className="num" style={{ color: 'var(--purple)', fontWeight: 600 }}>{formatNaira(data.deptRows.reduce((s, d) => s + d.pipeline, 0))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Monthly Disbursements ── */}
      <div className="section-title" style={{ marginBottom: 12 }}>
        <span className="bar" />Monthly Disbursements
        {preset !== 'all' && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>— filtered</span>}
      </div>
      <div className="card" style={{ padding: '20px 24px', marginBottom: 28 }}>
        {data.months.every((m) => m.amount === 0) ? (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', padding: '12px 0' }}>No payment data in this period.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {data.months.map((m) => {
              const pct = Math.round((m.amount / data.maxMonthAmount) * 100)
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
          const s = data.statusCounts[key] ?? { count: 0, amount: 0 }
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
          {data.outstanding.length > 0 && <span className="count">{data.outstanding.length}</span>}
        </div>
        <Link href="/dashboard/reconciliation" style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}>
          View full reconciliation →
        </Link>
      </div>
      <div className="table-wrap" style={{ marginBottom: 32 }}>
        {data.outstandingReqs.length === 0 ? (
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
              {data.outstandingReqs.map((req) => (
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
        {data.outstanding.length > 8 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line-2)', fontSize: 12, color: 'var(--ink-4)' }}>
            Showing 8 of {data.outstanding.length}.{' '}
            <Link href="/dashboard/reconciliation" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="section-title"><span className="bar" />Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <ActionCard href="/dashboard/reconciliation" label="Reconciliation" sub="Verify retired funds" />
        {(profileRole === 'chima' || profileRole === 'admin') && (
          <ActionCard href="/dashboard/payments" label="Payment Queue" sub="Mark approved items paid" />
        )}
        {(profileRole === 'finance' || profileRole === 'admin') && (
          <ActionCard href="/dashboard/approve" label="Approval Queue" sub="Review pending items" />
        )}
        <ActionCard href="/dashboard/viewer" label="Group Dashboard" sub="Org-wide overview" />
        {profileRole === 'admin' && (
          <>
            <ActionCard href="/dashboard/admin" label="Users &amp; Roles" sub="Manage team access" />
            <ActionCard href="/dashboard/audit" label="Audit History" sub="Immutable change log" />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
