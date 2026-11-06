const roles = ['HoD', 'DG', 'Backup', 'Chima', 'Admin', 'Group Viewer']

const permissions = [
  {
    category: 'Requisitions',
    actions: [
      { action: 'Submit new requisition', hod: true, dg: false, backup: false, chima: false, admin: true, viewer: false },
      { action: 'View own requisitions', hod: true, dg: false, backup: false, chima: false, admin: true, viewer: false },
      { action: 'Edit & resubmit rejected items', hod: true, dg: false, backup: false, chima: false, admin: true, viewer: false },
    ],
  },
  {
    category: 'Approvals',
    actions: [
      { action: 'View approval queue', hod: false, dg: true, backup: true, chima: false, admin: true, viewer: false },
      { action: 'Approve line items', hod: false, dg: true, backup: '⚠', chima: false, admin: true, viewer: false },
      { action: 'Reject line items (with reason)', hod: false, dg: true, backup: '⚠', chima: false, admin: true, viewer: false },
    ],
  },
  {
    category: 'Payments',
    actions: [
      { action: 'View payment queue', hod: false, dg: false, backup: false, chima: true, admin: true, viewer: false },
      { action: 'Mark items as paid', hod: false, dg: false, backup: false, chima: true, admin: true, viewer: false },
    ],
  },
  {
    category: 'Dashboard',
    actions: [
      { action: 'Toggle DG availability', hod: false, dg: true, backup: false, chima: false, admin: true, viewer: false },
      { action: 'View group dashboard (passcode)', hod: false, dg: false, backup: false, chima: false, admin: false, viewer: true },
    ],
  },
  {
    category: 'Administration',
    actions: [
      { action: 'View users & roles', hod: false, dg: false, backup: false, chima: false, admin: true, viewer: false },
      { action: 'Invite new users', hod: false, dg: false, backup: false, chima: false, admin: true, viewer: false },
    ],
  },
  {
    category: 'Audit',
    actions: [
      { action: 'View audit log', hod: false, dg: true, backup: true, chima: false, admin: true, viewer: false },
    ],
  },
]

type CellValue = boolean | string

function Cell({ val }: { val: CellValue }) {
  if (val === true) return <span style={{ color: 'var(--approved-fg)', fontSize: 16, fontWeight: 700 }}>✓</span>
  if (val === false) return <span style={{ color: 'var(--border-divider)', fontSize: 14 }}>—</span>
  return (
    <span title="Backup can approve/reject only when DG is marked unavailable" style={{ cursor: 'help', fontSize: 14 }}>
      {val}
    </span>
  )
}

export default function MatrixPage() {
  return (
    <div>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Role matrix</h1>
          <p className="fd-pagehead__sub">
            Permissions matrix for all roles in the finance requisition system.
            ⚠ = conditional permission.
          </p>
        </div>
      </div>

      <div className="fd-table-wrap">
        <table className="fd-table">
          <thead>
            <tr>
              <th style={{ minWidth: 240 }}>Permission</th>
              {roles.map((r) => (
                <th key={r} style={{ textAlign: 'center', minWidth: 80 }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((group) => (
              <>
                <tr key={`group-${group.category}`}>
                  <td
                    colSpan={roles.length + 1}
                    style={{
                      background: 'var(--surface-canvas)',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      padding: '8px 16px',
                    }}
                  >
                    {group.category}
                  </td>
                </tr>
                {group.actions.map((perm) => (
                  <tr key={perm.action}>
                    <td style={{ color: 'var(--text-body)', fontWeight: 500 }}>{perm.action}</td>
                    <td style={{ textAlign: 'center' }}><Cell val={perm.hod} /></td>
                    <td style={{ textAlign: 'center' }}><Cell val={perm.dg} /></td>
                    <td style={{ textAlign: 'center' }}><Cell val={perm.backup} /></td>
                    <td style={{ textAlign: 'center' }}><Cell val={perm.chima} /></td>
                    <td style={{ textAlign: 'center' }}><Cell val={perm.admin} /></td>
                    <td style={{ textAlign: 'center' }}><Cell val={perm.viewer} /></td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="fd-card" style={{ padding: 20, marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--approved-fg)', fontWeight: 700, fontSize: 16 }}>✓</span>
          <span style={{ color: 'var(--text-secondary)' }}>Full permission</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--border-divider)', fontSize: 14 }}>—</span>
          <span style={{ color: 'var(--text-secondary)' }}>No access</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ color: 'var(--text-secondary)' }}>Conditional: Backup can approve/reject only when DG is marked unavailable</span>
        </div>
      </div>

      {/* Role descriptions */}
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 28, marginBottom: 12 }}>Role descriptions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {[
          { role: 'HoD', label: 'Head of Department', desc: 'Submits requisitions for their department. Can resubmit rejected items after editing.', color: 'var(--text-secondary)' },
          { role: 'DG', label: 'Dr. Ngozi Eze', desc: 'Primary approver. Can approve or reject any pending line item. Can toggle their own availability.', color: 'var(--paid-fg)' },
          { role: 'Backup', label: 'Tunde Bakare', desc: 'Acts as approver ONLY when DG is marked unavailable. Same approval powers during that window.', color: 'var(--pending-fg)' },
          { role: 'Chima', label: 'Chima Nwosu', desc: 'Payment executor. Marks approved line items as paid after executing bank transfer.', color: 'var(--approved-fg)' },
          { role: 'Admin', label: 'Administrator', desc: 'Full access to all screens. Manages users, can approve/reject/pay, and toggle DG availability.', color: 'var(--rejected-fg)' },
          { role: 'Group Viewer', label: 'Passcode only', desc: 'Read-only access to the Group Dashboard via passcode (ZION26). No Supabase auth required.', color: 'var(--text-muted)' },
        ].map((r) => (
          <div key={r.role} className="fd-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: r.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{r.role}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-title)', marginBottom: 4 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
