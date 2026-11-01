// NoticeStack — notificações no idioma do shell: barra fina e plana,
// cor só na borda esquerda (estado), sem blur, sem sombra, sem balão.
// Empilha no rodapé da bancada e some sozinha (exceto sticky).
import React, { useEffect } from 'react'

export type Severity = 'error' | 'warn' | 'info' | 'success'
export interface Notice {
  id: string
  severity: Severity
  title: string
  detail?: string
  source?: string
  action?: { label: string; onClick: () => void }
  sticky?: boolean
  progress?: number
}

const SEV_BORDER: Record<Severity, string> = {
  error: 'var(--fault)', warn: 'var(--warn)',
  info: 'var(--acc)', success: 'var(--ok)',
}

interface NoticeStackProps {
  notices: Notice[]
  onDismiss: (id: string) => void
}

export const NoticeStack: React.FC<NoticeStackProps> = ({ notices, onDismiss }) => {
  if (notices.length === 0) return null

  return (
    <div className="fz-mono flex flex-col gap-px items-end">
      {notices.slice(-4).reverse().map(n => (
        <NoticeRow key={n.id} notice={n} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

const NoticeRow: React.FC<{ notice: Notice; onDismiss: (id: string) => void }> = ({ notice: n, onDismiss }) => {
  // auto-dismiss em 5s (a não ser sticky)
  useEffect(() => {
    if (n.sticky) return
    const t = setTimeout(() => onDismiss(n.id), 5000)
    return () => clearTimeout(t)
  }, [n.id, n.sticky, onDismiss])

  return (
    <div
      className={`sh-notice ${n.severity === 'success' ? 'ok' : n.severity === 'error' ? 'error' : n.severity === 'warn' ? 'warn' : 'info'}`}
      style={{ maxWidth: 340, animation: 'fz-slide-up 0.18s ease' }}
    >
      {/* horário + fonte: só dados */}
      <span style={{ fontSize: 8, color: 'var(--tx-dim)' }}>
        {new Date().toLocaleTimeString('pt-BR', { hour12: false })}
      </span>
      <span style={{ fontSize: 9, color: 'var(--tx-dim)' }}>{n.source || 'sys'}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {n.title}
      </span>
      {n.detail && (
        <span style={{ fontSize: 9, color: 'var(--tx-mut)' }}>{n.detail}</span>
      )}
      {n.action && (
        <button
          className="sh-btn"
          style={{ height: 16, padding: '0 5px', fontSize: 9 }}
          onClick={(e) => { e.stopPropagation(); n.action!.onClick(); onDismiss(n.id) }}
        >
          {n.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(n.id)}
        aria-label="fechar"
        style={{ color: 'var(--tx-dim)', fontSize: 10, lineHeight: 1, padding: '0 2px', background: 'none', border: 'none', cursor: 'pointer' }}
      >✕</button>

      {/* barra de progresso do auto-dismiss (informação, não decoração) */}
      {!n.sticky && (
        <span style={{
          position: 'absolute', left: 0, bottom: 0, height: 1,
          width: '100%', background: SEV_BORDER[n.severity], opacity: .35,
          transformOrigin: 'left', animation: 'fz-notice-life 5s linear forwards',
        }} />
      )}
    </div>
  )
}

export default NoticeStack

// ---------- hook de gerenciamento ----------
export const useNotices = (limite = 12) => {
  const [notices, setNotices] = React.useState<Notice[]>([])

  const push = React.useCallback((n: Omit<Notice, 'id'> & { id?: string }) => {
    const id = n.id || Math.random().toString(36).slice(2)
    setNotices(prev => [...prev, { ...n, id } as Notice].slice(-limite))
  }, [limite])

  const dismiss = React.useCallback((id: string) => {
    setNotices(prev => prev.filter(x => x.id !== id))
  }, [])

  const clear = React.useCallback(() => setNotices([]), [])

  return { notices, push, dismiss, clear }
}
