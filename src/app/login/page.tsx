'use client'

import { Suspense, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginWithEmail } from '@/app/actions'
import { useToast } from '@/components/Toast'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const notice = searchParams.get('notice')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setError('')
    startTransition(async () => {
      const result = await loginWithEmail(email.trim(), password)
      if (result.error) {
        setError(result.error)
        setPassword('')
      } else if (result.mustChangePassword) {
        router.push('/change-password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  return (
    <div className="kit-auth">
      {/* Left panel — forest with scripture */}
      <div className="kit-auth__panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.jpg" alt="" style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff' }} />
          <span style={{ font: '700 19px/1.2 var(--font-display)' }}>TBC OutOfZion · Finance</span>
        </div>
        <div className="kit-auth__quote" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <blockquote style={{ margin: 0, font: '600 30px/1.35 var(--font-display)', maxWidth: 560, textWrap: 'pretty' }}>
            &ldquo;Moreover it is required in stewards, that a man be found faithful.&rdquo;
          </blockquote>
          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--cream-on-forest-muted)' }}>1 Corinthians 4:2</div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="kit-auth__form">
        <div className="kit-auth__inner">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            <div style={{ marginBottom: 4 }}>
              <h1 style={{ margin: 0, font: '700 32px/38px var(--font-display)', letterSpacing: '-0.01em' }}>Welcome back</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
                Sign in with the details sent by your administrator.
              </p>
            </div>

            {notice === 'idle' && (
              <div className="fd-notice fd-notice--neutral">
                <svg className="fd-notice__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <div className="fd-notice__body">
                  <div className="fd-notice__text">You were signed out due to inactivity.</div>
                </div>
              </div>
            )}

            <div className="fd-field">
              <label className="fd-field__label">Email</label>
              <input
                className="fd-input"
                type="email"
                placeholder="name@tbcooz-finance.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="fd-field">
              <label className="fd-field__label">Password</label>
              <input
                className="fd-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                autoComplete="current-password"
                aria-invalid={error ? 'true' : undefined}
              />
              {error && <span className="fd-field__error">{error}</span>}
            </div>

            <button type="submit" className="fd-btn fd-btn--primary fd-btn--block" disabled={isPending}>
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
              No account? Ask your administrator to invite you.
            </div>
            <div style={{ textAlign: 'center', fontSize: 14 }}>
              <Link href="/dashboard/viewer">Open the group viewer</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
