// DeviceDrawer — Gaveta de dispositivos (desliza, buscável, categorizada)
// Consome /api/devices/types do backend.
import React, { useEffect, useState } from 'react'
import { Cpu, Zap, Gauge, Cog, Boxes, Camera, ChevronDown, Search, Magnet } from 'lucide-react'

interface DeviceType {
  type_id: string
  name: string
  category: string
}

interface DeviceDrawerProps {
  onDragDevice?: (typeId: string) => void
  onQuickAdd?: (typeId: string) => void
}

const CAT_ICON: Record<string, React.FC<any>> = {
  plc: Cpu, sensor: Gauge, actuator: Zap, drive: Cog,
  structure: Boxes, vision: Camera,
}
const CAT_COLOR: Record<string, string> = {
  plc: '#00D4FF', sensor: '#66BB6A', actuator: '#FFA726', drive: '#AB47BC',
  structure: '#6B7787', vision: '#FFCA28',
}

export const DeviceDrawer: React.FC<DeviceDrawerProps> = ({ onDragDevice, onQuickAdd }) => {
  const [types, setTypes] = useState<DeviceType[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/devices/types')
      .then(r => r.json())
      .then(d => { setTypes(d.types || []); setCategories(d.categories || []) })
      .catch(() => {
        // Fallback se backend offline
        setTypes([
          { type_id: 'clp_generic', name: 'CLP Genérico', category: 'plc' },
          { type_id: 'sensor_photoelectric', name: 'Sensor Fotoelétrico', category: 'sensor' },
          { type_id: 'vfd_generic', name: 'Inversor de Frequência', category: 'drive' },
          { type_id: 'motor_dc', name: 'Motor DC', category: 'actuator' },
          { type_id: 'conveyor_belt', name: 'Esteira', category: 'actuator' },
        ])
        setCategories(['plc', 'sensor', 'drive', 'actuator'])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = types.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.type_id.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-[#141922] border-r border-[#232C38]">
      {/* Cabeçalho da gaveta */}
      <div className="p-3 border-b border-[#232C38]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="fz-display text-sm text-[#D7DEE8]">Dispositivos</h2>
          <span className="text-[9px] font-mono text-[#6B7787]">{filtered.length}</span>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2 text-[#6B7787]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-[#0B0E13] border border-[#232C38] rounded text-[#D7DEE8] placeholder-[#6B7787] focus:outline-none focus:border-[#00E5FF]"
          />
        </div>
      </div>

      {/* Lista por categoria */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-3 text-[10px] text-[#6B7787] font-mono">Carregando catálogo...</div>}
        {!loading && categories.map(cat => {
          const items = filtered.filter(t => t.category === cat)
          if (!items.length) return null
          const Icon = CAT_ICON[cat] || Boxes
          const color = CAT_COLOR[cat] || '#6B7787'
          const isCollapsed = collapsed[cat]
          return (
            <div key={cat} className="border-b border-[#232C38]/50">
              <button
                onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1A2130] transition"
              >
                <Icon size={13} style={{ color }} />
                <span className="fz-label" style={{ color }}>{cat}</span>
                <span className="ml-auto text-[9px] font-mono text-[#6B7787]">{items.length}</span>
                <ChevronDown size={12} className={`text-[#6B7787] transition ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {!isCollapsed && (
                <div className="px-1.5 pb-2 space-y-0.5">
                  {items.map(t => (
                    <div
                      key={t.type_id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('deviceType', t.type_id)
                        setDragging(t.type_id)
                        onDragDevice?.(t.type_id)
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-grab group transition ${
                        dragging === t.type_id
                          ? 'bg-[#00E5FF]/15 border border-[#00E5FF]/40 opacity-60'
                          : 'hover:bg-[#1A2130] border border-transparent'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#D7DEE8] truncate group-hover:text-white">{t.name}</p>
                        <p className="text-[9px] font-mono text-[#6B7787] truncate">{t.type_id}</p>
                      </div>
                      <button
                        onClick={() => onQuickAdd?.(t.type_id)}
                        title="Adicionar rápido"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#6B7787] hover:text-[#00E5FF] transition"
                      >
                        <Magnet size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-center text-[10px] text-[#6B7787]">Nenhum dispositivo encontrado</div>
        )}
      </div>
    </div>
  )
}

export default DeviceDrawer