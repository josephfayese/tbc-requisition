'use client'

import { useState, useTransition } from 'react'
import { formatNaira, fmtDate, timeAgo } from '@/lib/utils'
import StatusPill from '@/components/StatusPill'
import { verifyViewerPasscode } from '@/app/actions'

interface PendingItem {
  id: number
  description: string
  amount: number
  created_at: string
  req_number: string
  dept: string
  requester: string
}

interface FeedEntry {
  id: number
  action: string
  detail: string | null
  actor_name: string
  created_at: string
  req_id: number | null
  line_item_id: number | null
}

interface Props {
  pending: PendingItem[]
  feed: FeedEntry[]
  totalPending: number
}

function getSeverity(action: string): string {
  if (action.startsWith('Approved') || action.startsWith('Paid')) return 'pos'
  if (action.startsWith('Rejected')) return 'neg'
  if (action.startsWith('Requisition')) return 'info'
  return 'neutral'
}

export default function ViewerClient({ pending, feed, totalPending }: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, startVerify] = useTransition()

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    startVerify(async () => {
      const { ok } = await verifyViewerPasscode(input)
      if (ok) {
        setUnlocked(true)
        setError('')
      } else {
        setError('Incorrect passcode. Please try again.')
        setInput('')
      }
    })
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👁</div>
            <div className="masthead-eyebrow" style={{ justifyContent: 'center' }}>
              <span className="bar" />Group Dashboard
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '8px 0 6px', letterSpacing: '-0.02em' }}>
              Passcode Required
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
              Enter the group passcode to view the live requisition dashboard.
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                  Group Passcode
                </label>
                <input
                  className="li-input"
                  type="text"
                  placeholder="Enter passcode"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, fontSize: 16, textAlign: 'center' }}
                />
                {error && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--neg)', fontWeight: 500 }}>{error}</div>
                )}
              </div>
              <button type="submit" className="pri-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={isVerifying}>
                {isVerifying ? 'Verifying…' : 'Unlock Dashboard'}
              </button>
            </form>
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--ink-5)' }}>
            Read-only · No login required
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div className="masthead-eyebrow"><span className="bar" />Group Dashboard</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '6px 0 0' }}>
            Requisitions <em style={{ fontStyle: 'italic', color: 'var(--brand)' }}>Live View</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>Read-only · Refreshed on each page load</p>
        </div>
        <button
          onClick={() => setUnlocked(false)}
          className="ghost-btn"
          style={{ fontSize: 12 }}
        >
          🔒 Lock
        </button>
      </div>

      {/* Summary stat */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Pending Items" value={String(pending.length)} sub="awaiting approval" color="var(--warn)" />
        <StatCard label="Total Pending Value" value={formatNaira(totalPending)} sub="across all departments" color="var(--brand)" />
        <StatCard label="Recent Decisions" value={String(feed.filter(f => f.action.startsWith('Approved') || f.action.startsWith('Rejected')).length)} sub="in audit log" color="var(--info)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Pending items for group discussion */}
        <div>
          <div className="section-title">
            <span className="bar" />
            Pending for Discussion
            <span className="count">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
              No pending items. Queue is clear.
            </div>
          ) : (
            <div className="signal-feed">
              {pending.map((item) => (
                <div key={item.id} className="signal">
                  <div className="signal-sev warn" />
                  <div className="signal-body">
                    <div className="signal-line">
                      <span className="signal-title">{item.description}</span>
                      <span className="signal-tag">{formatNaira(item.amount)}</span>
                    </div>
                    <div className="signal-meta">
                      {item.req_number} · {item.dept} · {item.requester} · {fmtDate(item.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent decisions feed */}
        <div>
          <div className="section-title">
            <span className="bar" />
            Recent Decisions
            <span className="count">{feed.length}</span>
          </div>
          {feed.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
              No decisions recorded yet.
            </div>
          ) : (
            <div className="signal-feed">
              {feed.map((entry) => {
                const sev = getSeverity(entry.action)
                return (
                  <div key={entry.id} className="signal">
                    <div className={`signal-sev ${sev}`} />
                    <div className="signal-body">
                      <div className="signal-line">
                        <span className="signal-title">{entry.action}</span>
                        <span className="signal-tag">{timeAgo(entry.created_at)}</span>
                      </div>
                      <div className="signal-meta">
                        {entry.actor_name}{entry.detail ? ` · ${entry.detail}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>{sub}</div>
    </div>
  )
}
