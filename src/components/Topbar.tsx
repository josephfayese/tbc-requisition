'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { logout } from '@/app/actions'
import { getInitials, fmtDate } from '@/lib/utils'
import { roleLabel } from './Sidebar'
import { useRouter } from 'next/navigation'

interface Props {
  userName: string
  userRole: string
  unreadNotifCount?: number
  onMenuToggle?: () => void
}

export default function Topbar({ userName, userRole, unreadNotifCount = 0, onMenuToggle }: Props) {
  const [isLoggingOut, startLogoutTransition] = useTransition()
  const router = useRouter()

  function handleLogout() {
    startLogoutTransition(async () => {
      await logout()
      router.push('/login')
    })
  }

  const today = fmtDate(new Date())

  return (
    <header className="fd-topbar">
      <div className="fd-topbar__left">
        {onMenuToggle && (
          <button className="fd-iconbtn fd-topbar__menu" onClick={onMenuToggle} aria-label="Toggle menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        )}
        <span className="fd-topbar__date">{today}</span>
      </div>

      <div className="fd-topbar__right">
        {/* Notification bell */}
        {['hod', 'finance', 'admin'].includes(userRole) && (
          <Link href="/dashboard/notifications" className="fd-iconbtn" title="Notifications" style={{ textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadNotifCount > 0 && (
              <span className="fd-iconbtn__count">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
            )}
          </Link>
        )}

        {/* User info */}
        <div className="fd-topbar__user">
          <span className="fd-topbar__name">{userName}</span>
          <span className="fd-topbar__role">{roleLabel(userRole)}</span>
        </div>

        {/* Avatar */}
        <div className="fd-avatar" style={{ width: 34, height: 34, fontSize: 12 }} title={userName}>
          {getInitials(userName || 'User')}
        </div>

        {/* Sign out */}
        <button
          className="fd-iconbtn"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sign out"
          style={{ opacity: isLoggingOut ? 0.5 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
