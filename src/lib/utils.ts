export function formatNaira(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '₦0.00'
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

export function reqNumber(id: number): string {
  return `REQ-${String(2000 + id).padStart(4, '0')}`
}

export function timeAgo(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function fmtDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Human-readable duration from a number of hours (e.g. 0.5 → "30m", 3.2 → "3.2h", 50 → "2.1d")
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

// ─── Submission window ────────────────────────────────────────────────────────
// Requisitions may only be submitted Monday–Wednesday (Africa/Lagos time).
// Thursday through Sunday the window is closed; it reopens Monday 12:00 AM WAT.

export function isSubmissionWindowOpen(now: Date = new Date()): boolean {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', weekday: 'short' }).format(now)
  return ['Mon', 'Tue', 'Wed'].includes(day)
}

export function submissionWindowMessage(): string {
  return 'Requisition submissions are open Monday to Wednesday (11:59 PM WAT). The window is now closed — you can submit again from Monday.'
}

export function fmtDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
