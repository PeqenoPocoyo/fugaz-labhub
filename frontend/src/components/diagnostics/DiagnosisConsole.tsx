// DiagnosisConsole — Console de diagnóstico estilo osciloscópio
// Abas: Sinais | Log | Protocolos | Física. Ricos em detalhe, warn, erro.
import React, { useState, useRef, useEffect } from 'react'
import {
  Activity, Terminal, Radio, Thermometer, Play, Pause, Trash2,
  Search, AlertTriangle, XCircle, Info, Bug, ChevronUp, ChevronDown
} from 'lucide-react'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success'
export interface LogEntry {
  id: string
  time: string
  level: LogLevel
  source: string
  message: string
  detail?: string
}

interface DiagnosisConsoleProps {
  logs?: LogEntry[]
  onClear?: () => void
  tags?: { address: string; value: string; quality: string; updated?: string }[]
}

const LEVEL_STYLE: Record<LogLevel, { color: string; icon: React.FC<any>; label: string }> = {
  info:    { color: 'text-[#42A5F5]',  icon: Info,          label: 'INFO' },
  success: { color: 'text-[#26A69A]',  icon: Activity,      label: 'OK' },
  warn:    { color: 'text-[#FFCA28]',  icon: AlertTriangle, label: 'WARN' },
  error:   { color: 'text-[#EF5350]',  icon: XCircle,       label: 'ERROR' },
  debug:   { color: 'text-[#6B7787]',  icon: Bug,           label: 'DEBUG' },
}

const MOCK_LOGS: LogEntry[] = [
  { id: '1', time: '14:22:01.104', level: 'info', source: 'sim', message: 'Simulação iniciada (60 Hz passo fixo)' },
  { id: '2', time: '14:22:01.240', level: 'success', source: 'net', message: 'Backend conectado — 23 tipos de dispositivo' },
  { id: '3', time: '14:22:04.812', level: 'warn', source: 'clp', message: 'CLP slot 7 vazio — módulo COM ausente', detail: 'Protocolos não iniciados' },
  { id: '4', time: '14:22:05.003', level: 'debug', source: 'io', message: 'Porta rack_s1_p0 → valor=True (DI)' },
  { id: '5', time: '14:22:06.441', level: 'error', source: 'vfd', message: 'Falha externa (EF) — inverter desligado' },
]

