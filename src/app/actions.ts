'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatNaira } from '@/lib/utils'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'TBC Finance <noreply@tbcooz-finance.com>'

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch {
    // Non-critical — log but don't block the action
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getActorProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', profile: null, supabase: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found', profile: null, supabase: null }
  return { error: null, profile, supabase }
}

// ─── Submit requisition ───────────────────────────────────────────────────────

export async function submitRequisition(
  dept: string,
  items: { description: string; qty: number; unitPrice: number; amount: number }[],
  notes?: string
) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (!dept) return { error: 'Department is required' }
  if (!items.length) return { error: 'At least one line item is required' }
  if (items.some((i) => !i.description.trim() || i.amount <= 0)) {
    return { error: 'All items must have a description and a positive amount' }
  }

  // Generate req number
  const { count } = await supabase.from('requisitions').select('*', { count: 'exact', head: true })
  const nextId = (count ?? 0) + 2001
  const reqNumber = `REQ-${String(nextId).padStart(4, '0')}`

  const { data: req, error: reqErr } = await supabase
    .from('requisitions')
    .insert({ req_number: reqNumber, user_id: profile.id, dept, notes: notes?.trim() || null })
    .select()
    .single()

  if (reqErr || !req) return { error: reqErr?.message ?? 'Failed to create requisition' }

  const lineItems = items.map((i) => ({
    req_id: req.id,
    description: i.description,
    qty: i.qty,
    unit_price: i.unitPrice,
    amount: i.amount,
    status: 'pending',
  }))

  const { error: liErr } = await supabase.from('line_items').insert(lineItems)
  if (liErr) return { error: liErr.message }

  const total = items.reduce((s, i) => s + i.amount, 0)
  await supabase.from('audit_log').insert({
    req_id: req.id,
    actor_id: profile.id,
    actor_name: profile.name,
    action: 'Requisition submitted',
    detail: `${items.length} line item${items.length !== 1 ? 's' : ''} · ${formatNaira(total)}`,
  })

  revalidatePath('/dashboard/my-req')
  revalidatePath('/dashboard/approve')
  revalidatePath('/dashboard/audit')
  revalidatePath('/dashboard/viewer')
  return { error: null, reqNumber, reqId: req.id }
}

// ─── Approve item (pending → approved) ───────────────────────────────────────
// Finance, Pastor, or Admin only — single-step deliberation

