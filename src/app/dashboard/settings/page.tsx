import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: visSetting },
    { data: passcodeSetting },
    { data: openSetting },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'module_visibility').single(),
    supabase.from('settings').select('value').eq('key', 'viewer_passcode').single(),
    supabase.from('settings').select('value').eq('key', 'viewer_open').single(),
  ])

  const defaultVisibility: Record<string, string[]> = {
    retirement: ['hod', 'dg', 'backup', 'finance', 'pastor', 'chima', 'admin', 'trainer'],
    reconciliation: ['finance', 'chima', 'admin'],
    payments: ['chima', 'admin'],
    approve: ['dg', 'finance', 'pastor', 'chima', 'admin', 'trainer'],
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
          <h1>App <em>Settings</em></h1>
          <p className="masthead-sub">Control module access and group dashboard visibility.</p>
        </div>
      </div>
      <SettingsClient
        moduleVisibility={moduleVisibility}
        viewerPasscode={passcodeSetting?.value ?? 'ZION26'}
        viewerOpen={openSetting?.value === 'true'}
      />
    </div>
  )
}
