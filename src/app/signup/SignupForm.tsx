'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signUpUser } from '@/app/actions'
import { useToast } from '@/components/Toast'

const ROLES = [
  { value: 'hod', label: 'Head of Department (HoD)' },
  { value: 'dg', label: 'Director General (DG)' },
  { value: 'finance', label: 'Head of Finance' },
  { value: 'pastor', label: 'Senior Pastor' },
  { value: 'chima', label: 'Payment Executor' },
  { value: 'admin', label: 'Admin' },
]

export default function SignupForm({ departments }: { departments: string[] }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('')
  const [dept, setDept] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const passwordsMatch = password === confirm
  const canSubmit =
    name.trim() &&
    email.trim() &&
    password.length >= 8 &&
    passwordsMatch &&
    role &&
    (role !== 'hod' || dept) &&
    !isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    startTransition(async () => {
      const result = await signUpUser(name, email, password, role, role === 'hod' ? dept : null)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast('Account created! Please sign in.', 'success')
        router.push('/login')
      }
    })
  }

  return (
    <div className="card" style={{ padding: 28 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Full name</label>
          <input className="li-input" type="text" placeholder="e.g. Florence Ndika" value={name} onChange={(e) => setName(e.target.value)} required autoFocus autoComplete="name" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Email address</label>
          <input className="li-input" type="email" placeholder="you@tbcooz.org" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Role</label>
          <select className="li-input" value={role} onChange={(e) => { setRole(e.target.value); setDept('') }} required>
            <option value="">Select your role…</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        {role === 'hod' && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Department</label>
            <select className="li-input" value={dept} onChange={(e) => setDept(e.target.value)} required>
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Password</label>
          <input className="li-input" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          {password.length > 0 && password.length < 8 && (
            <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 5 }}>Must be at least 8 characters</div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Confirm password</label>
          <input className="li-input" type="password" placeholder="Repeat your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          {confirm.length > 0 && !passwordsMatch && (
            <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 5 }}>Passwords do not match</div>
          )}
          {confirm.length > 0 && passwordsMatch && password.length >= 8 && (
            <div style={{ fontSize: 11, color: 'var(--pos)', marginTop: 5 }}>✓ Passwords match</div>
          )}
        </div>
        <button type="submit" className="pri-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: canSubmit ? 1 : 0.5 }} disabled={!canSubmit}>
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
