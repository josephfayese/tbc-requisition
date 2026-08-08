'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateModuleVisibility, updateViewerSettings } from '@/app/actions'
import { useToast } from '@/components/Toast'

const ALL_ROLES = [
  { value: 'hod', label: 'Head of Department' },
  { value: 'dg', label: 'Director General' },
  { value: 'backup', label: 'Backup Approver' },
  { value: 'finance', label: 'Head of Finance' },
  { value: 'pastor', label: 'Senior Pastor' },
  { value: 'chima', label: 'Payment Executor' },
  { value: 'trainer', label: 'Trainer (Demo)' },
]

const MODULES = [
  { key: 'approve', label: 'Requisition Queue', description: 'Who can view and act on pending requisitions' },
  { key: 'payments', label: 'Payment Queue', description: 'Who can see approved items awaiting bank payment' },
  { key: 'reconciliation', label: 'Reconciliation', description: 'Who can view and mark reconciliation sign-offs' },
  { key: 'retirement', label: 'Fund Retirement', description: 'Who can submit retirement notes on paid items' },
]

interface Props {
  moduleVisibility: Record<string, string[]>
  viewerPasscode: string
  viewerOpen: boolean
}

export default function SettingsClient({ moduleVisibility: initial, viewerPasscode: initPasscode, viewerOpen: initOpen }: Props) {
  const [visibility, setVisibility] = useState<Record<string, string[]>>(initial)
  const [viewerOpen, setViewerOpen] = useState(initOpen)
  const [passcode, setPasscode] = useState(initPasscode)
  const [isPendingVis, startVis] = useTransition()
  const [isPendingViewer, startViewer] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function toggle(moduleKey: string, role: string) {
    setVisibility((prev) => {
      const current = prev[moduleKey] ?? []
      const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
      return { ...prev, [moduleKey]: next }
    })
  }

  function handleSaveVisibility() {
    startVis(async () => {
      const result = await updateModuleVisibility(visibility)
      if (result.error) { toast(result.error, 'error'); return }
      toast('Module visibility saved', 'success')
      router.refresh()
    })
  }

  function handleSaveViewer() {
    startViewer(async () => {
      const result = await updateViewerSettings(passcode, viewerOpen)
      if (result.error) { toast(result.error, 'error'); return }
      toast('Group dashboard settings saved', 'success')
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Group Dashboard Access ── */}
      <div>
        <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Group Dashboard Access</div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Group Dashboard (Viewer)</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
              Control who can access the read-only group dashboard at <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>/dashboard/viewer</span>
            </div>
          </div>

          {/* Open toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-tint)', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Open to everyone (no passcode)</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                {viewerOpen ? 'Anyone with the link can view the group dashboard' : 'A passcode is required to unlock the group dashboard'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewerOpen((o) => !o)}
              className="toggle-track"
              style={{ background: viewerOpen ? 'var(--brand)' : 'var(--line-2)', flexShrink: 0 }}
              aria-label="Toggle open access"
            >
              <div className="toggle-knob" style={{ transform: viewerOpen ? 'translateX(16px)' : 'translateX(0)' }} />
            </button>
          </div>

          {/* Passcode field */}
          {!viewerOpen && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                Group Passcode
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="li-input"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="Min. 4 characters"
                  style={{ fontFamily: 'var(--mono)', letterSpacing: '0.12em', fontWeight: 700, maxWidth: 220 }}
                  maxLength={20}
                />
                <div style={{ fontSize: 12, color: 'var(--ink-4)', display: 'flex', alignItems: 'center' }}>
                  Share this with group members so they can unlock the dashboard
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="pri-btn" onClick={handleSaveViewer} disabled={isPendingViewer} style={{ fontSize: 13 }}>
              {isPendingViewer ? 'Saving…' : 'Save Viewer Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Module Visibility ── */}
      <div>
        <div className="section-title" style={{ marginBottom: 12 }}><span className="bar" />Module Visibility</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODULES.map((mod) => {
            const enabled = visibility[mod.key] ?? []
            return (
              <div key={mod.key} className="card" style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{mod.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{mod.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 4, fontWeight: 500 }}>Admin always has access</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {ALL_ROLES.map((role) => {
                    const on = enabled.includes(role.value)
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => toggle(mod.key, role.value)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          padding: '7px 12px', borderRadius: 8,
                          border: `1px solid ${on ? 'var(--brand)' : 'var(--line-2)'}`,
                          background: on ? 'var(--brand-soft)' : 'var(--bg-raised)',
                          color: on ? 'var(--brand)' : 'var(--ink-3)',
                          font: 'inherit', fontSize: 12, fontWeight: on ? 600 : 400,
                          cursor: 'pointer', transition: 'all 140ms',
                        }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: 3,
                          border: `1.5px solid ${on ? 'var(--brand)' : 'var(--line-2)'}`,
                          background: on ? 'var(--brand)' : 'transparent',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {on && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        {role.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button className="pri-btn" onClick={handleSaveVisibility} disabled={isPendingVis}>
              {isPendingVis ? 'Saving…' : 'Save Module Visibility'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
