'use client'

interface Row {
  req_number: string
  dept: string
  req_date: string
  description: string
  amount: number
  status: string
}

export default function CsvExport({ rows }: { rows: Row[] }) {
  function download() {
    const headers = ['Req #', 'Department', 'Date', 'Description', 'Amount (₦)', 'Status']
    const lines = rows.map((r) =>
      [r.req_number, r.dept, r.req_date, `"${r.description.replace(/"/g, '""')}"`, r.amount.toFixed(2), r.status].join(',')
    )
    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requisitions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button className="ghost-btn" onClick={download} style={{ fontSize: 12 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download CSV
    </button>
  )
}
