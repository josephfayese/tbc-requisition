'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/app/actions'
import { useToast } from '@/components/Toast'

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const canSubmit = newPassword.length >= 8 && newPassword === confirm && !isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (newPassword !== confirm) {
      toast('Passwords do not match', 'error')
      return
    }
    startTransition(async () => {
      const result = await changePassword(newPassword)
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast('Password updated — welcome!', 'success')
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.jpg" alt="Out of Zion — The Baptizing Church" style={{ width: 220, maxWidth: '80%', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', marginBottom: 6 }}>
            TBC OutOfZion
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
            Set your password
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.5 }}>
            This is your first login. Choose a personal password to secure your account.
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                New password
              </label>
              <input
                className="li-input"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 5 }}>
                  Must be at least 8 characters
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                Confirm password
              </label>
              <input
                className="li-input"
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {confirm.length > 0 && newPassword !== confirm && (
                <div style={{ fontSize: 11, color: 'var(--neg)', marginTop: 5 }}>
                  Passwords do not match
                </div>
              )}
              {confirm.length > 0 && newPassword === confirm && newPassword.length >= 8 && (
                <div style={{ fontSize: 11, color: 'var(--pos)', marginTop: 5 }}>
                  ✓ Passwords match
                </div>
              )}
            </div>

            <button
              type="submit"
              className="pri-btn"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, opacity: canSubmit ? 1 : 0.5 }}
              disabled={!canSubmit}
            >
              {isPending ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--ink-5)' }}>
          TBC OutOfZion · Internal Finance System
        </div>
      </div>
    </div>
  )
}
