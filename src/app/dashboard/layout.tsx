import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Allow unauthenticated access to the viewer page (it has its own passcode gate)
  const headersList = await headers()
  const nextUrl = headersList.get('x-invoke-path') ?? ''
  // We can't easily get the path in a layout, so we check user and skip layout for viewer
  // The viewer page handles the passcode gate itself. If no user, redirect to login
  // EXCEPT for viewer which the middleware already allows through.
  // The layout itself must still render for viewer — we just skip the profile requirement.
  if (!user) {
    // Check if we're on the viewer path — if so, render children without the full shell
    // Since layout can't read its children's pathname easily, we use a lighter approach:
    // The middleware lets /dashboard/viewer through, but if the layout redirects,
    // the viewer would break. So we render a simplified shell for unauthenticated viewer users.
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="topbar">
          <div className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.jpg" alt="Out of Zion" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>TBC OutOfZion</div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.05em' }}>Finance Requisitions</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <a href="/login" style={{ fontSize: 13, color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
        </div>
        <div style={{ padding: '32px 32px' }}>{children}</div>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Counts for sidebar badges + module visibility setting — fetch in parallel
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
    retirement: ['hod', 'dg', 'backup', 'finance', 'pastor', 'chima', 'admin', 'trainer'],
    reconciliation: ['finance', 'chima', 'admin'],
    payments: ['chima', 'admin'],
    approve: ['dg', 'finance', 'pastor', 'chima', 'admin', 'trainer'],
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
