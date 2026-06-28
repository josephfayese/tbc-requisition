import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: visSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'module_visibility')
    .single()

  const defaultVisibility: Record<string, string[]> = {
    retirement: ['hod', 'dg', 'backup', 'finance', 'pastor', 'chima', 'admin'],
    reconciliation: ['finance', 'chima', 'admin'],
    payments: ['chima', 'admin'],
    approve: ['dg', 'finance', 'pastor', 'chima', 'admin'],
  }

  let moduleVisibility = defaultVisibility
  if (visSetting?.value) {
    try { moduleVisibility = JSON.parse(visSetting.value) } catch { /* use default */ }
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Settings</div>
          <h1>Module Visibility</h1>
          <p className="masthead-sub">Control which roles can see each module in the sidebar.</p>
        </div>
      </div>
      <SettingsClient moduleVisibility={moduleVisibility} />
    </div>
  )
}
