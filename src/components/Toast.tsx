'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const idRef = React.useRef(0)

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }
  const colorMap: Record<ToastType, string> = {
    success: 'var(--pos)',
    error: 'var(--neg)',
    info: 'var(--info)',
    warning: 'var(--warn)',
  }

  return (
    <div
      className="toast-bar"
      style={{
        position: 'relative',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transition: 'all 280ms cubic-bezier(0.22,1,0.36,1)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: colorMap[toast.type], fontWeight: 700, fontSize: 14 }}>{iconMap[toast.type]}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
