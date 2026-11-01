// CommandPalette — Palette de comandos (Ctrl/Cmd+K). Ações rápidas sem mouse.
import React, { useState, useEffect, useMemo } from 'react'
import { Command } from 'lucide-react'

interface Command {
  id: string
  label: string
  hint?: string
  icon: React.FC<any>
  group: string
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  const filtered = useMemo(() =>
    commands.filter(c => `${c.group} ${c.label} ${c.hint || ''}`.toLowerCase().includes(q.toLowerCase())),
    [commands, q])

  useEffect(() => { setSel(0) }, [q])
  useEffect(() => { if (open) { setQ(''); setSel(0) } }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); filtered[sel]?.run(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, sel, onClose])

  if (!open) return null

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[520px] max-w-[92vw] bg-[#141922] border border-[#232C38] rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fz-slide-up 0.2s var(--fz-ease)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#232C38]">
          <Command size={15} className="text-[#00E5FF]" />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Digite um comando ou busque dispositivo..."
            className="flex-1 bg-transparent text-[13px] text-[#D7DEE8] placeholder-[#6B7787] outline-none"
          />
          <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#232C38] text-[#6B7787]">ESC</kbd>
        </div>

        {/* Lista */}
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[11px] text-[#6B7787]">Nenhum comando encontrado</div>
          )}
          {filtered.map((c, i) => {
            const showGroup = c.group !== lastGroup
            lastGroup = c.group
            return (
              <div key={c.id}>
                {showGroup && <div className="fz-label px-3 pt-2 pb-1">{c.group}</div>}
                <button
                  onClick={() => { c.run(); onClose() }}
                  onMouseEnter={() => setSel(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition ${
                    sel === i ? 'bg-[#00E5FF]/12' : ''
                  }`}
                >
                  <c.icon size={14} className={sel === i ? 'text-[#00E5FF]' : 'text-[#6B7787]'} />
                  <span className="text-[12px] text-[#D7DEE8] flex-1">{c.label}</span>
                  {c.hint && <span className="text-[10px] font-mono text-[#6B7787]">{c.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>

        {/* Rodapé */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-[#232C38] bg-[#0B0E13] text-[9px] font-mono text-[#6B7787]">
          <span>↑↓ navegar</span><span>↵ executar</span><span className="ml-auto">{filtered.length} comandos</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette