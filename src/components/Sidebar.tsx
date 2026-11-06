'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  userRole: string
  pendingCount: number
  unreadNotifCount: number
  payCount: number
  reconCount: number
  moduleVisibility: Record<string, string[]>
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ userRole, pendingCount, unreadNotifCount, payCount, reconCount, moduleVisibility, isOpen, onClose }: Props) {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href

  function handleNavClick() {
    onClose?.()
  }

  const can = (module: string) =>
    userRole === 'admin' || (moduleVisibility[module]?.includes(userRole) ?? false)

  return (
    <aside className="fd-sidebar">
      <div className="fd-sidebar__brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fd-sidebar__logo" src="/logo-mark.jpg" alt="" />
        <div>
          <div className="fd-sidebar__word">TBC OutOfZion</div>
          <div className="fd-sidebar__sub">Finance Desk</div>
        </div>
      </div>

      <nav className="fd-sidebar__nav" aria-label="Main">
        {/* Overview */}
        {['finance', 'chima', 'dg', 'pastor', 'admin'].includes(userRole) && (
          <div className="fd-sidebar__group">
            <div className="fd-sidebar__glabel">Overview</div>
            <NavItem href="/dashboard" label="Dashboard" active={isActive('/dashboard')} icon={HomeIcon} onClick={handleNavClick} />
          </div>
        )}

        {/* Requisitions */}
        <div className="fd-sidebar__group">
          <div className="fd-sidebar__glabel">Requisitions</div>
          <NavItem href="/dashboard/new-req" label="New requisition" active={isActive('/dashboard/new-req')} icon={PlusIcon} onClick={handleNavClick} />
          <NavItem href="/dashboard/my-req" label="My requisitions" active={isActive('/dashboard/my-req')} icon={DocIcon} onClick={handleNavClick} />
          {can('retirement') && (
            <NavItem href="/dashboard/retirement" label="Fund retirement" active={isActive('/dashboard/retirement')} icon={RetireIcon} onClick={handleNavClick} />
          )}
        </div>

        {/* Finance */}
        {(can('approve') || can('payments') || can('reconciliation')) && (
          <div className="fd-sidebar__group">
            <div className="fd-sidebar__glabel">Finance</div>
            {can('approve') && (
              <NavItem href="/dashboard/approve" label="Approval queue" active={isActive('/dashboard/approve')} icon={InboxIcon} count={pendingCount} onClick={handleNavClick} />
            )}
            {can('payments') && (
              <NavItem href="/dashboard/payments" label="Payments" active={isActive('/dashboard/payments')} icon={WalletIcon} count={payCount} onClick={handleNavClick} />
            )}
            {can('reconciliation') && (
              <NavItem href="/dashboard/reconciliation" label="Reconciliation" active={isActive('/dashboard/reconciliation')} icon={ReconcileIcon} count={reconCount} onClick={handleNavClick} />
            )}
          </div>
        )}

        {/* Administration */}
        <div className="fd-sidebar__group">
          <div className="fd-sidebar__glabel">Administration</div>
          {userRole === 'admin' && (
            <>
              <NavItem href="/dashboard/audit" label="Audit log" active={isActive('/dashboard/audit')} icon={ClockIcon} onClick={handleNavClick} />
              <NavItem href="/dashboard/admin" label="Users and roles" active={isActive('/dashboard/admin')} icon={UsersIcon} onClick={handleNavClick} />
              <NavItem href="/dashboard/settings" label="Settings" active={isActive('/dashboard/settings')} icon={SettingsIcon} onClick={handleNavClick} />
            </>
          )}
          <NavItem href="/dashboard/matrix" label="Role matrix" active={isActive('/dashboard/matrix')} icon={GridIcon} onClick={handleNavClick} />
          <NavItem href="/dashboard/states" label="Line item states" active={isActive('/dashboard/states')} icon={StatesIcon} onClick={handleNavClick} />
          {(['hod', 'finance', 'admin'].includes(userRole)) && (
            <NavItem href="/dashboard/notifications" label="Notifications" active={isActive('/dashboard/notifications')} icon={BellIcon} count={unreadNotifCount} onClick={handleNavClick} />
          )}
        </div>

        {/* Shared */}
        <div className="fd-sidebar__group">
          <div className="fd-sidebar__glabel">Shared</div>
          <NavItem href="/dashboard/viewer" label="Group viewer" active={isActive('/dashboard/viewer')} icon={EyeIcon} onClick={handleNavClick} />
        </div>
      </nav>
    </aside>
  )
}

function NavItem({ href, label, active, icon: Icon, count, onClick }: {
  href: string; label: string; active: boolean
  icon: React.FC; count?: number; onClick?: () => void
}) {
  return (
    <Link href={href} className="fd-nav" aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="fd-nav__count">{count}</span>
      )}
    </Link>
  )
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    hod: 'Head of Department',
    dg: 'Director General',
    backup: 'Backup Approver',
    finance: 'Head of Finance',
    pastor: 'Senior Pastor',
    chima: 'Payment Executor',
    admin: 'Administrator',
  }
  return map[role] ?? role
}

// Lucide-style icons at 16px
const HomeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg>
const DocIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
const InboxIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
const WalletIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 12h.01"/></svg>
const EyeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
const UsersIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>
const StatesIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 15V9a3 3 0 0 1 3-3h6"/><path d="m13 4 2 2-2 2"/></svg>
const GridIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
const RetireIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l2 2 4-4"/><path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/></svg>
const BellIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const ReconcileIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 6l4-4 4 4"/><path d="M12 2v10"/></svg>
const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
