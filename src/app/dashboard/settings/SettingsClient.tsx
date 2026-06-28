'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateModuleVisibility } from '@/app/actions'
import { useToast } from '@/components/Toast'

const ALL_ROLES = [
  { value: 'hod', label: 'Head of Department' },
  { value: 'dg', label: 'Director General' },
  { value: 'backup', label: 'Backup Approver' },
  { value: 'finance', label: 'Head of Finance' },
  { value: 'pastor', label: 'Senior Pastor' },
  { value: 'chima', label: 'Payment Executor' },
  // admin always has access — not shown in toggle
]

const MODULES = [
  {
    key: 'approve',
    label: 'Requisition Queue',
    description: 'Who can view and act on pending requisitions',
  },
  {
    key: 'payments',
    label: 'Payment Queue',
    description: 'Who can see approved items awaiting bank payment',
  },
  {
    key: 'reconciliation',
    label: 'Reconciliation',
    description: 'Who can view and mark reconciliation sign-offs',
  },
  {
    key: 'retirement',
    label: 'Fund Retirement',
    description: 'Who can submit retirement notes on paid items',
  },
]

interface Props {
  moduleVisibility: Record<string, string[]>
}

export default function SettingsClient({ moduleVisibility: initial }: Props) {
  const [visibility, setVisibility] = useState<Record<string, string[]>>(initial)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  function toggle(moduleKey: string, role: string) {
    setVisibility((prev) => {
      const current = prev[moduleKey] ?? []
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role]
      return { ...prev, [moduleKey]: next }
    })
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateModuleVisibility(visibility)
      if (result.error) { toast(result.error, 'error'); return }
      toast('Module visibility saved', 'success')
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {MODULES.map((mod) => {
        const enabled = visibility[mod.key] ?? []
        return (
          <div key={mod.key} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{mod.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{mod.description}</div>
              <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 4, fontWeight: 500 }}>
                Admin always has access (not shown below)
              </div>
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
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: `1px solid ${on ? 'var(--brand)' : 'var(--line-2)'}`,
                      background: on ? 'var(--brand-soft)' : 'var(--bg-raised)',
                      color: on ? 'var(--brand)' : 'var(--ink-3)',
                      font: 'inherit',
                      fontSize: 12,
                      fontWeight: on ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 140ms',
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: 3,
                      border: `1.5px solid ${on ? 'var(--brand)' : 'var(--line-2)'}`,
                      background: on ? 'var(--brand)' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
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
        <button className="pri-btn" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
