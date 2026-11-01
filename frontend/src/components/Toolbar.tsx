// Toolbar — Barra de ferramentas
import React from 'react'
import { MousePointer, Move, RotateCw, Link, Trash2, Grid3X3 } from 'lucide-react'

const tools = [
  { id: 'select', icon: MousePointer, label: 'Selecionar' },
  { id: 'move', icon: Move, label: 'Mover' },
  { id: 'rotate', icon: RotateCw, label: 'Rotacionar' },
  { id: 'connect', icon: Link, label: 'Conectar' },
  { id: 'delete', icon: Trash2, label: 'Deletar' },
  { id: 'grid', icon: Grid3X3, label: 'Grid' },
]

const Toolbar: React.FC = () => {
  const [activeTool, setActiveTool] = React.useState('select')

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1A1F2E]/90 backdrop-blur-sm border border-[#2D3748] rounded-xl px-2 py-1.5 flex items-center gap-1 shadow-xl">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`p-2 rounded-lg transition-all ${
            activeTool === tool.id
              ? 'bg-[#00D4FF]/20 text-[#00D4FF] glow-primary'
              : 'text-gray-400 hover:text-white hover:bg-[#2D3748]'
          }`}
          title={tool.label}
        >
          <tool.icon size={18} />
        </button>
      ))}
      <div className="w-px h-6 bg-[#2D3748] mx-1" />
      <button className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#2D3748] rounded-lg transition">
        Zoom Fit
      </button>
    </div>
  )
}

export default Toolbar
