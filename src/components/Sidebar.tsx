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

  // Admin always sees everything; other roles check visibility settings
  const can = (module: string) =>
    userRole === 'admin' || (moduleVisibility[module]?.includes(userRole) ?? false)

  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.jpg" alt="Out of Zion" width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <div>
          <div className="sidebar-name">TBC Finance</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>{roleLabel(userRole)}</div>
        </div>
      </div>

      {/* Dashboard — finance team, DG, and Admin only */}
      {['finance', 'chima', 'dg', 'admin'].includes(userRole) && (
        <>
          <div className="nav-group-label">Overview</div>
          <NavLink href="/dashboard" label="Dashboard" active={isActive('/dashboard')} icon={HomeIcon} onClick={handleNavClick} />
        </>
      )}

      {/* Requester — all roles can submit */}
      <div className="nav-group-label">Requester · HoD</div>
      <NavLink href="/dashboard/new-req" label="New requisition" active={isActive('/dashboard/new-req')} icon={PlusIcon} onClick={handleNavClick} />
      <NavLink href="/dashboard/my-req" label="My requisitions" active={isActive('/dashboard/my-req')} icon={DocIcon} onClick={handleNavClick} />
      {can('retirement') && (
        <NavLink href="/dashboard/retirement" label="Fund retirement" active={isActive('/dashboard/retirement')} icon={RetireIcon} onClick={handleNavClick} />
      )}
      {(userRole === 'hod' || userRole === 'admin') && (
        <NavLink
          href="/dashboard/notifications"
          label="Notifications"
          active={isActive('/dashboard/notifications')}
          icon={BellIcon}
          badge={unreadNotifCount}
          badgeBg="var(--neg-soft, rgba(220,38,38,0.1))"
          badgeColor="var(--neg)"
          onClick={handleNavClick}
        />
      )}

      {/* Deliberation queue */}
      {can('approve') && (
        <>
          <div className="nav-group-label">Deliberation</div>
          <NavLink
            href="/dashboard/approve"
            label="Requisition queue"
            active={isActive('/dashboard/approve')}
            icon={InboxIcon}
            badge={pendingCount}
            badgeBg="var(--warn-soft)"
            badgeColor="var(--warn)"
            onClick={handleNavClick}
          />
        </>
      )}

      {/* Payment queue + reconciliation */}
      {(can('payments') || can('reconciliation')) && (
        <>
          <div className="nav-group-label">Payments · Finance</div>
          {can('payments') && (
            <NavLink href="/dashboard/payments" label="Payment queue" active={isActive('/dashboard/payments')} icon={WalletIcon} badge={payCount} badgeBg="var(--brand-soft)" badgeColor="var(--brand)" onClick={handleNavClick} />
          )}
          {can('reconciliation') && (
            <NavLink href="/dashboard/reconciliation" label="Reconciliation" active={isActive('/dashboard/reconciliation')} icon={ReconcileIcon} badge={reconCount} badgeBg="var(--warn-soft)" badgeColor="var(--warn)" onClick={handleNavClick} />
          )}
        </>
      )}

      {/* Shared */}
      <div className="nav-group-label">Shared</div>
      <NavLink href="/dashboard/viewer" label="Group dashboard" active={isActive('/dashboard/viewer')} icon={EyeIcon} onClick={handleNavClick} />

      {/* Admin */}
      {userRole === 'admin' && (
        <>
          <div className="nav-group-label">Admin · Audit</div>
          <NavLink href="/dashboard/admin" label="Users &amp; roles" active={isActive('/dashboard/admin')} icon={UsersIcon} onClick={handleNavClick} />
          <NavLink href="/dashboard/settings" label="Settings" active={isActive('/dashboard/settings')} icon={SettingsIcon} onClick={handleNavClick} />
          <NavLink href="/dashboard/audit" label="Audit &amp; history" active={isActive('/dashboard/audit')} icon={ClockIcon} onClick={handleNavClick} />
        </>
      )}

      {/* Reference */}
      <div className="nav-group-label">Reference</div>
      <NavLink href="/dashboard/states" label="Status guide" active={isActive('/dashboard/states')} icon={StatesIcon} onClick={handleNavClick} />
      <NavLink href="/dashboard/matrix" label="Who does what" active={isActive('/dashboard/matrix')} icon={GridIcon} onClick={handleNavClick} />

      <div className="sidebar-foot">
        <div style={{ fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.5 }}>
          Every status change is logged immutably — see Audit &amp; history.
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, label, active, icon: Icon, badge, badgeBg, badgeColor, onClick }: {
  href: string; label: string; active: boolean
  icon: React.FC; badge?: number; badgeBg?: string; badgeColor?: string; onClick?: () => void
}) {
  return (
    <Link href={href} className="nav-item" data-active={active ? 'true' : 'false'} onClick={onClick}>
      <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon />
      </span>
      <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: label }} />
      {badge !== undefined && badge > 0 && (
        <span className="badge" style={{ background: active ? 'var(--brand)' : badgeBg, color: active ? '#fff' : badgeColor }}>
          {badge}
        </span>
      )}
    </Link>
  )
}

function roleLabel(role: string): string {
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

// Icons
const HomeIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
const PlusIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5v14"/></svg>
const DocIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
const InboxIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
const WalletIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 12h.01"/></svg>
const EyeIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
const UsersIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const ClockIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>
const StatesIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 15V9a3 3 0 0 1 3-3h6"/><path d="m13 4 2 2-2 2"/></svg>
const GridIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
const RetireIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l2 2 4-4"/><path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/></svg>
const BellIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const ReconcileIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 6l4-4 4 4"/><path d="M12 2v10"/></svg>
const SettingsIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
