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

export function fmtDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
