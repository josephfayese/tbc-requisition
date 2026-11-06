'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword, logout } from '@/app/actions'
import { useToast } from '@/components/Toast'

const checks = (pw: string) => [
  { label: 'At least 8 characters', ok: pw.length >= 8 },
  { label: 'Contains a letter', ok: /[a-zA-Z]/.test(pw) },
  { label: 'Contains a number', ok: /\d/.test(pw) },
]

export default function ChangePasswordPage() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const ch = checks(pw)
  const allPassed = ch.every(c => c.ok)
  const canSubmit = allPassed && pw === pw2 && !isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (pw !== pw2) { setError('The two passwords do not match.'); return }
    setError('')
    startTransition(async () => {
      const result = await changePassword(pw)
      if (result.error) { setError(result.error) }
      else { toast('Password updated — welcome!', 'success'); router.push('/dashboard'); router.refresh() }
    })
  }

  async function handleSignOut() {
    await logout()
    router.push('/login')
  }

  return (
    <div className="kit-auth">
      {/* Left panel — forest (no quote) */}
      <div className="kit-auth__panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.jpg" alt="" style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff' }} />
          <span style={{ font: '700 19px/1.2 var(--font-display)' }}>TBC OutOfZion · Finance</span>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* Right panel — form */}
      <div className="kit-auth__form">
        <div className="kit-auth__inner">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            <div style={{ marginBottom: 4 }}>
              <h1 style={{ margin: 0, font: '700 32px/38px var(--font-display)', letterSpacing: '-0.01em' }}>Choose a new password</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
                Replace the temporary password from your administrator before you continue.
              </p>
            </div>

            <div className="fd-field">
              <label className="fd-field__label">New password</label>
              <input
                className="fd-input"
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError('') }}
                autoFocus
                autoComplete="new-password"
              />
            </div>

            {pw.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '-6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                {ch.map(c => (
                  <li key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: c.ok ? 'var(--approved-fg)' : 'var(--text-muted)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      {c.ok && <polyline points="9 12 11.5 14.5 16 10"/>}
                    </svg>
                    {c.label}
                  </li>
                ))}
              </ul>
            )}

            <div className="fd-field">
              <label className="fd-field__label">Confirm new password</label>
              <input
                className="fd-input"
                type="password"
                value={pw2}
                onChange={(e) => { setPw2(e.target.value); setError('') }}
                autoComplete="new-password"
                aria-invalid={error ? 'true' : undefined}
              />
              {error && <span className="fd-field__error">{error}</span>}
              {!error && pw2.length > 0 && pw !== pw2 && (
                <span className="fd-field__error">The two passwords do not match.</span>
              )}
            </div>

            <button type="submit" className="fd-btn fd-btn--primary fd-btn--block" disabled={!canSubmit}>
              {isPending ? 'Saving...' : 'Save password'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button type="button" className="fd-btn fd-btn--ghost fd-btn--sm" onClick={handleSignOut}>Sign out</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
