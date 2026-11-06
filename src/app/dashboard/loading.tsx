export default function DashboardLoading() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="fd-skel" style={{ width: 200, height: 32, marginBottom: 8 }} />
        <div className="fd-skel" style={{ width: 260, height: 16 }} />
      </div>
      <div className="kit-stats" style={{ marginBottom: 20 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="fd-card"><div className="fd-skel" style={{ height: 56 }} /></div>)}
      </div>
      <div className="kit-grid-halves">
        <div className="fd-card"><div className="fd-skel" style={{ height: 200 }} /></div>
        <div className="fd-card"><div className="fd-skel" style={{ height: 200 }} /></div>
      </div>
    </div>
  )
}
