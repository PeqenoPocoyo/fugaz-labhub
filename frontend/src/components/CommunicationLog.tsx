// CommunicationLog — Log de comunicação industrial
import React, { useState, useRef, useEffect } from 'react'
import { Terminal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'error' | 'warning' | 'data'
  message: string
}

const CommunicationLog: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Fugaz LABHUB iniciado' },
    { id: '2', timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Aguardando conexão com backend...' },
  ])
  const [isExpanded, setIsExpanded] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const clearLogs = () => setLogs([])

  const typeColors: Record<string, string> = {
    info: 'text-gray-400',
    success: 'text-[#10B981]',
    error: 'text-[#EF4444]',
    warning: 'text-[#F59E0B]',
    data: 'text-[#00D4FF]',
  }

  const typeIcons: Record<string, string> = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warning: '⚠',
    data: '→',
  }

  return (
    <div className="border-t border-[#2D3748]">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#2D3748]/50 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal size={14} /> Log de Comunicação
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); clearLogs() }}
            className="p-0.5 text-gray-500 hover:text-[#EF4444] transition"
          >
            <Trash2 size={12} />
          </button>
          {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      {isExpanded && (
        <div className="h-32 overflow-y-auto bg-[#0A0E17] p-2 font-mono text-[10px]">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 mb-0.5">
              <span className="text-gray-600 shrink-0">{log.timestamp}</span>
              <span className={`${typeColors[log.type]} shrink-0`}>{typeIcons[log.type]}</span>
              <span className={typeColors[log.type]}>{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  )
}

export default CommunicationLog
