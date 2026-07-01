import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RetirementClient from './RetirementClient'
import { formatNaira, fmtDate } from '@/lib/utils'

export default async function RetirementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Retirement is open to all authenticated users (visibility controlled via settings)

  // Fetch paid items belonging to this user's requisitions
  const { data: items } = await supabase
    .from('line_items')
    .select(`
      id, description, amount, qty, unit_price, paid_at,
      requisitions!inner(id, req_number, dept, user_id)
    `)
    .eq('status', 'paid')
    .eq('requisitions.user_id', user.id)
    .order('paid_at', { ascending: true })

  // Fetch already retired items (last 20)
  const { data: retired } = await supabase
    .from('line_items')
    .select(`
      id, description, amount, retirement_notes, retired_at,
      requisitions!inner(req_number, dept, user_id)
    `)
    .eq('status', 'retired')
    .eq('requisitions.user_id', user.id)
    .order('retired_at', { ascending: false })
    .limit(20)

  const mapped = (items ?? []).map((it: any) => ({
    id: it.id,
    description: it.description,
    amount: Number(it.amount),
    qty: it.qty ?? 1,
    unit_price: it.unit_price ? Number(it.unit_price) : null,
    paid_at: it.paid_at,
    req_number: it.requisitions.req_number,
    dept: it.requisitions.dept,
  }))

  const mappedRetired = (retired ?? []).map((it: any) => ({
    id: it.id,
    description: it.description,
    amount: Number(it.amount),
    retirement_notes: it.retirement_notes,
    retired_at: it.retired_at,
    req_number: it.requisitions.req_number,
    dept: it.requisitions.dept,
  }))

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Retirement</div>
          <h1>Fund <em>Retirement</em></h1>
          <p className="masthead-sub">
            Account for paid items by submitting receipts and notes. Retire each item once the funds have been used.
          </p>
        </div>
      </div>

      <RetirementClient items={mapped} retired={mappedRetired} />
    </div>
  )
}
