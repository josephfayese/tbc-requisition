import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReconciliationClient, { type ReqGroup } from './ReconciliationClient'

export const metadata: Metadata = { title: 'Reconciliation' }

export default async function ReconciliationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (!['finance', 'chima', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: rawItems } = await supabase
    .from('line_items')
    .select(`id, description, amount, status, paid_at, retired_at, retirement_notes, req_id, requisitions!inner(id, req_number, dept, profiles(name))`)
    .in('status', ['paid', 'retired'])
    .order('paid_at', { ascending: false })

  const { data: reconLog } = await supabase
    .from('audit_log')
    .select('req_id, actor_name, created_at')
    .eq('action', 'Reconciled')
    .order('created_at', { ascending: false })

  const reconMap: Record<number, { actor_name: string; created_at: string }> = {}
  for (const entry of reconLog ?? []) {
    if (entry.req_id && !reconMap[entry.req_id]) reconMap[entry.req_id] = { actor_name: entry.actor_name, created_at: entry.created_at }
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const reqMap: Record<number, ReqGroup> = {}
  for (const item of rawItems ?? []) {
    const req = item.requisitions as any
    const reqId = req.id as number
    if (!reqMap[reqId]) reqMap[reqId] = { req_id: reqId, req_number: req.req_number, dept: req.dept, requester: req.profiles?.name ?? 'Unknown', items: [], reconciled: reconMap[reqId] ?? null }
    reqMap[reqId].items.push({ id: item.id, description: item.description, amount: Number(item.amount), status: item.status as 'paid' | 'retired', paid_at: item.paid_at as string | null, retired_at: item.retired_at as string | null, retirement_notes: item.retirement_notes as string | null })
  }

  const rankStatus = (g: ReqGroup) => { if (g.reconciled) return 2; if (g.items.some(i => i.status === 'paid')) return 0; return 1 }
  const groups = Object.values(reqMap).sort((a, b) => rankStatus(a) - rankStatus(b))

  return (
    <div>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Reconciliation</h1>
          <p className="fd-pagehead__sub">Match approved disbursements against retirement submissions.</p>
        </div>
      </div>
      <ReconciliationClient groups={groups} userRole={profile.role} />
    </div>
  )
}