export async function approveItem(lineItemId: number) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (!['finance', 'pastor', 'admin'].includes(profile.role)) {
    return { error: 'Only Head of Finance, Senior Pastor, or Admin can approve items' }
  }

  const { data: item } = await supabase
    .from('line_items')
    .select('*, requisitions!inner(req_number, user_id)')
    .eq('id', lineItemId)
    .single()

  if (!item) return { error: 'Line item not found' }
  if (item.status !== 'pending') return { error: 'Only pending items can be approved' }

  const { error: upErr } = await supabase
    .from('line_items')
    .update({ status: 'approved', decided_by: profile.id, decided_at: new Date().toISOString() })
    .eq('id', lineItemId)

  if (upErr) return { error: upErr.message }

  const req = item.requisitions as { req_number: string; user_id: string }

  await supabase.from('audit_log').insert({
    req_id: item.req_id,
    line_item_id: lineItemId,
    actor_id: profile.id,
    actor_name: profile.name,
    action: `Approved "${item.description}"`,
    detail: `${formatNaira(item.amount)} · added to payment queue`,
  })

  // Notify the requester (in-app + email)
  const admin = createAdminClient()
  const message = `"${item.description}" in ${req.req_number} was approved (${formatNaira(item.amount)})`
  await admin.from('notifications').insert({
    user_id: req.user_id,
    line_item_id: lineItemId,
    req_id: item.req_id,
    message,
    type: 'approved',
  })

  // Send email to requester
  const { data: requesterAuth } = await admin.auth.admin.getUserById(req.user_id)
  const { data: requesterProfile } = await admin.from('profiles').select('name').eq('id', req.user_id).single()
  if (requesterAuth?.user?.email) {
    await sendEmail(
      requesterAuth.user.email,
      `✓ Item Approved — ${req.req_number}`,
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:#16a34a;color:#fff;border-radius:8px 8px 0 0;padding:20px 24px">
          <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:4px">TBC OutOfZion Finance</div>
          <div style="font-size:20px;font-weight:800">Item Approved ✓</div>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
          <p style="margin:0 0 16px;color:#374151">Hi ${requesterProfile?.name ?? 'there'},</p>
          <p style="margin:0 0 16px;color:#374151">Your requisition item has been <strong style="color:#16a34a">approved</strong> and added to the payment queue.</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Requisition</div>
            <div style="font-size:14px;font-weight:700;color:#111827;font-family:monospace">${req.req_number}</div>
            <div style="margin-top:12px;font-size:12px;color:#6b7280;margin-bottom:4px">Item</div>
            <div style="font-size:14px;font-weight:600;color:#111827">${item.description}</div>
            <div style="margin-top:12px;font-size:12px;color:#6b7280;margin-bottom:4px">Amount</div>
            <div style="font-size:18px;font-weight:800;color:#111827">${formatNaira(item.amount)}</div>
          </div>
          <p style="margin:0 0 20px;color:#6b7280;font-size:13px">Payment will be processed by the finance team. You will be notified when payment is made.</p>
          <a href="https://tbcooz-finance.com/dashboard/my-req" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 20px;border-radius:7px;font-size:13px;font-weight:600">View My Requisitions →</a>
        </div>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System</p>
      </div>`
    )
  }

  revalidatePath('/dashboard/approve')
  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/my-req')
  revalidatePath('/dashboard/audit')
  revalidatePath('/dashboard/viewer')
  return { error: null }
}

// ─── Reject item (pending → rejected) ────────────────────────────────────────

export async function rejectItem(lineItemId: number, reason: string) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (!['finance', 'pastor', 'admin'].includes(profile.role)) {
    return { error: 'Only Head of Finance, Senior Pastor, or Admin can reject items' }
  }
  if (!reason.trim()) return { error: 'A rejection reason is required' }

  const { data: item } = await supabase
    .from('line_items')
    .select('*, requisitions!inner(req_number, user_id)')
    .eq('id', lineItemId)
    .single()

  if (!item) return { error: 'Line item not found' }
  if (item.status !== 'pending') return { error: 'Only pending items can be rejected' }

  const { error: upErr } = await supabase
    .from('line_items')
    .update({ status: 'rejected', reason, decided_by: profile.id, decided_at: new Date().toISOString() })
    .eq('id', lineItemId)

  if (upErr) return { error: upErr.message }

  const req = item.requisitions as { req_number: string; user_id: string }

  await supabase.from('audit_log').insert({
    req_id: item.req_id,
    line_item_id: lineItemId,
    actor_id: profile.id,
    actor_name: profile.name,
    action: `Rejected "${item.description}"`,
    detail: `Reason: ${reason}`,
  })

  // Notify the requester (in-app + email)
  const admin = createAdminClient()
  const message = `"${item.description}" in ${req.req_number} was rejected — Reason: ${reason}`
  await admin.from('notifications').insert({
    user_id: req.user_id,
    line_item_id: lineItemId,
    req_id: item.req_id,
    message,
    type: 'rejected',
  })

  // Send email to requester
  const { data: requesterAuth } = await admin.auth.admin.getUserById(req.user_id)
  const { data: requesterProfile } = await admin.from('profiles').select('name').eq('id', req.user_id).single()
  if (requesterAuth?.user?.email) {
    await sendEmail(
      requesterAuth.user.email,
      `✕ Item Rejected — ${req.req_number}`,
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <div style="background:#dc2626;color:#fff;border-radius:8px 8px 0 0;padding:20px 24px">
          <div style="font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;margin-bottom:4px">TBC OutOfZion Finance</div>
          <div style="font-size:20px;font-weight:800">Item Rejected ✕</div>
        </div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
          <p style="margin:0 0 16px;color:#374151">Hi ${requesterProfile?.name ?? 'there'},</p>
          <p style="margin:0 0 16px;color:#374151">Your requisition item has been <strong style="color:#dc2626">rejected</strong>.</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Requisition</div>
            <div style="font-size:14px;font-weight:700;color:#111827;font-family:monospace">${req.req_number}</div>
            <div style="margin-top:12px;font-size:12px;color:#6b7280;margin-bottom:4px">Item</div>
            <div style="font-size:14px;font-weight:600;color:#111827">${item.description}</div>
            <div style="margin-top:12px;font-size:12px;color:#6b7280;margin-bottom:4px">Amount</div>
            <div style="font-size:18px;font-weight:800;color:#111827">${formatNaira(item.amount)}</div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:20px">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#dc2626;margin-bottom:6px">Reason for rejection</div>
            <div style="font-size:14px;color:#374151">${reason}</div>
          </div>
          <p style="margin:0 0 20px;color:#6b7280;font-size:13px">If you have questions, please speak with the finance team directly.</p>
          <a href="https://tbcooz-finance.com/dashboard/my-req" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 20px;border-radius:7px;font-size:13px;font-weight:600">View My Requisitions →</a>
        </div>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center">TBC OutOfZion · Internal Finance System</p>
      </div>`
    )
  }

  revalidatePath('/dashboard/approve')
  revalidatePath('/dashboard/my-req')
  revalidatePath('/dashboard/audit')
  revalidatePath('/dashboard/viewer')
  return { error: null }
}

