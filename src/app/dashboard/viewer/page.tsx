import { createAdminClient } from '@/lib/supabase/admin'
import ViewerClient, { ViewerStats } from './ViewerClient'

export default async function ViewerPage() {
  // Group dashboard: data is fetched with the admin client so passcode-only
  // viewers (no login) still see live data. The passcode gate is enforced
  // client-side before anything is rendered.
  let pending: Array<{ id: number; description: string; amount: number; created_at: string; req_number: string; dept: string; requester: string }> = []
  let feed: Array<{ id: number; action: string; detail: string | null; actor_name: string; created_at: string; req_id: number | null; line_item_id: number | null }> = []
  let totalPending = 0
  let stats: ViewerStats | null = null

  try {
    const supabase = createAdminClient()

    const [
      { data: pendingItems },
      { data: recentLog },
      { data: outstandingItems },
      { data: retiredAgg },
      { count: approvedCount },
      { data: reconLog },
      { data: allItems },
    ] = await Promise.all([
      supabase
        .from('line_items')
        .select(`
          id, description, amount, status, created_at,
          requisitions (req_number, dept, profiles (name))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),

      supabase
        .from('audit_log')
        .select('id, action, detail, actor_name, created_at, req_id, line_item_id')
        .or('action.ilike.Approved%,action.ilike.Rejected%,action.ilike.Paid%,action.ilike.Requisition submitted%')
        .order('created_at', { ascending: false })
        .limit(30),

      supabase
        .from('line_items')
        .select('id, description, amount, paid_at, requisitions!inner(req_number, dept, profiles(name))')
        .eq('status', 'paid')
        .order('paid_at', { ascending: true }),

      supabase.from('line_items').select('amount').eq('status', 'retired'),

      supabase.from('line_items').select('*', { count: 'exact', head: true }).eq('status', 'approved'),

      supabase.from('audit_log').select('req_id').or('action.eq.Reconciled,action.eq.Auto-reconciled'),

      supabase
        .from('line_items')
        .select('id, amount, status, paid_at, decided_at, created_at, requisitions!inner(dept)')
        .order('created_at', { ascending: false }),
    ])

    pending = (pendingItems ?? []).map((item) => {
      const req = (item.requisitions as unknown) as { req_number: string; dept: string; profiles: { name: string } } | null
      return {
        id: item.id,
        description: item.description,
        amount: Number(item.amount),
        created_at: item.created_at,
        req_number: req?.req_number ?? '',
        dept: req?.dept ?? '',
        requester: req?.profiles?.name ?? '',
      }
    })

    feed = recentLog ?? []
    totalPending = pending.reduce((s, i) => s + i.amount, 0)

    // ── Mirror of the main dashboard analytics ────────────────────────────
    const outstanding = outstandingItems ?? []
    const items = allItems ?? []
    const now = new Date()
    const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString()

    const ytdTotal = items
      .filter((i) => ['paid', 'retired'].includes(i.status) && i.paid_at && i.paid_at >= ytdStart)
      .reduce((s, i) => s + Number(i.amount), 0)

    const pipelineTotal = items
      .filter((i) => ['pending', 'approved'].includes(i.status))
      .reduce((s, i) => s + Number(i.amount), 0)

    const decidedItems = items.filter((i) => ['approved', 'rejected', 'paid', 'retired'].includes(i.status))
    const rejectedCount = items.filter((i) => i.status === 'rejected').length
    const rejectionRate = decidedItems.length > 0 ? Math.round((rejectedCount / decidedItems.length) * 100) : 0

    // Payment SLA (approval → payment, benchmark 2h)
    const SLA_HOURS = 2
    const slaDurations = items
      .filter((i) => ['paid', 'retired'].includes(i.status) && i.decided_at && i.paid_at)
      .map((i) => (new Date(i.paid_at!).getTime() - new Date(i.decided_at!).getTime()) / 3600000)
    const withinSla = slaDurations.filter((h) => h <= SLA_HOURS).length
    const avgSlaHours = slaDurations.length > 0 ? slaDurations.reduce((s, h) => s + h, 0) / slaDurations.length : null
    const slaPct = slaDurations.length > 0 ? Math.round((withinSla / slaDurations.length) * 100) : null

    // Status funnel
    const statusCounts: Record<string, { count: number; amount: number }> = {}
    for (const item of items) {
      if (!statusCounts[item.status]) statusCounts[item.status] = { count: 0, amount: 0 }
      statusCounts[item.status].count++
      statusCounts[item.status].amount += Number(item.amount)
    }

    // Spend by department
    const deptMap: Record<string, { disbursed: number; pipeline: number }> = {}
    for (const item of items) {
      const dept = (item.requisitions as unknown as { dept: string }).dept ?? 'Unknown'
      if (!deptMap[dept]) deptMap[dept] = { disbursed: 0, pipeline: 0 }
      if (['paid', 'retired'].includes(item.status)) deptMap[dept].disbursed += Number(item.amount)
      else if (['pending', 'approved'].includes(item.status)) deptMap[dept].pipeline += Number(item.amount)
    }
    const deptRows = Object.entries(deptMap)
      .map(([dept, v]) => ({ dept, ...v }))
      .filter((d) => d.disbursed > 0 || d.pipeline > 0)
      .sort((a, b) => b.disbursed - a.disbursed)

    // Outstanding retirements grouped by req
    const reqMap: Record<string, { req_number: string; dept: string; requester: string; total: number; count: number; paid_at: string }> = {}
    for (const item of outstanding) {
      const req = item.requisitions as any
      const key = req.req_number
      if (!reqMap[key]) reqMap[key] = { req_number: req.req_number, dept: req.dept, requester: req.profiles?.name ?? '—', total: 0, count: 0, paid_at: item.paid_at }
      reqMap[key].total += Number(item.amount)
      reqMap[key].count += 1
    }

    stats = {
      totalOutstanding: outstanding.reduce((s, i) => s + Number(i.amount), 0),
      outstandingCount: outstanding.length,
      totalRetired: (retiredAgg ?? []).reduce((s, i) => s + Number(i.amount), 0),
      reconciledCount: new Set((reconLog ?? []).map((r) => r.req_id)).size,
      paymentQueueCount: approvedCount ?? 0,
      ytdTotal,
      pipelineTotal,
      rejectionRate,
      avgSlaHours,
      slaPct,
      withinSla,
      slaCount: slaDurations.length,
      statusCounts,
      deptRows,
      outstandingReqs: Object.values(reqMap).slice(0, 8),
    }
  } catch {
    // Data unavailable — viewer will show passcode gate / empty state
  }

  return (
    <ViewerClient
      pending={pending}
      feed={feed}
      totalPending={totalPending}
      stats={stats}
    />
  )
}
