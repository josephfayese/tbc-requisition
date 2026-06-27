'use client'

import { useState } from 'react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'

interface Props {
  userName: string
  userRole: string
  pendingCount: number
  unreadNotifCount: number
  payCount: number
  reconCount: number
  children: React.ReactNode
}

export default function DashboardShell({
  userName, userRole,
  pendingCount, unreadNotifCount, payCount, reconCount, children,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar
        userName={userName}
        userRole={userRole}
        unreadNotifCount={unreadNotifCount}
        onMenuToggle={() => setMenuOpen((o) => !o)}
        menuOpen={menuOpen}
      />
      <div className="shell">
        <Sidebar
          userRole={userRole}
          pendingCount={pendingCount}
          unreadNotifCount={unreadNotifCount}
          payCount={payCount}
          reconCount={reconCount}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
        {menuOpen && (
          <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
        )}
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
