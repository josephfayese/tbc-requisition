import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NewReqForm from './NewReqForm'

export default async function NewReqPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: depts } = await admin.from('departments').select('name').order('name')
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('dept').eq('id', user!.id).single()

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />New Requisition</div>
          <h1>Submit a <em>Requisition</em></h1>
          <p className="masthead-sub">Add line items for each expense. All items will be reviewed by the approving authority.</p>
        </div>
      </div>
      <NewReqForm departments={(depts ?? []).map((d) => d.name)} defaultDept={profile?.dept ?? ''} />
    </div>
  )
}
