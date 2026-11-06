import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/DashboardShell'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Unauthenticated viewer shell
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-canvas)' }}>
        <header className="fd-topbar">
          <div className="fd-topbar__left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.jpg" alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
              <span style={{ font: '700 17px var(--font-display)' }}>TBC OutOfZion · Finance</span>
            </div>
          </div>
          <div className="fd-topbar__right">
            <Link href="/login" className="fd-btn fd-btn--secondary fd-btn--sm" style={{ textDecoration: 'none' }}>Sign in</Link>
          </div>
        </header>
        <main className="kit-content">{children}</main>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [
    { count: pendingCount },
    { count: unreadNotifCount },
    { count: payCount },
    { count: reconCount },
    { data: visSetting },
  ] = await Promise.all([
    supabase.from('line_items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    supabase.from('line_items').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('line_items').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('settings').select('value').eq('key', 'module_visibility').single(),
  ])

  const defaultVisibility: Record<string, string[]> = {
    retirement: ['hod', 'dg', 'backup', 'finance', 'pastor', 'chima', 'admin'],
    reconciliation: ['finance', 'chima', 'admin'],
    payments: ['chima', 'admin'],
    approve: ['dg', 'finance', 'pastor', 'chima', 'admin'],
  }
  const moduleVisibility: Record<string, string[]> = visSetting?.value
    ? (() => { try { return JSON.parse(visSetting.value) } catch { return defaultVisibility } })()
    : defaultVisibility

  return (
    <DashboardShell
      userName={profile.name}
      userRole={profile.role}
      pendingCount={pendingCount ?? 0}
      unreadNotifCount={unreadNotifCount ?? 0}
      payCount={payCount ?? 0}
      reconCount={reconCount ?? 0}
      moduleVisibility={moduleVisibility}
    >
      {children}
    </DashboardShell>
  )
}