// ─── Mark paid ────────────────────────────────────────────────────────────────

export async function markPaid(lineItemId: number) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (profile.role !== 'chima' && profile.role !== 'admin') {
    return { error: 'Only Chima or Admin can mark items as paid' }
  }

  const { data: item } = await supabase
    .from('line_items')
    .select('*')
    .eq('id', lineItemId)
    .single()

  if (!item) return { error: 'Line item not found' }
  if (item.status !== 'approved') return { error: 'Only approved items can be marked as paid' }

  const { error: upErr } = await supabase
    .from('line_items')
    .update({ status: 'paid', paid_by: profile.id, paid_at: new Date().toISOString() })
    .eq('id', lineItemId)

  if (upErr) return { error: upErr.message }

  await supabase.from('audit_log').insert({
    req_id: item.req_id,
    line_item_id: lineItemId,
    actor_id: profile.id,
    actor_name: profile.name,
    action: `Paid "${item.description}"`,
    detail: `${formatNaira(item.amount)} · bank app (manual)`,
  })

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/my-req')
  revalidatePath('/dashboard/audit')
  revalidatePath('/dashboard/viewer')
  return { error: null }
}

// ─── Resubmit item ────────────────────────────────────────────────────────────

export async function resubmitItem(lineItemId: number, newDesc: string, newAmount: number) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (!newDesc.trim()) return { error: 'Description is required' }
  if (newAmount <= 0) return { error: 'Amount must be positive' }

  const { data: item } = await supabase
    .from('line_items')
    .select('*, requisitions!inner(user_id)')
    .eq('id', lineItemId)
    .single()

  if (!item) return { error: 'Line item not found' }
  if (item.status !== 'rejected') return { error: 'Only rejected items can be resubmitted' }

  const req = item.requisitions as { user_id: string }
  if (req.user_id !== profile.id && profile.role !== 'admin') {
    return { error: 'You can only resubmit your own requisitions' }
  }

  const { error: upErr } = await supabase
    .from('line_items')
    .update({
      description: newDesc.trim(),
      amount: newAmount,
      status: 'pending',
      reason: null,
      decided_by: null,
      decided_at: null,
    })
    .eq('id', lineItemId)

  if (upErr) return { error: upErr.message }

  await supabase.from('audit_log').insert({
    req_id: item.req_id,
    line_item_id: lineItemId,
    actor_id: profile.id,
    actor_name: profile.name,
    action: `Resubmitted "${newDesc.trim()}"`,
    detail: `Updated from "${item.description}" · ${formatNaira(newAmount)}`,
  })

  revalidatePath('/dashboard/my-req')
  revalidatePath('/dashboard/approve')
  revalidatePath('/dashboard/audit')
  return { error: null }
}

// ─── Toggle DG availability ───────────────────────────────────────────────────

