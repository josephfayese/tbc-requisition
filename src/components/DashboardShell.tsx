'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import { logout } from '@/app/actions'

interface Props {
  userName: string
  userRole: string
  pendingCount: number
  unreadNotifCount: number
  payCount: number
  reconCount: number
  moduleVisibility: Record<string, string[]>
  children: React.ReactNode
}

const IDLE_TIMEOUT = 15 * 60 * 1000  // 15 minutes
const IDLE_WARNING = 60 * 1000       // show warning 60s before timeout

export default function DashboardShell({
  userName, userRole,
  pendingCount, unreadNotifCount, payCount, reconCount,
  moduleVisibility, children,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleCountdown, setIdleCountdown] = useState(60)
  const lastActivity = useRef(Date.now())
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const resetTimers = useCallback(() => {
    lastActivity.current = Date.now()
    setShowIdleWarning(false)
    setIdleCountdown(60)

    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)

    warningTimer.current = setTimeout(() => {
      setShowIdleWarning(true)
      setIdleCountdown(60)
    }, IDLE_TIMEOUT - IDLE_WARNING)

    logoutTimer.current = setTimeout(async () => {
      await logout()
      router.push('/login?notice=idle')
    }, IDLE_TIMEOUT)
  }, [router])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const handler = () => {
      if (!showIdleWarning) resetTimers()
    }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetTimers()
    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      if (warningTimer.current) clearTimeout(warningTimer.current)
      if (logoutTimer.current) clearTimeout(logoutTimer.current)
    }
  }, [resetTimers, showIdleWarning])

  // Countdown ticker for the warning dialog
  useEffect(() => {
    if (!showIdleWarning) return
    const interval = setInterval(() => {
      setIdleCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showIdleWarning])

  return (
    <div className="kit-shell" data-nav={menuOpen ? 'open' : undefined}>
      <div className="kit-side">
        <Sidebar
          userRole={userRole}
          pendingCount={pendingCount}
          unreadNotifCount={unreadNotifCount}
          payCount={payCount}
          reconCount={reconCount}
          moduleVisibility={moduleVisibility}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      </div>
      {menuOpen && (
        <div className="kit-scrim" onClick={() => setMenuOpen(false)} style={{ display: 'block' }} />
      )}
      <div className="kit-main">
        <Topbar
          userName={userName}
          userRole={userRole}
          unreadNotifCount={unreadNotifCount}
          onMenuToggle={() => setMenuOpen(o => !o)}
        />
        <main className="kit-content">
          {children}
        </main>
      </div>

      {/* Idle timeout warning */}
      {showIdleWarning && (
        <div className="fd-scrim" style={{ zIndex: 200 }}>
          <div className="fd-dialog">
            <h2 className="fd-dialog__title">Still there?</h2>
            <div className="fd-dialog__body">
              You will be signed out in {idleCountdown} second{idleCountdown !== 1 ? 's' : ''} due to inactivity.
            </div>
            <div className="fd-dialog__actions">
              <button className="fd-btn fd-btn--primary" onClick={resetTimers}>
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
