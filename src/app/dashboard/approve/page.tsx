import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApproveClient from './ApproveClient'
import { formatNaira } from '@/lib/utils'

export default async function ApprovePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const canSee = ['dg', 'finance', 'pastor', 'chima', 'admin', 'trainer'].includes(profile.role)
  if (!canSee) redirect('/dashboard')

  const canApprove = ['finance', 'pastor', 'admin', 'trainer'].includes(profile.role)

  const { data: rawItems } = await supabase
    .from('line_items')
    .select(`
      id, description, amount, qty, unit_price, created_at, req_id,
      requisitions!inner(id, req_number, dept, created_at, notes,
        profiles!requisitions_user_id_fkey(name)
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const items = (rawItems ?? []).map((item: any) => {
    const req = item.requisitions
    return {
      id: item.id,
      description: item.description,
      amount: Number(item.amount),
      qty: item.qty ?? 1,
      unit_price: item.unit_price ? Number(item.unit_price) : null,
      created_at: item.created_at,
      req_id: item.req_id,
      req_number: req?.req_number ?? '',
      dept: req?.dept ?? '',
      notes: req?.notes ?? '',
      req_created_at: req?.created_at ?? '',
      requester: req?.profiles?.name ?? 'Unknown',
    }
  })

  const totalValue = items.reduce((s: number, i: any) => s + i.amount, 0)

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="masthead" style={{ marginBottom: 24 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Deliberation</div>
          <h1>All <em>Requisitions</em></h1>
          <p className="masthead-sub">
            {items.length} item{items.length !== 1 ? 's' : ''} pending · {formatNaira(totalValue)} total
            {!canApprove && <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--ink-4)' }}>— View only</span>}
          </p>
        </div>
      </div>

      <ApproveClient items={items} canApprove={canApprove} />
    </div>
  )
}
