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
  const now = new Date().toISOString()

  // Find paid items where retirement_due_at has passed and reminder not yet sent
  const { data: dueItems } = await admin
    .from('line_items')
    .select('id, description, amount, req_id, paid_at, retirement_due_at, requisitions!inner(req_number, user_id)')
    .eq('status', 'paid')
    .not('retirement_due_at', 'is', null)
    .lte('retirement_due_at', now)
    .is('retirement_reminder_sent_at', null)

  if (!dueItems || dueItems.length === 0) {
    return NextResponse.json({ reminded: 0, message: 'No retirement reminders due' })
  }

  // Group by requester
  const byRequester: Record<string, typeof dueItems> = {}
  for (const item of dueItems) {
    const req = item.requisitions as unknown as { req_number: string; user_id: string }
    if (!byRequester[req.user_id]) byRequester[req.user_id] = []
    byRequester[req.user_id].push(item)
  }

  let emailsSent = 0

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

    // In-app notification
    for (const item of items) {
      await admin.from('notifications').insert({
        user_id: userId,
        line_item_id: item.id,
        req_id: item.req_id,
        message: `Fund retirement is due for "${item.description}" (${formatNaira(Number(item.amount))}). Please submit your retirement notes.`,
        type: 'retirement_reminder',
      })
    }

    // Email
    if (requesterAuth?.user?.email) {
      try {
        await resend.emails.send({
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
              <p style="margin:0 0 16px;color:#374151">Payment has been made for the items below and the <strong>15-day retirement window has now passed</strong>. Please submit your retirement notes for each item as soon as possible.</p>
              <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
                <thead>
                  <tr style="background:#f3f4f6">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Req #</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Item</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Amount</th>
                    <th style="padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#dc2626">Due Date</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:20px">
                <div style="font-size:12px;color:#dc2626;font-weight:600">
                  Unretired items will be flagged in the end-of-month reconciliation. Please act promptly.
                </div>
              </div>
              <a href="https://tbcooz-finance.com/dashboard/retirement" style="display:inline-block;background:#064E2F;color:#fff;text-decoration:none;padding:11px 20px;border-radius:7px;font-size:13px;font-weight:600">Submit Retirement Notes →</a>
            </div>
            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System · Automated reminder</p>
          </div>`,
        })
        emailsSent++
      } catch { /* non-critical */ }
    }
  }

  // Mark reminded
  const itemIds = dueItems.map((i) => i.id)
  await admin
    .from('line_items')
    .update({ retirement_reminder_sent_at: new Date().toISOString() })
    .in('id', itemIds)

  return NextResponse.json({ reminded: emailsSent, items: dueItems.length })
}
