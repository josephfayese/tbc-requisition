import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira } from '@/lib/utils'
import { Resend } from 'resend'

const getResend = () => new Resend(process.env.RESEND_API_KEY)
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
  const results: Record<string, unknown> = {}

  // ── 1. Payment reminders → chima ──────────────────────────────────────────
  const { data: approvedItems } = await admin
    .from('line_items')
    .select('id, description, amount, req_id, requisitions!inner(req_number, dept)')
    .eq('status', 'approved')

  if (approvedItems && approvedItems.length > 0) {
    const { data: chimaProfiles } = await admin
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'chima')

    const total = approvedItems.reduce((s, i) => s + Number(i.amount), 0)
    const itemRows = approvedItems.map((item) => {
      const req = item.requisitions as unknown as { req_number: string; dept: string }
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${req.req_number}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600">${formatNaira(Number(item.amount))}</td>
      </tr>`
    }).join('')

    let payEmailsSent = 0
    for (const chima of (chimaProfiles ?? [])) {
      await admin.from('notifications').insert({
        user_id: chima.id,
        message: `${approvedItems.length} approved item${approvedItems.length !== 1 ? 's' : ''} (${formatNaira(total)}) are awaiting bank payment. Please initiate payment.`,
        type: 'payment_reminder',
      })
      if (chima.email) {
        try {
          await getResend().emails.send({
            from: FROM,
            to: chima.email,
            subject: `⚠ Action Required: ${approvedItems.length} Payment${approvedItems.length !== 1 ? 's' : ''} Pending — ${formatNaira(total)}`,
            html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:24px">
              <div style="background:#b45309;color:#fff;border-radius:8px 8px 0 0;padding:20px 24px">
                <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:4px">TBC OutOfZion Finance</div>
                <div style="font-size:20px;font-weight:800">Payments Awaiting Bank Transfer ⚠</div>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
                <p style="margin:0 0 16px;color:#374151">Hi ${chima.name},</p>
                <p style="margin:0 0 16px;color:#374151"><strong>${approvedItems.length} approved item${approvedItems.length !== 1 ? 's' : ''}</strong> are awaiting payment at the bank. Please initiate the transfers.</p>
                <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
                  <thead><tr style="background:#f3f4f6">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280">Req #</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280">Item</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280">Amount</th>
                  </tr></thead>
                  <tbody>${itemRows}</tbody>
                  <tfoot><tr style="background:#f3f4f6">
                    <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700">Total outstanding</td>
                    <td style="padding:10px 12px;text-align:right;font-size:15px;font-weight:800">${formatNaira(total)}</td>
                  </tr></tfoot>
                </table>
                <a href="https://tbcooz-finance.com/dashboard/payments" style="display:inline-block;background:#064E2F;color:#fff;text-decoration:none;padding:11px 20px;border-radius:7px;font-size:13px;font-weight:600">Open Payment Queue →</a>
              </div>
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System · Automated daily reminder</p>
            </div>`,
          })
          payEmailsSent++
        } catch { /* non-critical */ }
      }
    }
    await admin.from('line_items').update({ payment_reminder_sent_at: new Date().toISOString() }).in('id', approvedItems.map((i) => i.id))
    results.paymentReminders = { items: approvedItems.length, emailsSent: payEmailsSent }
  } else {
    results.paymentReminders = { items: 0 }
  }

  // ── 2. Retirement reminders → requesters ──────────────────────────────────
  const now = new Date().toISOString()
  const { data: dueItems } = await admin
    .from('line_items')
    .select('id, description, amount, req_id, paid_at, retirement_due_at, requisitions!inner(req_number, user_id)')
    .eq('status', 'paid')
    .not('retirement_due_at', 'is', null)
    .lte('retirement_due_at', now)
    .is('retirement_reminder_sent_at', null)

  if (dueItems && dueItems.length > 0) {
    const byRequester: Record<string, typeof dueItems> = {}
    for (const item of dueItems) {
      const req = item.requisitions as unknown as { req_number: string; user_id: string }
      if (!byRequester[req.user_id]) byRequester[req.user_id] = []
      byRequester[req.user_id].push(item)
    }

    let retireEmailsSent = 0
    for (const [userId, items] of Object.entries(byRequester)) {
      const { data: requesterAuth } = await admin.auth.admin.getUserById(userId)
      const { data: profile } = await admin.from('profiles').select('name').eq('id', userId).single()
      const total = items.reduce((s, i) => s + Number(i.amount), 0)

      const itemRows = items.map((item) => {
        const req = item.requisitions as unknown as { req_number: string; user_id: string }
        const dueDate = item.retirement_due_at
          ? new Date(item.retirement_due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${req.req_number}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600">${formatNaira(Number(item.amount))}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#dc2626;font-weight:600">${dueDate}</td>
        </tr>`
      }).join('')

      for (const item of items) {
        await admin.from('notifications').insert({
          user_id: userId,
          line_item_id: item.id,
          req_id: item.req_id,
          message: `Fund retirement is due for "${item.description}" (${formatNaira(Number(item.amount))}). Please submit your retirement notes.`,
          type: 'retirement_reminder',
        })
      }

      if (requesterAuth?.user?.email) {
        try {
          await getResend().emails.send({
            from: FROM,
            to: requesterAuth.user.email,
            subject: `Action Required: Fund Retirement Due for ${items.length} Item${items.length !== 1 ? 's' : ''} — ${formatNaira(total)}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="background:#064E2F;color:#fff;border-radius:8px 8px 0 0;padding:20px 24px">
                <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:4px">TBC OutOfZion Finance</div>
                <div style="font-size:20px;font-weight:800">Fund Retirement Due 📋</div>
              </div>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
                <p style="margin:0 0 16px;color:#374151">Hi ${profile?.name ?? 'there'},</p>
                <p style="margin:0 0 16px;color:#374151">The <strong>15-day retirement window has now passed</strong> for the items below. Please submit your retirement notes as soon as possible.</p>
                <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
                  <thead><tr style="background:#f3f4f6">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280">Req #</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280">Item</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280">Amount</th>
                    <th style="padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#dc2626">Due Date</th>
                  </tr></thead>
                  <tbody>${itemRows}</tbody>
                </table>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:20px">
                  <div style="font-size:12px;color:#dc2626;font-weight:600">Unretired items will be flagged in the end-of-month reconciliation. Please act promptly.</div>
                </div>
                <a href="https://tbcooz-finance.com/dashboard/retirement" style="display:inline-block;background:#064E2F;color:#fff;text-decoration:none;padding:11px 20px;border-radius:7px;font-size:13px;font-weight:600">Submit Retirement Notes →</a>
              </div>
              <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System · Automated reminder</p>
            </div>`,
          })
          retireEmailsSent++
        } catch { /* non-critical */ }
      }
    }
    await admin.from('line_items').update({ retirement_reminder_sent_at: new Date().toISOString() }).in('id', dueItems.map((i) => i.id))
    results.retirementReminders = { items: dueItems.length, emailsSent: retireEmailsSent }
  } else {
    results.retirementReminders = { items: 0 }
  }

  return NextResponse.json(results)
}
