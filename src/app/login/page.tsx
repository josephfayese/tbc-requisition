'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail } from '@/app/actions'
import { useToast } from '@/components/Toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    startTransition(async () => {
      const result = await loginWithEmail(email.trim(), password)
      if (result.error) {
        toast(result.error, 'error')
      } else if (result.mustChangePassword) {
        router.push('/change-password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--brand-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 L12 21 M3 12 L21 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', marginBottom: 6 }}>
            TBC OutOfZion
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
            Finance Requisitions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Form card */}
        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                className="li-input"
                type="email"
                placeholder="you@tbcoutotzion.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                Password
              </label>
              <input
                className="li-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="pri-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              disabled={isPending || !email.trim() || !password}
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-4)' }}>
          Don&apos;t have an account?{' '}
          <a href="/signup" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--ink-4)' }}>
          <a href="/dashboard/viewer" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>
            View group dashboard (passcode only) →
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--ink-5)' }}>
          TBC OutOfZion · Internal Finance System
        </div>
      </div>
    </div>
  )
}
