import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markNotificationsRead } from '@/app/actions'
import { fmtDate } from '@/lib/utils'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Notifications are for HoDs; others don't have them but won't break
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = notifications ?? []

  // Mark all as read (fire and forget — page load counts as reading)
  if (items.some((n) => !n.is_read)) {
    await markNotificationsRead()
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="masthead" style={{ marginBottom: 24 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Alerts</div>
          <h1>My <em>Notifications</em></h1>
          <p className="masthead-sub">
            Approval and rejection alerts for your requisitions.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>No notifications yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
            You'll be notified here when your items are approved or rejected.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n) => {
            const isApproved = n.message.toLowerCase().includes('approved')
            const accent = isApproved ? 'var(--pos)' : 'var(--neg)'
            const accentSoft = isApproved ? 'var(--pos-soft)' : 'rgba(220,38,38,0.07)'
            return (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  borderLeft: `3px solid ${accent}`,
                  background: n.is_read ? undefined : accentSoft,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'var(--line-2)' : accent, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 5 }}>{fmtDate(n.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
