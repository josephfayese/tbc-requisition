import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Users & Roles' }
import { fmtDate } from '@/lib/utils'
import InviteUserForm from './InviteUserForm'
import UserRow from './UserRow'

const ROLE_LABELS: Record<string, string> = {
  hod: 'Head of Department',
  dg: 'Director General',
  backup: 'Backup Approver',
  finance: 'Head of Finance',
  pastor: 'Senior Pastor',
  chima: 'Payment Executor',
  admin: 'Administrator',
}

export default async function AdminPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const isAdmin = currentProfile?.role === 'admin'
  if (!isAdmin) redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email, role, dept, created_at')
    .order('created_at', { ascending: true })

  const users = profiles ?? []

  const { data: depts } = await admin.from('departments').select('name').order('name')

  return (
    <div>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Users &amp; roles</h1>
          <p className="fd-pagehead__sub">{users.length} registered user{users.length !== 1 ? 's' : ''}. Invite new members and manage roles.</p>
        </div>
      </div>

      {/* Users table */}
      <div className="fd-card fd-card--flush" style={{ marginBottom: 28 }}>
        <div className="fd-card__head">
          <span className="fd-card__title">Team members</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{users.length} total</span>
        </div>
        <div className="fd-table-wrap">
          <table className="fd-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={{ ...u, joined: fmtDate(u.created_at) }}
                  departments={(depts ?? []).map((d) => d.name)}
                  currentUserId={user!.id}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite form */}
      {isAdmin && (
        <div className="fd-card" style={{ padding: 28 }}>
          <div className="fd-card__title" style={{ marginBottom: 20 }}>Invite new user</div>
          <InviteUserForm departments={(depts ?? []).map((d) => d.name)} />
        </div>
      )}

      {/* Role reference */}
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 32, marginBottom: 12 }}>Role descriptions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="fd-card" style={{ padding: '14px 16px' }}>
            <RoleBadge role={role} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    hod: 'fd-badge--retired',
    dg: 'fd-badge--paid',
    backup: 'fd-badge--pending',
    finance: 'fd-badge--paid',
    pastor: 'fd-badge--approved',
    chima: 'fd-badge--approved',
    admin: 'fd-badge--rejected',
  }
  return (
    <span className={`fd-badge ${map[role] ?? 'fd-badge--retired'}`} style={{ textTransform: 'capitalize' }}>
      <span className="fd-badge__dot" />{role}
    </span>
  )
}
