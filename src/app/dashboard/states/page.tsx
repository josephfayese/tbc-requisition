import LineItemStatesFlow from '@/components/LineItemStatesFlow'

const transitions = [
  { from: 'pending', to: 'approved', actor: 'DG / Backup', condition: 'Item reviewed and approved', trigger: 'Approve button in Approval Queue' },
  { from: 'pending', to: 'rejected', actor: 'DG / Backup', condition: 'Item reviewed and declined — reason required', trigger: 'Reject button → Reject Modal' },
  { from: 'approved', to: 'paid', actor: 'Chima', condition: 'Physical payment executed', trigger: 'Mark Paid button in Payment Queue' },
  { from: 'rejected', to: 'pending', actor: 'HoD (original requester)', condition: 'Requester edits and resubmits', trigger: 'Edit & Resubmit in My Requisitions' },
]

export default function StatesPage() {
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="masthead" style={{ marginBottom: 28 }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Reference</div>
          <h1>Line Item <em>States</em></h1>
          <p className="masthead-sub">
            Each line item moves through states independently. A requisition can have items in multiple states simultaneously.
          </p>
        </div>
      </div>

      {/* State diagram */}
      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 20 }}>State Machine Diagram</div>
        <LineItemStatesFlow />
      </div>

      {/* State descriptions */}
      <div className="section-title" style={{ marginTop: 0 }}>
        <span className="bar" />States
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { status: 'pending', color: 'var(--warn)', bg: 'var(--warn-soft)', desc: 'Newly submitted. Awaiting review by the DG or Backup approver.' },
          { status: 'approved', color: 'var(--info)', bg: 'var(--info-soft)', desc: 'Approved by DG / Backup. Ready for Chima to execute payment.' },
          { status: 'rejected', color: 'var(--neg)', bg: 'var(--neg-soft)', desc: 'Declined with a mandatory reason. The HoD can edit and resubmit.' },
          { status: 'paid', color: 'var(--pos)', bg: 'var(--pos-soft)', desc: 'Payment executed by Chima. Terminal state — no further changes.' },
        ].map((s) => (
          <div key={s.status} className="card" style={{ padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
            <span className="pill" style={{ background: s.bg, color: s.color, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 10, display: 'inline-flex' }}>
              {s.status}
            </span>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Transitions table */}
      <div className="section-title">
        <span className="bar" />Valid Transitions
      </div>
      <div className="table-wrap">
        <table className="tbl">
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
                <td><span className={`pill ${statusClass(t.from)}`}>{t.from}</span></td>
                <td><span className={`pill ${statusClass(t.to)}`}>{t.to}</span></td>
                <td style={{ fontWeight: 500 }}>{t.actor}</td>
                <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>{t.condition}</td>
                <td><code style={{ fontSize: 11, background: 'var(--bg-sunken)', padding: '2px 6px', borderRadius: 4, color: 'var(--ink-3)' }}>{t.trigger}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Important notes */}
      <div className="card" style={{ padding: 20, marginTop: 20, background: 'var(--info-soft)', border: '1px solid var(--info)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--info)', marginBottom: 8 }}>Important notes</div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
          <li>Items move independently — a single requisition can have some approved, some rejected, and some pending simultaneously.</li>
          <li>Resubmitted items re-enter the approval queue as fresh <strong>pending</strong> items, preserving the original rejection in the audit log.</li>
          <li>The <strong>paid</strong> state is terminal — no further transitions are possible.</li>
          <li>All state changes are written to the immutable audit log with actor name, timestamp, and detail.</li>
        </ul>
      </div>
    </div>
  )
}

function statusClass(status: string): string {
  const m: Record<string, string> = { pending: 'warn', approved: 'info', rejected: 'neg', paid: 'pos' }
  return m[status] ?? 'neutral'
}
