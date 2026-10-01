'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateModuleVisibility, updateViewerSettings, updateSubmissionWindow } from '@/app/actions'
import { useToast } from '@/components/Toast'

const ALL_ROLES = [
  { value: 'hod', label: 'Head of Department' },
  { value: 'dg', label: 'Director General' },
  { value: 'backup', label: 'Backup Approver' },
  { value: 'finance', label: 'Head of Finance' },
  { value: 'pastor', label: 'Senior Pastor' },
  { value: 'chima', label: 'Payment Executor' },
]

const MODULES = [
  { key: 'approve', label: 'Requisition queue', description: 'Who can view and act on pending requisitions' },
  { key: 'payments', label: 'Payment queue', description: 'Who can see approved items awaiting bank payment' },
  { key: 'reconciliation', label: 'Reconciliation', description: 'Who can view and mark reconciliation sign-offs' },
  { key: 'retirement', label: 'Fund retirement', description: 'Who can submit retirement notes on paid items' },
]

interface Props {
  moduleVisibility: Record<string, string[]>
  viewerPasscode: string
  viewerOpen: boolean
  submissionWindowEnabled: boolean
}

export default function SettingsClient({ moduleVisibility: initial, viewerPasscode: initPasscode, viewerOpen: initOpen, submissionWindowEnabled: initWindow }: Props) {
  const [visibility, setVisibility] = useState<Record<string, string[]>>(initial)
  const [viewerOpen, setViewerOpen] = useState(initOpen)
  const [passcode, setPasscode] = useState(initPasscode)
  const [windowEnabled, setWindowEnabled] = useState(initWindow)
  const [isPendingVis, startVis] = useTransition()
  const [isPendingViewer, startViewer] = useTransition()
  const [isPendingWindow, startWindow] = useTransition()
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

      {/* Group Dashboard Access */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Group dashboard access</h2>
        <div className="fd-card" style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-title)' }}>Group dashboard (viewer)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Control who can access the read-only group dashboard at <code style={{ fontSize: 11 }}>/dashboard/viewer</code>
            </div>
          </div>

          {/* Open toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface-tint)', borderRadius: 10, border: '1px solid var(--border-default)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-title)' }}>Open to everyone (no passcode)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {viewerOpen ? 'Anyone with the link can view the group dashboard' : 'A passcode is required to unlock the group dashboard'}
              </div>
            </div>
            <label className="fd-switch" style={{ flexShrink: 0 }}>
              <input type="checkbox" checked={viewerOpen} onChange={() => setViewerOpen((o) => !o)} aria-label="Toggle open access" />
              <span className="fd-switch__track" />
              <span className="fd-switch__thumb" />
            </label>
          </div>

          {/* Passcode field */}
          {!viewerOpen && (
            <div style={{ marginBottom: 16 }}>
              <div className="fd-field">
                <label className="fd-field__label">Group passcode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="fd-input"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                    placeholder="Min. 4 characters"
                    style={{ letterSpacing: '0.12em', fontWeight: 700, maxWidth: 220 }}
                    maxLength={20}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    Share this with group members so they can unlock the dashboard
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="fd-btn fd-btn--primary fd-btn--sm" onClick={handleSaveViewer} disabled={isPendingViewer}>
              {isPendingViewer ? 'Saving...' : 'Save viewer settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Submission Window */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Submission window</h2>
        <div className="fd-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface-tint)', borderRadius: 10, border: '1px solid var(--border-default)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-title)' }}>Enforce Mon-Wed cutoff</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {windowEnabled
                  ? 'Requisitions can only be submitted Monday to Wednesday (WAT). Admin is always exempt.'
                  : 'Cutoff is disabled — requisitions can be submitted any day of the week.'}
              </div>
            </div>
            <label className="fd-switch" style={{ flexShrink: 0 }}>
              <input type="checkbox" checked={windowEnabled} onChange={() => setWindowEnabled((v) => !v)} aria-label="Toggle submission window" />
              <span className="fd-switch__track" />
              <span className="fd-switch__thumb" />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="fd-btn fd-btn--primary fd-btn--sm"
              onClick={() => {
                startWindow(async () => {
                  const result = await updateSubmissionWindow(windowEnabled)
                  if (result.error) { toast(result.error, 'error'); return }
                  toast(windowEnabled ? 'Submission window cutoff enabled' : 'Submission window cutoff disabled', 'success')
                  router.refresh()
                })
              }}
              disabled={isPendingWindow}
            >
              {isPendingWindow ? 'Saving...' : 'Save submission window'}
            </button>
          </div>
        </div>
      </div>

      {/* Module Visibility */}
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Module visibility</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODULES.map((mod) => {
            const enabled = visibility[mod.key] ?? []
            return (
              <div key={mod.key} className="fd-card" style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-title)' }}>{mod.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{mod.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--green-700)', marginTop: 4, fontWeight: 500 }}>Admin always has access</div>
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
                          border: `1px solid ${on ? 'var(--green-700)' : 'var(--border-divider)'}`,
                          background: on ? 'var(--green-50)' : 'var(--surface-card)',
                          color: on ? 'var(--green-700)' : 'var(--text-secondary)',
                          font: 'inherit', fontSize: 12, fontWeight: on ? 600 : 400,
                          cursor: 'pointer', transition: 'all 140ms',
                        }}
                      >
                        <span className="fd-check" data-checked={on ? '' : undefined}>
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
            <button className="fd-btn fd-btn--primary" onClick={handleSaveVisibility} disabled={isPendingVis}>
              {isPendingVis ? 'Saving...' : 'Save module visibility'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
