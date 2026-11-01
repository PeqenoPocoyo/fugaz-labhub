// CameraPiP — Preview ao vivo da câmera (Picture-in-Picture).
// A cena é renderizada uma SEGUNDA vez, do ponto de vista FIXO da câmera:
// mesma posição/yaw/pitch/fov do backend. Por cima, o overlay 2D com as
// detecções (fitas, marcadores) devolvidas por /api/vision/references/{id}.
import React, { useEffect, useState, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObject, Connection, MountSlotView, ConduitView, DrivetrainView } from '../../store/sceneStore'
import { BenchScene } from './BenchScene'

interface Detection {
  reference_id: string
  type: string
  label: string
  detector: string
  confidence: number
  bbox: [number, number, number, number]
  world_position: [number, number, number]
  distance_m: number
}

interface CameraPiPProps {
  camera: SceneObject | null
  objects: Record<string, SceneObject>
  connections: Connection[]
  slots: MountSlotView[]
  conduits: ConduitView[]
  drivetrains: DrivetrainView[]
  onClose: () => void
}

/** Aponta a câmera three.js exatamente na direção do backend */
const FixedViewCamera: React.FC<{ position: [number, number, number]; yaw: number; pitch: number; fov: number }> = ({ position, yaw, pitch, fov }) => {
  const { camera } = useThree()
  useMemo(() => {
    const y = THREE.MathUtils.degToRad(yaw)
    const p = THREE.MathUtils.degToRad(pitch)
    // mesma base do backend: forward = (sin·cos, sin, cos·cos)
    const f = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p))
    camera.position.set(...position)
    camera.lookAt(
      position[0] + f.x,
      position[1] + f.y,
      position[2] + f.z,
    )
    camera.updateProjectionMatrix()
  }, [camera, position, yaw, pitch, fov])
  return null
}

const POLL_MS = 500

export const CameraPiP: React.FC<CameraPiPProps> = ({
  camera, objects, connections, slots, conduits, drivetrains, onClose,
}) => {
  const [detections, setDetections] = useState<Detection[]>([])
  const [error, setError] = useState('')

  const yaw = Number(camera?.properties?.yaw_deg ?? 0)
  const pitch = Number(camera?.properties?.pitch_deg ?? -15)
  const fov = Number(camera?.properties?.fov_deg ?? 60)
  const pos = camera?.position || [4, 2.5, 4]

  // Poll das detecções reais do backend
  useEffect(() => {
    if (!camera) return
    let alive = true
    const fetchDetections = async () => {
      try {
        const r = await fetch(`/api/vision/references/${camera.id}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        if (alive) {
          setDetections(data.detections || [])
          setError('')
        }
      } catch (e) {
        if (alive) setError('detecção offline')
      }
    }
    fetchDetections()
    const iv = setInterval(fetchDetections, POLL_MS)
    return () => { alive = false; clearInterval(iv) }
  }, [camera])

  if (!camera) return null

  return (
    <div className="relative w-[340px] h-[240px] bg-[#0B0E13] border border-[#FFCA28]/40 rounded-lg overflow-hidden shadow-[0_0_24px_rgba(255,202,40,0.15)]">
      {/* Cabeçalho */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-[#0B0E13]/85">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-pulse" />
          <span className="text-[9px] font-mono text-[#FFCA28] tracking-wider">
            CAM {camera.id.slice(-6).toUpperCase()} · {fov}°
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar preview da câmera"
          className="text-[10px] text-[#8A94A6] hover:text-[#E53935] font-mono"
        >
          ✕
        </button>
      </div>

      {/* Render 2 — vista fixa da câmera */}
      <Canvas
        camera={{ fov, near: 0.05, far: 120 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: false, powerPreference: 'low-power' }}
      >
        <FixedViewCamera position={pos} yaw={yaw} pitch={pitch} fov={fov} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 6, 2]} intensity={0.7} />
        <hemisphereLight args={['#B8C4D4', '#1A2130', 0.5]} />
        {/* grade de referência sutil (chão) */}
        <gridHelper args={[30, 30, '#1A2130', '#141922']} />
        <BenchScene
          objects={objects}
          connections={connections}
          slots={slots}
          conduits={conduits}
          drivetrains={drivetrains}
          selectedId={null}
          onSelect={() => {}}
        />
      </Canvas>

      {/* Overlay 2D das detecções */}
      {detections.map((d) => {
        const [x, y, w, h] = d.bbox
        return (
          <div
            key={d.reference_id}
            className="absolute border border-[#66BB6A] pointer-events-none"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
            }}
          >
            <span className="absolute -top-3 left-0 text-[7px] font-mono bg-[#0B0E13]/85 text-[#66BB6A] px-1 rounded whitespace-nowrap">
              {d.label} · {(d.confidence * 100).toFixed(0)}% · {d.distance_m}m
            </span>
          </div>
        )
      })}

      {/* Rodapé de status */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-[#0B0E13]/85">
        <span className="text-[8px] font-mono text-[#8A94A6]">
          {camera.properties?.resolution?.join('×') || '640×480'} · {camera.properties?.fps || 30}fps
        </span>
        <span className={`text-[8px] font-mono ${error ? 'text-[#E53935]' : 'text-[#66BB6A]'}`}>
          {error || `${detections.length} detec${detections.length === 1 ? 'ção' : 'ções'}`}
        </span>
      </div>

      {/* Scanline decorativa */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_3px)]" />
    </div>
  )
}

export default CameraPiP
