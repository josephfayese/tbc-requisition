'use client'

import { useState } from 'react'
import { fmtDate, fmtDateTime, timeAgo } from '@/lib/utils'

interface Req {
  id: number
  req_number: string
  dept: string
  created_at: string
  submitter: string
}

interface LogEntry {
  id: number
  req_id: number | null
  line_item_id: number | null
  actor_id: string | null
  actor_name: string
  action: string
  detail: string | null
  created_at: string
}

interface Props {
  requisitions: Req[]
  fullLog: LogEntry[]
}

function getActionColor(action: string): string {
  if (action.startsWith('Approved') || action.startsWith('Paid')) return 'var(--approved-fg)'
  if (action.startsWith('Rejected')) return 'var(--rejected-fg)'
  if (action.startsWith('Requisition submitted') || action.startsWith('Resubmitted')) return 'var(--paid-fg)'
  if (action.includes('DG')) return 'var(--pending-fg)'
  return 'var(--text-muted)'
}

function getActionBg(action: string): string {
  if (action.startsWith('Approved') || action.startsWith('Paid')) return 'var(--approved-bg)'
  if (action.startsWith('Rejected')) return 'var(--rejected-bg)'
  if (action.startsWith('Requisition submitted') || action.startsWith('Resubmitted')) return 'var(--paid-bg)'
  if (action.includes('DG')) return 'var(--pending-bg)'
  return 'var(--surface-canvas)'
}

export default function AuditClient({ requisitions, fullLog }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(requisitions[0]?.id ?? null)
  const [search, setSearch] = useState('')

  const filtered = search
    ? requisitions.filter(
        (r) =>
          r.req_number.toLowerCase().includes(search.toLowerCase()) ||
          r.dept.toLowerCase().includes(search.toLowerCase()) ||
          r.submitter.toLowerCase().includes(search.toLowerCase())
      )
    : requisitions

  const selectedReq = requisitions.find((r) => r.id === selectedId)

  const displayTimeline = selectedId !== null
    ? fullLog.filter((e) => e.req_id === selectedId)
    : fullLog.filter((e) => e.req_id === null)

  return (
    <div className="kit-split">
      {/* Left panel: requisition list */}
      <div>
        <div className="fd-card fd-card--flush">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-divider)' }}>
            <input
              className="fd-input"
              placeholder="Search requisitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {/* Global log entry */}
            <button
              onClick={() => setSelectedId(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                width: '100%', padding: '12px 14px', border: 'none',
                borderBottom: '1px solid var(--border-divider)', cursor: 'pointer',
                background: selectedId === null ? 'var(--green-50)' : 'transparent',
                textAlign: 'left', font: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: selectedId === null ? 'var(--green-700)' : 'var(--text-title)' }}>System log</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Non-requisition events</span>
            </button>
            {filtered.length === 0 && (
              <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No results</div>
            )}
            {filtered.map((req) => {
              const isSelected = req.id === selectedId
              const entryCount = fullLog.filter((e) => e.req_id === req.id).length
              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                    width: '100%', padding: '12px 14px', border: 'none',
                    borderBottom: '1px solid var(--border-divider)', cursor: 'pointer',
                    background: isSelected ? 'var(--green-50)' : 'transparent',
                    textAlign: 'left', font: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--green-700)' : 'var(--text-title)' }}>{req.req_number}</span>
                    <span style={{ fontSize: 10, background: isSelected ? 'var(--green-700)' : 'var(--surface-canvas)', color: isSelected ? '#fff' : 'var(--text-muted)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>{entryCount}</span>
                  </div>
                  <span style={{ fontSize: 11, color: isSelected ? 'var(--green-700)' : 'var(--text-muted)' }}>{req.dept} · {req.submitter}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-disabled)', opacity: 0.8 }}>{fmtDate(req.created_at)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right panel: timeline */}
      <div>
        {selectedReq && (
          <div className="fd-card" style={{ padding: '14px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-title)' }}>{selectedReq.req_number}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedReq.dept} · Submitted by {selectedReq.submitter} · {fmtDate(selectedReq.created_at)}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                {displayTimeline.length} audit entr{displayTimeline.length !== 1 ? 'ies' : 'y'}
              </div>
            </div>
          </div>
        )}

        {!selectedReq && (
          <div className="fd-card" style={{ padding: '14px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-title)' }}>System log</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Events not tied to a specific requisition</div>
          </div>
        )}

        {displayTimeline.length === 0 ? (
          <div className="fd-empty">
            <div className="fd-empty__title">No audit entries</div>
            No audit entries for this requisition yet.
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: 17, top: 0, bottom: 0, width: 2, background: 'var(--border-divider)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {displayTimeline.map((entry, idx) => {
                const color = getActionColor(entry.action)
                const bg = getActionBg(entry.action)
                return (
                  <div key={entry.id} style={{ display: 'flex', gap: 16, paddingBottom: idx < displayTimeline.length - 1 ? 20 : 0 }}>
                    {/* Dot */}
                    <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2, zIndex: 1 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '2px solid var(--surface-card)', flexShrink: 0 }} />
                    </div>
                    {/* Content */}
                    <div className="fd-card" style={{ flex: 1, padding: '12px 16px', marginBottom: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 6, background: bg, color, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                            {entry.action}
                          </div>
                          {entry.detail && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.detail}</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            by <strong style={{ color: 'var(--text-body)' }}>{entry.actor_name}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
                          <div>{fmtDateTime(entry.created_at)}</div>
                          <div style={{ textAlign: 'right', marginTop: 2 }}>{timeAgo(entry.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
