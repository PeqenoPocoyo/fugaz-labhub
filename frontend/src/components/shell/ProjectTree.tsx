// ProjectTree — árvore de projeto no padrão TIA Portal.
// Grupos por categoria, itens arrastáveis para a bancada, busca por nome.
// Consome /api/devices/types (a mesma fonte da gaveta antiga).
import React, { useEffect, useMemo, useState } from 'react'

interface DeviceType { type_id: string; name: string; category: string }

interface ProjectTreeProps {
  onSpawn: (typeId: string) => void
  onDragStart?: (typeId: string) => void
}

const CATS: { id: string; label: string; cor: string }[] = [
  { id: 'plc',         label: 'CLPs',            cor: 'var(--cat-plc)' },
  { id: 'sensor',      label: 'Sensores',        cor: 'var(--cat-sensor)' },
  { id: 'actuator',    label: 'Atuadores',       cor: 'var(--cat-actuator)' },
  { id: 'drive',       label: 'Drives',          cor: 'var(--cat-drive)' },
  { id: 'transmission',label: 'Transmissões',    cor: 'var(--cat-transmission)' },
  { id: 'vision',      label: 'Visão',           cor: 'var(--cat-vision)' },
  { id: 'structure',   label: 'Infraestrutura',  cor: 'var(--cat-structure)' },
  { id: 'mass',        label: 'Massas',          cor: 'var(--cat-other)' },
  { id: 'power',       label: 'Energia',         cor: 'var(--cat-other)' },
  { id: 'hmi',         label: 'IHM',             cor: 'var(--cat-other)' },
]

const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]))

export const ProjectTree: React.FC<ProjectTreeProps> = ({ onSpawn, onDragStart }) => {
  const [types, setTypes] = useState<DeviceType[]>([])
  const [query, setQuery] = useState('')
  const [abertos, setAbertos] = useState<Record<string, boolean>>({ sensor: true, actuator: true, structure: true })
  const [drag, setDrag] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/devices/types')
      .then(r => r.json())
      .then(d => setTypes(d.types || []))
      .catch(() => setTypes([]))
  }, [])

  // grupos = categorias presentes no catálogo, na ordem canônica
  const grupos = useMemo(() => {
    const filtro = query.trim().toLowerCase()
    const map = new Map<string, DeviceType[]>()
    for (const t of types) {
      if (filtro && !t.name.toLowerCase().includes(filtro) && !t.type_id.includes(filtro)) continue
      if (!map.has(t.category)) map.set(t.category, [])
      map.get(t.category)!.push(t)
    }
    return [...map.entries()].sort((a, b) => {
      const ia = CATS.findIndex(c => c.id === a[0]); const ib = CATS.findIndex(c => c.id === b[0])
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
  }, [types, query])

  const toggle = (id: string) => setAbertos(s => ({ ...s, [id]: !s[id] }))
  const buscaAtiva = query.trim().length > 0

  return (
    <div className="sh-panel sh-div-v" style={{ height: '100%' }}>
      <div className="sh-panel-head">
        <span className="fz-label">Projeto</span>
        <span className="fz-mono" style={{ fontSize: 9, color: 'var(--tx-dim)' }}>{types.length}</span>
      </div>

      {/* busca */}
      <div className="sh-div-h" style={{ padding: 6 }}>
        <div style={{ position: 'relative' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx-dim)"
            style={{ position: 'absolute', left: 7, top: 6 }}>
            <circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="M20 20l-3.5-3.5" strokeWidth="2" />
          </svg>
          <input className="sh-input fz-mono" placeholder="buscar dispositivo…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="sh-panel-body fz-sans">
        {grupos.length === 0 && (
          <div style={{ padding: 10, fontSize: 10, color: 'var(--tx-dim)' }}>
            {types.length === 0 ? 'catálogo indisponível' : 'nenhum resultado'}
          </div>
        )}

        {grupos.map(([cat, itens]) => {
          const info = CAT_MAP[cat] || { label: cat, cor: 'var(--cat-other)' }
          const aberto = buscaAtiva || !!abertos[cat]
          return (
            <div key={cat} className="sh-group">
              <div className="sh-group-head" onClick={() => toggle(cat)}>
                <span style={{ width: 8, color: 'var(--tx-dim)', fontSize: 8 }}>{aberto ? '▼' : '▶'}</span>
                <span className="sh-dot" style={{ background: info.cor }} />
                <span>{info.label}</span>
                <span className="sh-group-count fz-mono">{itens.length}</span>
              </div>
              {aberto && itens.map(t => (
                <div
                  key={t.type_id}
                  className={`sh-item${drag === t.type_id ? ' sh-item-drag' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('deviceType', t.type_id)
                    setDrag(t.type_id); onDragStart?.(t.type_id)
                  }}
                  onDragEnd={() => setDrag(null)}
                  onDoubleClick={() => onSpawn(t.type_id)}
                  title={`${t.name}\n${t.type_id}\nclique 2× para adicionar · arraste p/ bancada`}
                >
                  <span className="sh-dot" style={{ background: info.cor, opacity: .8 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </span>
                  <span className="fz-mono" style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--tx-dim)' }}>
                    {t.type_id.replace(/^.*?_/, '')}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="sh-div-h" style={{ padding: '4px 8px', fontSize: 9, color: 'var(--tx-dim)' }}>
        duplo clique adiciona · arraste p/ soltar
      </div>
    </div>
  )
}

export default ProjectTree
