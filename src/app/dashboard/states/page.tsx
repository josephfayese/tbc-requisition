import LineItemStatesFlow from '@/components/LineItemStatesFlow'

const transitions = [
  { from: 'pending', to: 'approved', actor: 'DG / Backup', condition: 'Item reviewed and approved', trigger: 'Approve button in Approval Queue' },
  { from: 'pending', to: 'rejected', actor: 'DG / Backup', condition: 'Item reviewed and declined — reason required', trigger: 'Reject button → Reject Modal' },
  { from: 'approved', to: 'paid', actor: 'Chima', condition: 'Physical payment executed', trigger: 'Mark Paid button in Payment Queue' },
  { from: 'rejected', to: 'pending', actor: 'HoD (original requester)', condition: 'Requester edits and resubmits', trigger: 'Edit & Resubmit in My Requisitions' },
]

export default function StatesPage() {
  return (
    <div>
      <div className="fd-pagehead">
        <div>
          <h1 className="fd-pagehead__title">Line item states</h1>
          <p className="fd-pagehead__sub">
            Each line item moves through states independently. A requisition can have items in multiple states simultaneously.
          </p>
        </div>
      </div>

      {/* State diagram */}
      <div className="fd-card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="fd-card__title" style={{ marginBottom: 20 }}>State machine diagram</div>
        <LineItemStatesFlow />
      </div>

      {/* State descriptions */}
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>States</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { status: 'pending', color: 'var(--pending-fg)', bg: 'var(--pending-bg)', desc: 'Newly submitted. Awaiting review by the DG or Backup approver.' },
          { status: 'approved', color: 'var(--approved-fg)', bg: 'var(--approved-bg)', desc: 'Approved by DG / Backup. Ready for payment execution.' },
          { status: 'rejected', color: 'var(--rejected-fg)', bg: 'var(--rejected-bg)', desc: 'Declined with a mandatory reason. The HoD can edit and resubmit.' },
          { status: 'paid', color: 'var(--paid-fg)', bg: 'var(--paid-bg)', desc: 'Payment executed. Terminal state — no further changes.' },
        ].map((s) => (
          <div key={s.status} className="fd-card" style={{ padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
            <span className={`fd-badge fd-badge--${s.status}`} style={{ marginBottom: 10, display: 'inline-flex' }}>
              <span className="fd-badge__dot" />{s.status}
            </span>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Transitions table */}
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Valid transitions</h2>
      <div className="fd-table-wrap">
        <table className="fd-table">
          <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th>Actor</th>
              <th>Condition</th>
              <th>Trigger</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t, i) => (
              <tr key={i}>
                <td><span className={`fd-badge fd-badge--${t.from}`}><span className="fd-badge__dot" />{t.from}</span></td>
                <td><span className={`fd-badge fd-badge--${t.to}`}><span className="fd-badge__dot" />{t.to}</span></td>
                <td style={{ fontWeight: 500 }}>{t.actor}</td>
                <td className="fd-muted" style={{ fontSize: 12 }}>{t.condition}</td>
                <td><code style={{ fontSize: 11, background: 'var(--surface-canvas)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-secondary)' }}>{t.trigger}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Important notes */}
      <div className="fd-notice fd-notice--info" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Important notes</div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: 'var(--text-body)', lineHeight: 1.7 }}>
          <li>Items move independently — a single requisition can have some approved, some rejected, and some pending simultaneously.</li>
          <li>Resubmitted items re-enter the approval queue as fresh <strong>pending</strong> items, preserving the original rejection in the audit log.</li>
          <li>The <strong>paid</strong> state is terminal — no further transitions are possible.</li>
          <li>All state changes are written to the immutable audit log with actor name, timestamp, and detail.</li>
        </ul>
      </div>
    </div>
  )
}
