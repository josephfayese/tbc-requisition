import { createAdminClient } from '@/lib/supabase/admin'
import SignupForm from './SignupForm'

export default async function SignupPage() {
  const admin = createAdminClient()

  // Check if any admin account already exists
  const { count: adminCount } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  const adminExists = (adminCount ?? 0) > 0

  // Fetch departments for the form
  const { data: deptRows } = await admin.from('departments').select('name').order('name')
  const departments = (deptRows ?? []).map((d: { name: string }) => d.name)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--brand-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', marginBottom: 6 }}>
            TBC OutOfZion
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
            {adminExists ? 'Access Restricted' : 'Create your account'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>
            Finance Requisitions · Internal access only
          </p>
        </div>

        {adminExists ? (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
              Self-registration is closed
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20 }}>
              The system is already configured. New accounts must be created by an administrator.
              Contact your admin to have an account set up for you.
            </div>
            <a
              href="/login"
              style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, background: 'var(--brand)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}
            >
              Go to Sign In
            </a>
          </div>
        ) : (
          <SignupForm departments={departments} />
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-4)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--ink-5)' }}>
          TBC OutOfZion · Internal Finance System
        </div>
      </div>
    </div>
  )
}
