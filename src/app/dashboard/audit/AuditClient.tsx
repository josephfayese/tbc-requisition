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
  if (action.startsWith('Approved') || action.startsWith('Paid')) return 'var(--pos)'
  if (action.startsWith('Rejected')) return 'var(--neg)'
  if (action.startsWith('Requisition submitted') || action.startsWith('Resubmitted')) return 'var(--info)'
  if (action.includes('DG')) return 'var(--warn)'
  return 'var(--ink-4)'
}

function getActionBg(action: string): string {
  if (action.startsWith('Approved') || action.startsWith('Paid')) return 'var(--pos-soft)'
  if (action.startsWith('Rejected')) return 'var(--neg-soft)'
  if (action.startsWith('Requisition submitted') || action.startsWith('Resubmitted')) return 'var(--info-soft)'
  if (action.includes('DG')) return 'var(--warn-soft)'
  return 'var(--bg-sunken)'
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
  const timeline = selectedId
    ? fullLog.filter((e) => e.req_id === selectedId || (e.req_id === null && e.line_item_id === null && selectedId === null))
    : fullLog

  // For "no req selected" show system-level log entries
  const displayTimeline = selectedId !== null
    ? fullLog.filter((e) => e.req_id === selectedId)
    : fullLog.filter((e) => e.req_id === null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
      {/* Left panel: requisition list */}
      <div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <input
              className="li-input"
              placeholder="Search requisitions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 13, padding: '7px 10px' }}
            />
          </div>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {/* Global log entry */}
            <button
              onClick={() => setSelectedId(null)}
              className="nav-item"
              data-active={selectedId === null ? 'true' : 'false'}
              style={{ borderBottom: '1px solid var(--line)', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>System Log</span>
              <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>Non-requisition events</span>
            </button>
            {filtered.length === 0 && (
              <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--ink-4)', textAlign: 'center' }}>No results</div>
            )}
            {filtered.map((req) => {
              const isSelected = req.id === selectedId
              const entryCount = fullLog.filter((e) => e.req_id === req.id).length
              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  className="nav-item"
                  data-active={isSelected ? 'true' : 'false'}
                  style={{ borderBottom: '1px solid var(--line)', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '12px 14px' }}
                >
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)' }}>{req.req_number}</span>
                    <span style={{ fontSize: 10, background: isSelected ? 'var(--brand)' : 'var(--bg-sunken)', color: isSelected ? '#fff' : 'var(--ink-4)', padding: '1px 6px', borderRadius: 999, fontWeight: 600 }}>{entryCount}</span>
                  </div>
                  <span style={{ fontSize: 11, color: isSelected ? 'var(--brand)' : 'var(--ink-4)' }}>{req.dept} · {req.submitter}</span>
                  <span style={{ fontSize: 10, color: isSelected ? 'var(--brand)' : 'var(--ink-5)', opacity: 0.8 }}>{fmtDate(req.created_at)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right panel: timeline */}
      <div>
        {selectedReq && (
          <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{selectedReq.req_number}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
                  {selectedReq.dept} · Submitted by {selectedReq.submitter} · {fmtDate(selectedReq.created_at)}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)' }}>
                {displayTimeline.length} audit entr{displayTimeline.length !== 1 ? 'ies' : 'y'}
              </div>
            </div>
          </div>
        )}

        {!selectedReq && (
          <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>System Log</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>Events not tied to a specific requisition</div>
          </div>
        )}

        {displayTimeline.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
            No audit entries for this requisition yet.
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: 17, top: 0, bottom: 0, width: 2, background: 'var(--line)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {displayTimeline.map((entry, idx) => {
                const color = getActionColor(entry.action)
                const bg = getActionBg(entry.action)
                return (
                  <div key={entry.id} style={{ display: 'flex', gap: 16, paddingBottom: idx < displayTimeline.length - 1 ? 20 : 0 }}>
                    {/* Dot */}
                    <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 2, zIndex: 1 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '2px solid var(--bg-raised)', flexShrink: 0 }} />
                    </div>
                    {/* Content */}
                    <div className="card" style={{ flex: 1, padding: '12px 16px', marginBottom: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 6, background: bg, color, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                            {entry.action}
                          </div>
                          {entry.detail && (
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{entry.detail}</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                            by <strong style={{ color: 'var(--ink-2)' }}>{entry.actor_name}</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-5)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
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
