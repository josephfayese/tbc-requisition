import { createClient } from '@/lib/supabase/server'
import ViewerClient from './ViewerClient'

export default async function ViewerPage() {
  // Viewer page: try to load data, but gracefully handle unauthenticated access
  // The passcode gate is enforced on the client side.
  // Data is only meaningful after passcode unlock, so we load it server-side
  // (works fine when the user is logged in, or fails silently when not — client shows passcode gate first anyway)
  let pending: Array<{ id: number; description: string; amount: number; created_at: string; req_number: string; dept: string; requester: string }> = []
  let feed: Array<{ id: number; action: string; detail: string | null; actor_name: string; created_at: string; req_id: number | null; line_item_id: number | null }> = []
  let totalPending = 0

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: pendingItems } = await supabase
        .from('line_items')
        .select(`
          id, description, amount, status, created_at,
          requisitions (req_number, dept, profiles (name))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      const { data: recentLog } = await supabase
        .from('audit_log')
        .select('id, action, detail, actor_name, created_at, req_id, line_item_id')
        .or('action.ilike.Approved%,action.ilike.Rejected%,action.ilike.Paid%,action.ilike.Requisition submitted%')
        .order('created_at', { ascending: false })
        .limit(30)

      pending = (pendingItems ?? []).map((item) => {
        const req = (item.requisitions as unknown) as { req_number: string; dept: string; profiles: { name: string } } | null
        return {
          id: item.id,
          description: item.description,
          amount: Number(item.amount),
          created_at: item.created_at,
          req_number: req?.req_number ?? '',
          dept: req?.dept ?? '',
          requester: req?.profiles?.name ?? '',
        }
      })

      feed = recentLog ?? []
      totalPending = pending.reduce((s, i) => s + i.amount, 0)
    }
  } catch {
    // No user / RLS blocked — viewer will show passcode gate, data will be empty
  }

  return (
    <ViewerClient
      pending={pending}
      feed={feed}
      totalPending={totalPending}
    />
  )
}
