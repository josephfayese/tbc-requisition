import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-canvas)', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.jpg" alt="" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', color: 'var(--text-muted)' }}>404</div>
        <h1 style={{ margin: 0, font: '700 28px/34px var(--font-display)' }}>Page not found</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Link href="/dashboard" className="fd-btn fd-btn--primary" style={{ textDecoration: 'none' }}>
            Go to dashboard
          </Link>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          TBC OutOfZion · Internal Finance System
        </div>
      </div>
    </div>
  )
}
