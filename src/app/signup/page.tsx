import { createAdminClient } from '@/lib/supabase/admin'
import SignupForm from './SignupForm'

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const admin = createAdminClient()

  const { count: adminCount } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  const adminExists = (adminCount ?? 0) > 0

  const { data: deptRows } = await admin.from('departments').select('name').order('name')
  const departments = (deptRows ?? []).map((d: { name: string }) => d.name)

  return (
    <div className="kit-auth">
      {/* Brand panel */}
      <div className="kit-auth__quote">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.jpg" alt="Out of Zion — The Baptizing Church" style={{ width: 200, maxWidth: '80%', marginBottom: 24, borderRadius: 8 }} />
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--cream-300)', marginBottom: 8 }}>
            TBC OutOfZion
          </div>
          <div style={{ fontSize: 13, color: 'var(--cream-200)', textAlign: 'center' }}>
            Finance requisitions · Internal access only
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="kit-auth__form">
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-title)', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
              {adminExists ? 'Access restricted' : 'Create your account'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              {adminExists ? 'Self-registration is closed.' : 'Set up the first administrator account.'}
            </p>
          </div>

          {adminExists ? (
            <div className="fd-card" style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-title)', marginBottom: 10 }}>
                Self-registration is closed
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                The system is already configured. New accounts must be created by an administrator.
                Contact your admin to have an account set up for you.
              </div>
              <a href="/login" className="fd-btn fd-btn--primary fd-btn--block">
                Go to sign in
              </a>
            </div>
          ) : (
            <SignupForm departments={departments} />
          )}

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--green-700)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