const DiagnosisConsole: React.FC<DiagnosisConsoleProps> = ({
  logs = MOCK_LOGS, onClear, tags = []
}) => {
  const [tab, setTab] = useState<'signals' | 'log' | 'protocols' | 'physics'>('log')
  const [open, setOpen] = useState(true)
  const [paused, setPaused] = useState(false)
  const [query, setQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [physics, setPhysics] = useState({ temp: 25, pressure: 101325, current: 0 })
  const scopeRef = useRef<HTMLCanvasElement>(null)

  // Simulação de física ao vivo
  useEffect(() => {
    if (paused) return
    const iv = setInterval(() => {
      setPhysics(() => ({
        temp: 25 + Math.sin(Date.now() / 3000) * 3 + Math.random() * 0.4,
        pressure: 101325 + Math.sin(Date.now() / 2000) * 200,
        current: Math.random() * 2,
      }))
    }, 200)
    return () => clearInterval(iv)
  }, [paused])

  // Render osciloscópio
  useEffect(() => {
    if (tab !== 'signals' || !scopeRef.current) return
    const c = scopeRef.current
    const ctx = c.getContext('2d')
    if (!ctx) return
    const w = (c.width = c.offsetWidth), h = (c.height = c.offsetHeight)
    ctx.fillStyle = '#0B0E13'
    ctx.fillRect(0, 0, w, h)
    // grid
    ctx.strokeStyle = '#1A2130'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    // formas de onda mock
    const colors = ['#FFB300', '#66BB6A', '#29B6F6', '#AB47BC']
    colors.forEach((col, i) => {
      ctx.strokeStyle = col
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = 0; x < w; x++) {
        const y = h / 2 + (i + 1) * 12 * Math.sin((x / w) * Math.PI * 4 + Date.now() / (600 - i * 100))
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
  }, [tab, paused])

  const filtered = logs.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false
    if (query && !`${l.source} ${l.message}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const counts = logs.reduce((a, l) => ({ ...a, [l.level]: (a[l.level] || 0) + 1 }), {} as any)

  if (!open) {
    return (
      <div className="sh-console-tabs" style={{ background: 'var(--panel)' }}>
        <button onClick={() => setOpen(true)} className="text-[#6B7787] hover:text-white"><ChevronUp size={14} /></button>
        <span className="fz-label">Diagnóstico</span>
        {counts.error > 0 && <span className="text-[10px] font-mono text-[#EF5350]">{counts.error} erros</span>}
        {counts.warn > 0 && <span className="text-[10px] font-mono text-[#FFCA28]">{counts.warn} warns</span>}
      </div>
    )
  }

  return (
    <div className="shrink-0 bg-[#0B0E13] border-t border-[#232C38] flex flex-col" style={{ height: 220 }}>
      {/* Header de abas */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#141922] border-b border-[#232C38]">
        {[
          { id: 'signals', label: 'Sinais', icon: Activity },
          { id: 'log', label: 'Log', icon: Terminal, badge: (counts.error || 0) + (counts.warn || 0) },
          { id: 'protocols', label: 'Protocolos', icon: Radio },
          { id: 'physics', label: 'Física', icon: Thermometer },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition ${
              tab === t.id ? 'bg-[#00E5FF]/15 text-[#00E5FF]' : 'text-[#6B7787] hover:text-[#D7DEE8] hover:bg-[#1A2130]'
            }`}
          >
            <t.icon size={12} />
            {t.label}
            {t.badge ? <span className="text-[9px] font-mono px-1 bg-[#FFCA28]/20 text-[#FFCA28] rounded">{t.badge}</span> : null}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setPaused(p => !p)} title={paused ? 'Retomar' : 'Pausar'}
          className="p-1 text-[#6B7787] hover:text-white rounded hover:bg-[#1A2130]">
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        {onClear && (
          <button onClick={onClear} title="Limpar" className="p-1 text-[#6B7787] hover:text-[#EF5350] rounded hover:bg-[#1A2130]">
            <Trash2 size={13} />
          </button>
        )}
        <button onClick={() => setOpen(false)} title="Recolher" className="p-1 text-[#6B7787] hover:text-white rounded hover:bg-[#1A2130]">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-hidden relative">
        {tab === 'signals' && (
          <div className="w-full h-full relative">
            <canvas ref={scopeRef} className="w-full h-full" />
            <div className="absolute top-2 left-3 flex gap-3">
              {['CH1 elétrica', 'CH2 digital', 'CH3 pneumática', 'CH4 dados'].map((n, i) => (
                <span key={n} className="text-[9px] font-mono flex items-center gap-1" style={{ color: ['#FFB300','#66BB6A','#29B6F6','#AB47BC'][i] }}>
                  <span className="w-2 h-0.5" style={{ background: ['#FFB300','#66BB6A','#29B6F6','#AB47BC'][i] }} />{n}
                </span>
              ))}
            </div>
            {paused && <div className="absolute top-2 right-3 text-[9px] font-mono text-[#FFCA28]">█ PAUSADO</div>}
          </div>
        )}

        {tab === 'log' && (
          <div className="flex flex-col h-full">
            {/* Filtros */}
            <div className="flex items-center gap-1.5 px-2 py-1 border-b border-[#232C38]/60 bg-[#0B0E13]">
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1.5 text-[#6B7787]" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar..."
                  className="w-40 pl-6 pr-2 py-1 text-[10px] font-mono bg-[#141922] border border-[#232C38] rounded text-[#D7DEE8] placeholder-[#6B7787] focus:outline-none focus:border-[#00E5FF]" />
              </div>
              {(['all','info','warn','error','debug'] as const).map(lv => (
                <button key={lv} onClick={() => setLevelFilter(lv as any)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono uppercase rounded transition ${
                    levelFilter === lv ? 'bg-[#00E5FF]/15 text-[#00E5FF]' : 'text-[#6B7787] hover:text-[#D7DEE8]'
                  }`}>
                  {lv}
                </button>
              ))}
              <span className="ml-auto text-[9px] font-mono text-[#6B7787]">{filtered.length}/{logs.length}</span>
            </div>
            {/* Stream */}
            <div className="flex-1 overflow-y-auto font-mono text-[10px] leading-relaxed p-1">
              {filtered.map(l => {
                const st = LEVEL_STYLE[l.level]
                return (
                  <div key={l.id}
                    onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                    className="flex items-start gap-2 px-1.5 py-0.5 rounded hover:bg-[#141922] cursor-pointer group">
                    <span className="text-[#6B7787] shrink-0">{l.time}</span>
                    <span className={`${st.color} shrink-0 w-11 font-semibold`}>{st.label}</span>
                    <span className="text-[#6B7787] shrink-0 w-10">[{l.source}]</span>
                    <span className={`flex-1 ${l.level === 'error' ? 'text-[#EF5350]' : l.level === 'warn' ? 'text-[#FFCA28]' : 'text-[#D7DEE8]'}`}>
                      {l.message}
                    </span>
                    {expanded === l.id && l.detail && (
                      <span className="text-[#6B7787] italic">↳ {l.detail}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'protocols' && (
          <div className="h-full overflow-auto font-mono text-[10px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#141922] text-[#6B7787]">
                <tr><th className="text-left px-2 py-1">Endereço</th><th className="text-left px-2 py-1">Valor</th><th className="text-left px-2 py-1">Qualidade</th><th className="text-left px-2 py-1">Atualizado</th></tr>
              </thead>
              <tbody>
                {(tags.length ? tags : [
                  { address: 'hr:0', value: '1', quality: 'good' },
                  { address: 'co:0', value: '0', quality: 'good' },
                ]).map(t => (
                  <tr key={t.address} className="border-b border-[#232C38]/40 hover:bg-[#141922]">
                    <td className="px-2 py-1 text-[#AB47BC]">{t.address}</td>
                    <td className="px-2 py-1 text-[#D7DEE8]">{t.value}</td>
                    <td className="px-2 py-1 text-[#26A69A]">{t.quality}</td>
                    <td className="px-2 py-1 text-[#6B7787]">{t.updated}</td>
                  </tr>
                ))}
                {tags.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-4 text-center text-[#6B7787]">Nenhum servidor de protocolo ativo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'physics' && (
          <div className="grid grid-cols-3 gap-2 p-3 h-full">
            {[
              { label: 'Temperatura', value: `${physics.temp.toFixed(1)}°C`, color: '#FFA726', pct: (physics.temp / 100) * 100 },
              { label: 'Pressão', value: `${(physics.pressure / 1000).toFixed(1)} kPa`, color: '#29B6F6', pct: 72 },
              { label: 'Corrente', value: `${physics.current.toFixed(2)} A`, color: '#FFB300', pct: (physics.current / 5) * 100 },
            ].map(m => (
              <div key={m.label} className="bg-[#141922] border border-[#232C38] rounded p-2 flex flex-col justify-between">
                <span className="fz-label">{m.label}</span>
                <span className="fz-value text-lg" style={{ color: m.color }}>{m.value}</span>
                <div className="h-1 bg-[#232C38] rounded overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${Math.min(100, m.pct)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagnosisConsole