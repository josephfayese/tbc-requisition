import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSubmissionWindowOpen, submissionWindowMessage } from '@/lib/utils'
import NewReqForm from './NewReqForm'

export default async function NewReqPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: depts } = await admin.from('departments').select('name').order('name')
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('dept, role').eq('id', user!.id).single()

  const windowOpen = profile?.role === 'admin' || isSubmissionWindowOpen()

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />New Requisition</div>
          <h1>Submit a <em>Requisition</em></h1>
          <p className="masthead-sub">Add line items for each expense. All items will be reviewed by the approving authority. Submissions are open Monday to Wednesday.</p>
        </div>
      </div>
      {windowOpen ? (
        <NewReqForm departments={(depts ?? []).map((d) => d.name)} defaultDept={profile?.dept ?? ''} />
      ) : (
        <div className="card" style={{ padding: '28px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗓️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Submission window closed</div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>{submissionWindowMessage()}</p>
        </div>
      )}
    </div>
  )
}
