import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fmtDate } from '@/lib/utils'
import AuditClient from './AuditClient'

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // All requisitions (for left panel)
  const { data: reqs } = await supabase
    .from('requisitions')
    .select('id, req_number, dept, created_at, profiles (name)')
    .order('created_at', { ascending: false })

  // Full audit log
  const { data: log } = await supabase
    .from('audit_log')
    .select('id, req_id, line_item_id, actor_id, actor_name, action, detail, created_at')
    .order('created_at', { ascending: true })

  const requisitions = (reqs ?? []).map((r) => ({
    id: r.id,
    req_number: r.req_number,
    dept: r.dept,
    created_at: r.created_at,
    submitter: (r.profiles as unknown as { name: string } | null)?.name ?? '',
  }))

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Audit & History</div>
          <h1>Immutable <em>Audit Log</em></h1>
          <p className="masthead-sub">
            Select a requisition to see its full timeline. All actions are append-only.
          </p>
        </div>
      </div>
      <AuditClient requisitions={requisitions} fullLog={log ?? []} />
    </div>
  )
}
