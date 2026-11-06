'use client'

import { useState, useTransition } from 'react'
import { updateUser, adminResetPassword } from '@/app/actions'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'

const ROLES = [
  { value: 'hod', label: 'HoD' },
  { value: 'dg', label: 'DG' },
  { value: 'backup', label: 'Backup' },
  { value: 'finance', label: 'Finance' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'chima', label: 'Payment Executor' },
  { value: 'admin', label: 'Admin' },
]

interface User {
  id: string
  name: string
  email: string
  role: string
  dept: string | null
  joined: string
}

export default function UserRow({
  user,
  departments,
  currentUserId,
}: {
  user: User
  departments: string[]
  currentUserId: string
}) {
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState(user.role)
  const [dept, setDept] = useState(user.dept ?? '')
  const [isPending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const isSelf = user.id === currentUserId

  function handleSave() {
    startTransition(async () => {
      const result = await updateUser(user.id, role, dept || null)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast('User updated', 'success')
        setEditing(false)
        router.refresh()
      }
    })
  }

  function handleReset() {
    if (!confirm(`Reset password for ${user.name}? They will need to change it on next login.`)) return
    startTransition(async () => {
      const result = await adminResetPassword(user.id)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        setTempPassword(result.tempPassword ?? null)
      }
    })
  }

  function handleCancel() {
    setRole(user.role)
    setDept(user.dept ?? '')
    setEditing(false)
  }

  const roleBadgeMap: Record<string, string> = {
    hod: 'fd-badge--retired',
    dg: 'fd-badge--paid',
    backup: 'fd-badge--pending',
    finance: 'fd-badge--paid',
    pastor: 'fd-badge--approved',
    chima: 'fd-badge--approved',
    admin: 'fd-badge--rejected',
  }

  return (
    <>
      <tr>
        <td style={{ fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="fd-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
              {user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            {user.name}
          </div>
        </td>
        <td className="fd-muted" style={{ fontSize: 13 }}>{user.email}</td>
        <td>
          {editing ? (
            <select className="fd-input fd-select" value={role} onChange={(e) => setRole(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', minWidth: 100 }}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          ) : (
            <span className={`fd-badge ${roleBadgeMap[user.role] ?? 'fd-badge--retired'}`} style={{ textTransform: 'capitalize' }}>
              <span className="fd-badge__dot" />{user.role}
            </span>
          )}
        </td>
        <td className="fd-muted">
          {editing ? (
            <select className="fd-input fd-select" value={dept} onChange={(e) => setDept(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', minWidth: 100 }}>
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            user.dept ?? '—'
          )}
        </td>
        <td className="fd-muted" style={{ fontSize: 12 }}>{user.joined}</td>
        <td style={{ whiteSpace: 'nowrap' }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fd-btn fd-btn--primary fd-btn--sm" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button className="fd-btn fd-btn--secondary fd-btn--sm" onClick={handleCancel} disabled={isPending}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="fd-btn fd-btn--secondary fd-btn--sm" onClick={() => setEditing(true)} title="Edit role & department">
                Edit
              </button>
              {!isSelf && (
                <button className="fd-btn fd-btn--secondary fd-btn--sm" onClick={handleReset} disabled={isPending} title="Reset password">
                  {isPending ? '...' : 'Reset PW'}
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
      {tempPassword && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <div className="fd-notice fd-notice--success" style={{ margin: '0 16px 12px', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--approved-fg)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Password reset for {user.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 10 }}>
                Share this temporary password with the user. They must change it on next login.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <code style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-title)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 7, padding: '8px 14px' }}>
                  {tempPassword}
                </code>
                <button
                  className="fd-btn fd-btn--secondary fd-btn--sm"
                  onClick={() => { navigator.clipboard.writeText(tempPassword); toast('Copied!', 'success') }}
                >
                  Copy
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                This password will not be shown again. Store it safely before dismissing.
              </div>
              <button
                onClick={() => setTempPassword(null)}
                style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Dismiss
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
