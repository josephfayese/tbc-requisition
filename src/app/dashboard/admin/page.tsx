import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fmtDate } from '@/lib/utils'
import StatusPill from '@/components/StatusPill'
import InviteUserForm from './InviteUserForm'

const ROLE_LABELS: Record<string, string> = {
  hod: 'Head of Department',
  dg: 'DG — Dr. Ngozi Eze',
  backup: 'Backup — Tunde Bakare',
  chima: 'Chima Nwosu',
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

  // Use admin client so departments load regardless of RLS policies
  const { data: depts } = await admin.from('departments').select('name').order('name')

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Administration</div>
          <h1>Users <em>&amp; Roles</em></h1>
          <p className="masthead-sub">{users.length} registered user{users.length !== 1 ? 's' : ''}. Invite new members and manage roles.</p>
        </div>
      </div>

      {/* Users table */}
      <div className="table-wrap" style={{ marginBottom: 28 }}>
        <div className="table-head">
          <span className="card-title">Team Members</span>
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{users.length} total</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="strong">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                      {u.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    {u.name}
                  </div>
                </td>
                <td style={{ color: 'var(--ink-3)', fontSize: 13 }}>{u.email}</td>
                <td>
                  <RolePill role={u.role} />
                </td>
                <td style={{ color: 'var(--ink-3)' }}>{u.dept ?? '—'}</td>
                <td style={{ color: 'var(--ink-4)', fontSize: 12 }}>{fmtDate(u.created_at)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 32 }}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite form */}
      {isAdmin && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>Invite New User</div>
          <InviteUserForm departments={(depts ?? []).map((d) => d.name)} />
        </div>
      )}

      {/* Role reference */}
      <div className="section-title" style={{ marginTop: 32 }}>
        <span className="bar" />Role Descriptions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="card" style={{ padding: '14px 16px' }}>
            <RolePill role={role} />
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    hod: 'neutral',
    dg: 'info',
    backup: 'warn',
    chima: 'pos',
    admin: 'neg',
  }
  return (
    <span className={`pill ${map[role] ?? 'neutral'}`} style={{ textTransform: 'capitalize' }}>
      {role}
    </span>
  )
}
