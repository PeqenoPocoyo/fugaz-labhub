// useWorldSync — Sincroniza a bancada com o mundo REAL do backend.
// Faz poll de /api/world/ e reflete nós + conexões na store da cena.
import { useEffect, useRef, useCallback } from 'react'
import { useSceneStore, SceneObject, Connection, MountSlotView, ConduitView, DrivetrainView } from '../store/sceneStore'

interface WorldNode {
  id: string
  name: string
  category: string
  transform: { position: number[]; rotation: number[]; scale: number[] }
  properties: Record<string, any>
  layer: string
  ports: Record<string, any>
  fixations?: any[]
  slots?: any[]
  conduit_path?: number[][] | null
  type_id?: string
}

interface WorldConnection {
  id: string
  from_port: string
  to_port: string
  domain: string
  from_device: string
  to_device: string
  properties: Record<string, any>
}

const POLL_MS = 400

/** Gera posição determinística e estável para um nó (evita sobreposição) */
function slotFor(index: number): [number, number, number] {
  const cols = 6
  const x = ((index % cols) - (cols - 1) / 2) * 1.6
  const z = (Math.floor(index / cols) - 1) * 1.6
  return [x, 0.5, z]
}

/** Tamanho do bloco por categoria (placeholder até modelos 3D) */
function scaleFor(category: string): [number, number, number] {
  switch (category) {
    case 'plc': return [0.9, 0.7, 0.6]
    case 'drive': return [0.8, 1.1, 0.7]
    case 'sensor': return [0.35, 0.7, 0.35]
    case 'actuator': return [0.7, 0.7, 0.9]
    case 'vision': return [0.6, 0.5, 0.6]
    default: return [0.6, 0.6, 0.6]
  }
}

export const useWorldSync = (enabled = true, intervalMs = POLL_MS) => {
  const { setWorld, setConnections, setSlots, setConduits, setDrivetrains } = useSceneStore()
  const indexRef = useRef<Map<string, number>>(new Map())
  const failCount = useRef(0)

  const sync = useCallback(async () => {
    try {
      const r = await fetch('/api/world/')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      failCount.current = 0

      const nodes: Record<string, WorldNode> = data.nodes || {}
      const conns: WorldConnection[] = (data.connections?.connections) || []

      // Índices estáveis por ID de nó
      const objs: Record<string, SceneObject> = {}
      for (const [id, n] of Object.entries(nodes)) {
        let idx = indexRef.current.get(id)
        if (idx === undefined) {
          idx = indexRef.current.size
          indexRef.current.set(id, idx)
        }
        const bpos = n.transform?.position
        const hasPos = Array.isArray(bpos) && bpos.length === 3 && (bpos[0] !== 0 || bpos[2] !== 0)
        objs[id] = {
          id,
          type: (n.name || id).slice(0, 24),
          type_id: n.type_id || '',
          position: (hasPos ? bpos : slotFor(idx)) as [number, number, number],
          rotation: [0, 0, 0],
          scale: (n.transform?.scale?.length === 3 ? n.transform.scale : scaleFor(n.category)) as [number, number, number],
          properties: n.properties || {},
          layer: n.layer || 'devices',
          category: n.category || 'other',
        }
      }

      // Remove índices de nós que não existem mais
      for (const id of [...indexRef.current.keys()]) {
        if (!nodes[id]) indexRef.current.delete(id)
      }

      // Conexões reais → fios ligam as BORDAS dos blocos (não o centro)
      const positions: Record<string, [number, number, number]> = {}
      for (const [id, o] of Object.entries(objs)) positions[id] = o.position

      const wires: Connection[] = conns
        .map(c => {
          const a = positions[c.from_device]
          const b = positions[c.to_device]
          if (!a || !b) return null
          // Direção normalizada A→B
          let dx = b[0] - a[0], dz = b[2] - a[2]
          const len = Math.hypot(dx, dz) || 1
          dx /= len; dz /= len
          // Recua 0.4 de cada lado para fora do bloco
          const inset = 0.4
          return {
            id: c.id,
            from: [a[0] + dx * inset, a[1] + 0.1, a[2] + dz * inset] as [number, number, number],
            to: [b[0] - dx * inset, b[1] + 0.1, b[2] - dz * inset] as [number, number, number],
            domain: (c.domain || 'signal') as any,
            properties: c.properties || {},
          }
        })
        .filter(Boolean) as Connection[]

      // Slots de fixação (magnéticos) de todos os nós de infraestrutura
      const slotViews: MountSlotView[] = []
      const conduitViews: ConduitView[] = []
      for (const [id, n] of Object.entries(nodes)) {
        const pos = (objs[id]?.position || [0, 0.5, 0]) as [number, number, number]
        for (const s of (n.slots || [])) {
          const sp = Array.isArray(s.position) && s.position.length === 3 ? s.position : pos
          slotViews.push({
            id: s.id, device_id: id,
            position: [sp[0], sp[1], sp[2]] as [number, number, number],
            occupied: s.occupied_by != null && s.occupied_by !== '',
            label: s.label || '', accepts: s.accepts || [],
          })
        }
        const cp = n.conduit_path
        if (Array.isArray(cp) && cp.length >= 2) {
          conduitViews.push({
            id: `${id}_conduit`,
            path: cp.map(p => [p[0], p[1], p[2]] as [number, number, number]),
            kind: (n.type_id || '').includes('cable_tray') ? 'cable_tray' : 'conduit',
          })
        }
      }

      setWorld(objs)
      setConnections(wires)
      setSlots(slotViews)
      setConduits(conduitViews)
      const trains: DrivetrainView[] = Array.isArray(data.drivetrains) ? data.drivetrains : []
      setDrivetrains(trains)
    } catch (e) {
      failCount.current++
      // Após 3 falhas, limpa a bancada (backend offline)
      if (failCount.current >= 3) { setWorld({}); setConnections([]) }
    }
  }, [setWorld, setConnections, setSlots, setConduits, setDrivetrains])

  useEffect(() => {
    if (!enabled) return
    sync()
    const iv = setInterval(sync, intervalMs)
    return () => clearInterval(iv)
  }, [enabled, intervalMs, sync])
}

export default useWorldSync