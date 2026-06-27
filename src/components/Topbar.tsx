'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions'
import { getInitials } from '@/lib/utils'
import { useToast } from './Toast'
import { useRouter } from 'next/navigation'

interface Props {
  userName: string
  userRole: string
  unreadNotifCount?: number
  onMenuToggle?: () => void
  menuOpen?: boolean
}

export default function Topbar({ userName, userRole, unreadNotifCount = 0, onMenuToggle, menuOpen }: Props) {
  const [isLoggingOut, startLogoutTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function handleLogout() {
    startLogoutTransition(async () => {
      await logout()
      router.push('/login')
    })
  }

  return (
    <header className="topbar">
      {/* Hamburger — mobile only */}
      {onMenuToggle && (
        <button className="hamburger" onClick={onMenuToggle} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ opacity: menuOpen ? 0 : 1 }} />
          <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      )}
      <div className="brand-mark">
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--brand-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 2 L7.5 13 M2 7.5 L13 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>TBC OutOfZion</div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.05em' }}>Finance Requisitions</div>
        </div>
      </div>

      <div className="topbar-spacer" />

      {/* Notification bell — HoD only */}
      {userRole === 'hod' && (
        <Link
          href="/dashboard/notifications"
          title="Notifications"
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-3)', textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadNotifCount > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--neg)', color: '#fff',
              fontSize: 9, fontWeight: 700,
              width: 16, height: 16, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}>
              {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
            </span>
          )}
        </Link>
      )}

      {/* Avatar + Sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="avatar" title={userName}>
          {getInitials(userName || 'User')}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 7, border: '1px solid var(--line)',
            background: 'transparent', cursor: 'pointer', fontSize: 12,
            fontWeight: 600, color: 'var(--ink-3)',
            opacity: isLoggingOut ? 0.5 : 1,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="signout-label">{isLoggingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </div>
    </header>
  )
}