export async function toggleDgAvailability() {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (profile.role !== 'dg' && profile.role !== 'admin') {
    return { error: 'Only DG or Admin can toggle availability' }
  }

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'dg_available')
    .single()

  const current = setting?.value === 'true'
  const next = !current

  const { error: upErr } = await supabase
    .from('settings')
    .update({ value: String(next) })
    .eq('key', 'dg_available')

  if (upErr) return { error: upErr.message }

  await supabase.from('audit_log').insert({
    actor_id: profile.id,
    actor_name: profile.name,
    action: next ? 'DG marked available' : 'DG marked unavailable',
    detail: next ? 'Dr. Ngozi Eze is now the acting approver' : 'Backup approver Tunde Bakare is now acting',
  })

  revalidatePath('/dashboard', 'layout')
  return { error: null, dgAvailable: next }
}

// ─── Invite user ──────────────────────────────────────────────────────────────

export async function inviteUser(name: string, email: string, role: string, dept?: string) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (profile.role !== 'admin') return { error: 'Only Admin can create users' }
  if (!name.trim() || !email.trim() || !role) return { error: 'Name, email, and role are required' }

  const validRoles = ['hod', 'dg', 'finance', 'pastor', 'chima', 'admin']
  if (!validRoles.includes(role)) return { error: 'Invalid role' }
  if (role === 'hod' && !dept?.trim()) return { error: 'Department is required for HoD role' }

  // Generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 900 + 100)

  const admin = createAdminClient()

  // Create auth user
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
  })
  if (authErr || !authData.user) return { error: authErr?.message ?? 'Failed to create auth user' }

  // Create profile
  const { error: profileErr } = await admin.from('profiles').insert({
    id: authData.user.id,
    name: name.trim(),
    email: email.trim(),
    role,
    dept: dept?.trim() || null,
    must_change_password: true,
  })

  if (profileErr) {
    // Roll back auth user
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: profileErr.message }
  }

  await supabase.from('audit_log').insert({
    actor_id: profile.id,
    actor_name: profile.name,
    action: `Created user "${name.trim()}"`,
    detail: `Email: ${email.trim()} · Role: ${role}${dept ? ` · Dept: ${dept.trim()}` : ''}`,
  })

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/audit')
  return { error: null, tempPassword }
}

// ─── Retire item (paid → retired) ────────────────────────────────────────────

export async function retireItem(lineItemId: number, retirementNotes: string) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }
  if (!retirementNotes.trim()) return { error: 'Retirement notes are required' }

  const { data: item } = await supabase
    .from('line_items')
    .select('*, requisitions!inner(user_id)')
    .eq('id', lineItemId)
    .single()

  if (!item) return { error: 'Line item not found' }
  if (item.status !== 'paid') return { error: 'Only paid items can be retired' }

  const req = item.requisitions as { user_id: string }
  if (req.user_id !== profile.id && profile.role !== 'admin') {
    return { error: 'You can only retire your own requisitions' }
  }

  const { error: upErr } = await supabase
    .from('line_items')
    .update({
      status: 'retired',
      retirement_notes: retirementNotes.trim(),
      retired_by: profile.id,
      retired_at: new Date().toISOString(),
    })
    .eq('id', lineItemId)

  if (upErr) return { error: upErr.message }

  await supabase.from('audit_log').insert({
    req_id: item.req_id,
    line_item_id: lineItemId,
    actor_id: profile.id,
    actor_name: profile.name,
    action: `Retired "${item.description}"`,
    detail: `Retirement notes: ${retirementNotes.trim()}`,
  })

  revalidatePath('/dashboard/retirement')
  revalidatePath('/dashboard/my-req')
  revalidatePath('/dashboard/audit')
  return { error: null }
}

// ─── Reconcile requisition (all retired items signed off by finance) ──────────

