'use client'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-canvas)', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.jpg" alt="" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', color: 'var(--text-muted)' }}>ERROR</div>
        <h1 style={{ margin: 0, font: '700 28px/34px var(--font-display)' }}>Something went wrong</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Nothing you entered was lost and no money moved. Try again, or go back to your dashboard.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <a href="/dashboard" className="fd-btn fd-btn--secondary" style={{ textDecoration: 'none' }}>
            Go to dashboard
          </a>
          <button className="fd-btn fd-btn--primary" onClick={reset}>
            Try again
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          TBC OutOfZion · Internal Finance System
        </div>
      </div>
    </div>
  )
}
