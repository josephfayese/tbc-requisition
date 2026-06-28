import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira } from '@/lib/utils'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'TBC Finance <noreply@tbcooz-finance.com>'

// Vercel invokes this with Authorization: Bearer <CRON_SECRET>
function isAuthorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find all approved items (awaiting bank payment)
  const { data: approvedItems } = await admin
    .from('line_items')
    .select('id, description, amount, req_id, requisitions!inner(req_number, dept)')
    .eq('status', 'approved')

  if (!approvedItems || approvedItems.length === 0) {
    return NextResponse.json({ reminded: 0, message: 'No approved items pending payment' })
  }

  // Get all chima (Payment Executor) users
  const { data: chimaProfiles } = await admin
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'chima')

  if (!chimaProfiles || chimaProfiles.length === 0) {
    return NextResponse.json({ reminded: 0, message: 'No payment executor accounts found' })
  }

  const total = approvedItems.reduce((s, i) => s + Number(i.amount), 0)

  // Build item list HTML
  const itemRows = approvedItems.map((item) => {
    const req = item.requisitions as unknown as { req_number: string; dept: string }
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">${req.req_number}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;font-weight:600">${formatNaira(Number(item.amount))}</td>
    </tr>`
  }).join('')

  // Send email + create in-app notification for each chima user
  let emailsSent = 0
  for (const chima of chimaProfiles) {
    // In-app notification
    await admin.from('notifications').insert({
      user_id: chima.id,
      message: `${approvedItems.length} approved item${approvedItems.length !== 1 ? 's' : ''} (${formatNaira(total)}) are awaiting bank payment. Please initiate payment.`,
      type: 'payment_reminder',
    })

    // Email reminder
    if (chima.email) {
      try {
        await resend.emails.send({
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
              <p style="margin:0 0 16px;color:#374151">The following <strong>${approvedItems.length} approved item${approvedItems.length !== 1 ? 's' : ''}</strong> are awaiting payment at the bank. Please initiate the transfers.</p>
              <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
                <thead>
                  <tr style="background:#f3f4f6">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Req #</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Item</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Amount</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                  <tr style="background:#f3f4f6">
                    <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700">Total outstanding</td>
                    <td style="padding:10px 12px;text-align:right;font-size:15px;font-weight:800">${formatNaira(total)}</td>
                  </tr>
                </tfoot>
              </table>
              <a href="https://tbcooz-finance.com/dashboard/payments" style="display:inline-block;background:#064E2F;color:#fff;text-decoration:none;padding:11px 20px;border-radius:7px;font-size:13px;font-weight:600">Open Payment Queue →</a>
            </div>
            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System · This is an automated reminder</p>
          </div>`,
        })
        emailsSent++
      } catch { /* non-critical */ }
    }
  }

  // Mark items as reminded (update payment_reminder_sent_at)
  const itemIds = approvedItems.map((i) => i.id)
  await admin
    .from('line_items')
    .update({ payment_reminder_sent_at: new Date().toISOString() })
    .in('id', itemIds)

  return NextResponse.json({ reminded: emailsSent, items: approvedItems.length, total })
}
