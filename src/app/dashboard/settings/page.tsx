import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { title: 'Settings' }

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
    { data: windowSetting },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'module_visibility').single(),
    supabase.from('settings').select('value').eq('key', 'viewer_passcode').single(),
    supabase.from('settings').select('value').eq('key', 'viewer_open').single(),
    supabase.from('settings').select('value').eq('key', 'submission_window_enabled').single(),
  ])

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
    <div>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Settings</h1>
          <p className="fd-pagehead__sub">Control module access and group dashboard visibility.</p>
        </div>
      </div>
      <SettingsClient
        moduleVisibility={moduleVisibility}
        viewerPasscode={passcodeSetting?.value ?? 'ZION26'}
        viewerOpen={openSetting?.value === 'true'}
        submissionWindowEnabled={windowSetting?.value !== 'false'}
      />
    </div>
  )
}
