import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markNotificationsRead } from '@/app/actions'
import { fmtDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = notifications ?? []

  if (items.some((n) => !n.is_read)) {
    await markNotificationsRead()
  }

  return (
    <div>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Notifications</h1>
          <p className="fd-pagehead__sub">
            Approval and rejection alerts for your requisitions.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="fd-empty">
          <div className="fd-empty__title">No notifications yet</div>
          You'll be notified here when your items are approved or rejected.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n) => {
            const isApproved = n.message.toLowerCase().includes('approved')
            const accent = isApproved ? 'var(--approved-fg)' : 'var(--rejected-fg)'
            const accentSoft = isApproved ? 'var(--approved-bg)' : 'var(--rejected-bg)'
            return (
              <div
                key={n.id}
                className="fd-card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  borderLeft: `3px solid ${accent}`,
                  background: n.is_read ? undefined : accentSoft,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'var(--border-divider)' : accent, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-title)', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{fmtDate(n.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
