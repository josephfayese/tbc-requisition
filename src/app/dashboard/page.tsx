import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

// Roles that get a full home page vs. a direct redirect.
// Dashboard is reserved for the finance team, DG, and Admin.
const REDIRECT_ROLES: Record<string, string> = {
  hod:    '/dashboard/new-req',
  backup: '/dashboard/approve',
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
    { data: allItems },
    { data: reconLog },
    { count: approvedCount },
  ] = await Promise.all([
    // All line items with joined requisition data
    supabase
      .from('line_items')
      .select('id, description, amount, status, paid_at, decided_at, created_at, retirement_due_at, req_id, requisitions!inner(req_number, dept, user_id, profiles(name))')
      .order('created_at', { ascending: false }),

    // Reconciled requisitions
    supabase.from('audit_log').select('req_id').or('action.eq.Reconciled,action.eq.Auto-reconciled'),

    // Approved count for payment queue badge
    supabase.from('line_items').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
  ])

  // Serialize data for the client component
  const reconciledReqIds = [...new Set((reconLog ?? []).map((r) => r.req_id).filter(Boolean))]

  return (
    <DashboardClient
      profileName={profile.name}
      profileRole={profile.role}
      allItems={allItems ?? []}
      reconciledReqIds={reconciledReqIds}
      approvedCount={approvedCount ?? 0}
    />
  )
}
