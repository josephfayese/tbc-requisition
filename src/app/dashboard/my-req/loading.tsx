export default function MyReqLoading() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="fd-skel" style={{ width: 190, height: 32, marginBottom: 8 }} />
        <div className="fd-skel" style={{ width: 250, height: 16 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => <div key={i} className="fd-card"><div className="fd-skel" style={{ height: 80 }} /></div>)}
      </div>
    </div>
  )
}