export async function reconcileRequisition(reqId: number, notes: string) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  if (!['finance', 'admin', 'chima'].includes(profile.role)) {
    return { error: 'Only Finance, Admin, or Chima can reconcile requisitions' }
  }

  // Ensure there are paid/retired items and none are still in 'paid' state
  const { data: items } = await supabase
    .from('line_items')
    .select('id, status, description, amount')
    .eq('req_id', reqId)
    .in('status', ['paid', 'retired'])

  if (!items || items.length === 0) {
    return { error: 'No paid or retired items found for this requisition' }
  }

  const outstanding = items.filter((i) => i.status === 'paid')
  if (outstanding.length > 0) {
    return {
      error: `${outstanding.length} item${outstanding.length !== 1 ? 's' : ''} still pending retirement — retire all items before reconciling`,
    }
  }

  const total = items.reduce((s, i) => s + Number(i.amount), 0)

  await supabase.from('audit_log').insert({
    req_id: reqId,
    actor_id: profile.id,
    actor_name: profile.name,
    action: 'Reconciled',
    detail: notes?.trim()
      ? `Notes: ${notes.trim()} · ${formatNaira(total)} verified`
      : `All ${items.length} retired item${items.length !== 1 ? 's' : ''} verified · ${formatNaira(total)}`,
  })

  revalidatePath('/dashboard/reconciliation')
  revalidatePath('/dashboard/audit')
  return { error: null }
}

// ─── Save attachment record ───────────────────────────────────────────────────

export async function saveAttachment(reqId: number, fileName: string, storagePath: string) {
  const { error, profile, supabase } = await getActorProfile()
  if (error || !profile || !supabase) return { error: error ?? 'Auth error' }

  const { error: insErr } = await supabase.from('attachments').insert({
    req_id: reqId,
    uploaded_by: profile.id,
    file_name: fileName,
    storage_path: storagePath,
  })

  if (insErr) return { error: insErr.message }
  revalidatePath('/dashboard/my-req')
  return { error: null }
}

// ─── Mark notifications read ──────────────────────────────────────────────────

export async function markNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  revalidatePath('/dashboard/notifications')
}

// ─── Verify viewer passcode ───────────────────────────────────────────────────

export async function verifyViewerPasscode(input: string): Promise<{ ok: boolean }> {
  const correct = process.env.VIEWER_PASSCODE ?? 'ZION26'
  return { ok: input.trim().toUpperCase() === correct.toUpperCase() }
}

// ─── Sign up ──────────────────────────────────────────────────────────────────

export async function signUpUser(
  name: string,
  email: string,
  password: string,
  role: string,
  dept: string | null
) {
  if (!name.trim()) return { error: 'Name is required' }
  if (!email.trim()) return { error: 'Email is required' }
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters' }

  const validRoles = ['hod', 'dg', 'backup', 'finance', 'pastor', 'chima', 'admin']
  if (!validRoles.includes(role)) return { error: 'Please select a valid role' }
  if (role === 'hod' && !dept?.trim()) return { error: 'Department is required for HoD role' }

  const admin = createAdminClient()

  // Block duplicate admin accounts — check BEFORE creating the auth user to minimise race window
  if (role === 'admin') {
    const { count } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
    if ((count ?? 0) > 0) {
      return { error: 'An admin account already exists. Contact your administrator.' }
    }
  }

  const supabase = await createClient()

  // Create the auth user
  const { data, error: authErr } = await supabase.auth.signUp({ email: email.trim(), password })
  if (authErr) return { error: authErr.message }
  if (!data.user) return { error: 'Could not create account. Please try again.' }

  // Insert profile using admin client (bypasses RLS — safe because this is server-side)
  const { error: profileErr } = await admin.from('profiles').insert({
    id: data.user.id,
    name: name.trim(),
    email: email.trim(),
    role,
    dept: dept?.trim() || null,
    must_change_password: false,
  })

  if (profileErr) return { error: profileErr.message }

  // Sign out immediately so the user is not auto-logged in after signup
  await supabase.auth.signOut()

  return { error: null }
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message, mustChangePassword: false }

  // Check if user must change password on first login
  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', data.user.id)
    .single()

  return { error: null, mustChangePassword: !!profile?.must_change_password }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

// ─── Change password (first login) ───────────────────────────────────────────

export async function changePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
  if (pwErr) return { error: pwErr.message }

  // Clear the must_change_password flag
  await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)

  revalidatePath('/', 'layout')
  return { error: null }
}
