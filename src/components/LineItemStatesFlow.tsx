export default function LineItemStatesFlow() {
  return (
    <svg viewBox="0 0 640 220" width="100%" style={{ maxWidth: 640, display: 'block' }} aria-label="Line item state machine diagram">
      {/* PENDING node */}
      <rect x="20" y="80" width="120" height="48" rx="10" fill="var(--pending-bg)" stroke="var(--pending-fg)" strokeWidth="1.5" />
      <text x="80" y="99" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--pending-fg)">PENDING</text>
      <text x="80" y="116" textAnchor="middle" fontSize="10" fill="var(--pending-fg)">awaiting decision</text>

      {/* APPROVED node */}
      <rect x="260" y="20" width="120" height="48" rx="10" fill="var(--approved-bg)" stroke="var(--approved-fg)" strokeWidth="1.5" />
      <text x="320" y="39" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--approved-fg)">APPROVED</text>
      <text x="320" y="56" textAnchor="middle" fontSize="10" fill="var(--approved-fg)">ready for payment</text>

      {/* REJECTED node */}
      <rect x="260" y="148" width="120" height="48" rx="10" fill="var(--rejected-bg)" stroke="var(--rejected-fg)" strokeWidth="1.5" />
      <text x="320" y="167" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--rejected-fg)">REJECTED</text>
      <text x="320" y="184" textAnchor="middle" fontSize="10" fill="var(--rejected-fg)">reason required</text>

      {/* PAID node */}
      <rect x="500" y="20" width="120" height="48" rx="10" fill="var(--paid-bg)" stroke="var(--paid-fg)" strokeWidth="1.5" />
      <text x="560" y="39" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--paid-fg)">PAID</text>
      <text x="560" y="56" textAnchor="middle" fontSize="10" fill="var(--paid-fg)">payment executed</text>

      {/* Arrow: PENDING → APPROVED */}
      <line x1="140" y1="90" x2="258" y2="50" stroke="var(--approved-fg)" strokeWidth="1.5" markerEnd="url(#arr-approved)" />
      <text x="193" y="65" textAnchor="middle" fontSize="10" fill="var(--approved-fg)" fontWeight="600">approve</text>

      {/* Arrow: PENDING → REJECTED */}
      <line x1="140" y1="112" x2="258" y2="165" stroke="var(--rejected-fg)" strokeWidth="1.5" markerEnd="url(#arr-rejected)" />
      <text x="193" y="155" textAnchor="middle" fontSize="10" fill="var(--rejected-fg)" fontWeight="600">reject</text>

      {/* Arrow: APPROVED → PAID */}
      <line x1="380" y1="44" x2="498" y2="44" stroke="var(--paid-fg)" strokeWidth="1.5" markerEnd="url(#arr-paid)" />
      <text x="440" y="38" textAnchor="middle" fontSize="10" fill="var(--paid-fg)" fontWeight="600">mark paid</text>

      {/* Arrow: REJECTED → PENDING (resubmit) */}
      <path d="M 320 196 Q 320 220 200 220 Q 80 220 80 130" fill="none" stroke="var(--pending-fg)" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arr-pending)" />
      <text x="200" y="215" textAnchor="middle" fontSize="10" fill="var(--pending-fg)" fontWeight="600">resubmit</text>

      {/* Arrow markers */}
      <defs>
        <marker id="arr-approved" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--approved-fg)" />
        </marker>
        <marker id="arr-rejected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--rejected-fg)" />
        </marker>
        <marker id="arr-paid" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--paid-fg)" />
        </marker>
        <marker id="arr-pending" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--pending-fg)" />
        </marker>
      </defs>
    </svg>
  )
}
