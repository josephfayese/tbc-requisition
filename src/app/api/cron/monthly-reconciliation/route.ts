import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira } from '@/lib/utils'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'TBC Finance <noreply@tbcooz-finance.com>'

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get the previous month label (this runs on the 1st of the new month)
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthLabel = prevMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Get all requisitions
  const { data: requisitions } = await admin
    .from('requisitions')
    .select('id, req_number, dept')

  if (!requisitions || requisitions.length === 0) {
    return NextResponse.json({ reconciled: 0, unretired: 0, message: 'No requisitions found' })
  }

  let reconciledCount = 0
  let unretiredCount = 0
  const unretiredReqs: { req_number: string; dept: string; outstanding: number }[] = []

  for (const req of requisitions) {
    // Get all non-rejected line items for this requisition
    const { data: items } = await admin
      .from('line_items')
      .select('id, status, amount, description')
      .eq('req_id', req.id)
      .not('status', 'eq', 'rejected')
      .not('status', 'eq', 'pending')

    if (!items || items.length === 0) continue

    const allRetired = items.every((i) => i.status === 'retired')
    const hasPaidItems = items.some((i) => i.status === 'paid')

    if (hasPaidItems) {
      // There are paid but unretired items — flag for report
      unretiredCount++
      const outstanding = items.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
      unretiredReqs.push({ req_number: req.req_number, dept: req.dept, outstanding })
      continue
    }

    if (!allRetired) continue

    // Check if already reconciled (audit entry with "Reconciled" or "Auto-reconciled")
    const { data: existingRecon } = await admin
      .from('audit_log')
      .select('id')
      .eq('req_id', req.id)
      .or('action.eq.Reconciled,action.eq.Auto-reconciled')
      .limit(1)

    if (existingRecon && existingRecon.length > 0) continue

    // Auto-reconcile
    const total = items.reduce((s, i) => s + Number(i.amount), 0)
    await admin.from('audit_log').insert({
      req_id: req.id,
      actor_name: 'System',
      action: 'Auto-reconciled',
      detail: `Monthly reconciliation for ${monthLabel} · All ${items.length} retired item${items.length !== 1 ? 's' : ''} verified · ${formatNaira(total)}`,
    })
    reconciledCount++
  }

  // Notify finance + admin users about the reconciliation report
  const { data: financeAdmins } = await admin
    .from('profiles')
    .select('id, name, email')
    .in('role', ['finance', 'admin'])

  if (financeAdmins && financeAdmins.length > 0) {
    const unretiredRows = unretiredReqs.map((r) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${r.req_number}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${r.dept}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600;color:#dc2626">${formatNaira(r.outstanding)}</td>
      </tr>`
    ).join('')

    const emailHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#064E2F;color:#fff;border-radius:8px 8px 0 0;padding:20px 24px">
        <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:4px">TBC OutOfZion Finance</div>
        <div style="font-size:20px;font-weight:800">Monthly Reconciliation Report — ${monthLabel}</div>
      </div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
        <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
          <div style="flex:1;min-width:120px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#16a34a">${reconciledCount}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Auto-reconciled</div>
          </div>
          <div style="flex:1;min-width:120px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#dc2626">${unretiredCount}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Outstanding (unretired)</div>
          </div>
        </div>
        ${unretiredReqs.length > 0 ? `
        <div style="margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px">Requisitions with outstanding retirements:</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#fef2f2">
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#dc2626">Req #</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#dc2626">Dept</th>
                <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#dc2626">Outstanding</th>
              </tr>
            </thead>
            <tbody>${unretiredRows}</tbody>
          </table>
        </div>` : '<p style="color:#16a34a;font-weight:600;margin-bottom:16px">✓ All paid items have been retired. No outstanding retirements.</p>'}
        <a href="https://tbcooz-finance.com/dashboard/reconciliation" style="display:inline-block;background:#064E2F;color:#fff;text-decoration:none;padding:11px 20px;border-radius:7px;font-size:13px;font-weight:600">Open Reconciliation →</a>
      </div>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System · Automated monthly report</p>
    </div>`

    for (const fa of financeAdmins) {
      await admin.from('notifications').insert({
        user_id: fa.id,
        message: `Monthly reconciliation for ${monthLabel} complete. ${reconciledCount} auto-reconciled, ${unretiredCount} outstanding.`,
        type: 'reconciliation_report',
      })
      if (fa.email) {
        try {
          await resend.emails.send({
            from: FROM,
            to: fa.email,
            subject: `Monthly Reconciliation Report — ${monthLabel}`,
            html: emailHtml,
          })
        } catch { /* non-critical */ }
      }
    }
  }

  return NextResponse.json({ reconciled: reconciledCount, unretired: unretiredCount, month: monthLabel })
}
