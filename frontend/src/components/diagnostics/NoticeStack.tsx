// NoticeStack — Notificações ricas e acionáveis (substitui toast genérico)
// Cada notice tem severidade, fonte, ação opcional, e persiste até resolvido.
import React, { useState } from 'react'
import {
  AlertOctagon, AlertTriangle, Info, CheckCircle2, Wrench, X, ChevronRight
} from 'lucide-react'

export type Severity = 'error' | 'warn' | 'info' | 'success'
export interface Notice {
  id: string
  severity: Severity
  title: string
  detail?: string
  source?: string
  action?: { label: string; onClick: () => void }
  sticky?: boolean  // não desaparece sozinho
  progress?: number // 0-1 para auto-dismiss
}

const SEV: Record<Severity, { color: string; bg: string; border: string; icon: React.FC<any> }> = {
  error:   { color: '#EF5350', bg: 'rgba(239,83,80,0.12)',  border: '#EF5350', icon: AlertOctagon },
  warn:    { color: '#FFCA28', bg: 'rgba(255,202,40,0.10)', border: '#FFCA28', icon: AlertTriangle },
  info:    { color: '#42A5F5', bg: 'rgba(66,165,245,0.10)', border: '#42A5F5', icon: Info },
  success: { color: '#26A69A', bg: 'rgba(38,166,154,0.10)', border: '#26A69A', icon: CheckCircle2 },
}

interface NoticeStackProps {
  notices: Notice[]
  onDismiss: (id: string) => void
}

export const NoticeStack: React.FC<NoticeStackProps> = ({ notices, onDismiss }) => {
  return (
    <div className="absolute top-3 right-3 z-[70] flex flex-col gap-2 w-72 pointer-events-none">
      {notices.map(n => {
        const s = SEV[n.severity]
        return (
          <div
            key={n.id}
            className="pointer-events-auto relative overflow-hidden backdrop-blur-sm rounded-md shadow-lg"
            style={{
              background: 'rgba(20,25,34,0.92)',
              border: `1px solid ${s.border}`,
              borderLeft: `3px solid ${s.color}`,
              animation: 'fz-slide-up 0.28s var(--fz-ease)',
            }}
          >
            {/* faixa de severidade */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: s.color }} />
            <div className="flex items-start gap-2 p-2.5 pl-3">
              <s.icon size={15} style={{ color: s.color }} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: s.color }}>{n.title}</span>
                  {n.source && <span className="text-[9px] font-mono px-1 rounded" style={{ background: s.bg, color: s.color }}>{n.source}</span>}
                </div>
                {n.detail && <p className="text-[10px] text-[#6B7787] mt-0.5 leading-snug">{n.detail}</p>}
                {n.action && (
                  <button
                    onClick={n.action.onClick}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded transition hover:brightness-125"
                    style={{ background: s.bg, color: s.color }}
                  >
                    <Wrench size={10} /> {n.action.label} <ChevronRight size={10} />
                  </button>
                )}
              </div>
              <button onClick={() => onDismiss(n.id)} className="text-[#6B7787] hover:text-white shrink-0">
                <X size={13} />
              </button>
            </div>
            {/* barra de progresso auto-dismiss */}
            {typeof n.progress === 'number' && (
              <div className="h-0.5 bg-[#232C38]">
                <div className="h-full" style={{ width: `${n.progress * 100}%`, background: s.color }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Hook de uso simples
export const useNotices = () => {
  const [notices, setNotices] = useState<Notice[]>([])
  const push = (n: Omit<Notice, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setNotices(prev => [...prev, { ...n, id }])
    return id
  }
  const dismiss = (id: string) => setNotices(prev => prev.filter(n => n.id !== id))
  return { notices, push, dismiss }
}

export default NoticeStack