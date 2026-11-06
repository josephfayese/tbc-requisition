import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'New Requisition' }
import { isSubmissionWindowOpen, submissionWindowMessage } from '@/lib/utils'
import NewReqForm from './NewReqForm'

export default async function NewReqPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: depts }, { data: { user } }, { data: windowSetting }] = await Promise.all([
    admin.from('departments').select('name').order('name'),
    supabase.auth.getUser(),
    supabase.from('settings').select('value').eq('key', 'submission_window_enabled').single(),
  ])
  const { data: profile } = await supabase.from('profiles').select('dept, role').eq('id', user!.id).single()

  const windowEnabled = windowSetting?.value !== 'false' // defaults to enabled
  const windowOpen = profile?.role === 'admin' || !windowEnabled || isSubmissionWindowOpen()

  return (
    <>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Submit a requisition</h1>
          <p className="fd-pagehead__sub">Add line items for each expense. All items will be reviewed by the approving authority. Submissions are open Monday to Wednesday.</p>
        </div>
      </div>
      {windowOpen ? (
        <NewReqForm departments={(depts ?? []).map((d) => d.name)} defaultDept={profile?.dept ?? ''} />
      ) : (
        <div className="fd-empty">
          <div className="fd-empty__title">Submission window closed</div>
          <p style={{ margin: 0 }}>{submissionWindowMessage()}</p>
        </div>
      )}
    </>
  )
}
