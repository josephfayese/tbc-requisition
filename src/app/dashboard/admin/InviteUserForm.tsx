'use client'

import { useState, useTransition } from 'react'
import { inviteUser } from '@/app/actions'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'

const ROLES = [
  { value: 'hod', label: 'Head of Department (HoD)' },
  { value: 'dg', label: 'Director General (DG)' },
  { value: 'finance', label: 'Head of Finance' },
  { value: 'pastor', label: 'Senior Pastor' },
  { value: 'chima', label: 'Payment Executor' },
  { value: 'admin', label: 'Administrator' },
]

export default function InviteUserForm({ departments }: { departments: string[] }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('hod')
  const [dept, setDept] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await inviteUser(name, email, role, dept || undefined)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        setTempPassword(result.tempPassword ?? null)
        setCreatedName(name)
        setName('')
        setEmail('')
        setRole('hod')
        setDept('')
        router.refresh()
      }
    })
  }

  return (
    <>
      {tempPassword && (
        <div className="fd-notice fd-notice--success" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--approved-fg)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Account created for {createdName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 10 }}>
            Share this temporary password with the user. They must change it on first login.
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
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="fd-field">
          <label className="fd-field__label">Full name *</label>
          <input className="fd-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Florence Adeyemi" required />
        </div>
        <div className="fd-field">
          <label className="fd-field__label">Email *</label>
          <input className="fd-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="florence@tbcoutotzion.org" required />
        </div>
        <div className="fd-field">
          <label className="fd-field__label">Role *</label>
          <select className="fd-input fd-select" value={role} onChange={(e) => setRole(e.target.value)} required>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="fd-field">
          <label className="fd-field__label">Department</label>
          <select className="fd-input fd-select" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">— None —</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
          <button
            type="submit"
            className="fd-btn fd-btn--primary"
            disabled={isPending || !name.trim() || !email.trim()}
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </div>
      </form>
    </>
  )
}
