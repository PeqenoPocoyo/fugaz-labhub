// BenchScene — Bancada: dispositivos + fios vivos + anéis magnéticos + dutos/calhas
// + malhas especializadas (esteiras escaláveis, transmissões, visão, fluidos)
// + ligações mecânicas do trem de força.
// Recebe tudo por PROPS (App assina a store) — evita problema de reconciler R3F.
import React, { useRef, useEffect } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneObject, MountSlotView, ConduitView, Connection, DrivetrainView } from '../../store/sceneStore'
import { LiveWire, WireDomain } from './LiveWire'
import { MagneticSnap } from './MagneticSnap'
import { ConduitRun } from './ConduitRun'
import {
  ConveyorMesh, RollerConveyorMesh, TransmissionMesh, TapeMesh, MarkerMesh,
  TargetMesh, CornerMesh, DuctMesh, PumpMesh, ValveMesh, TankMesh, MechanicalBond,
} from './SceneElements'
import { ModeloReceita } from './ModelKit'
import { receitaPara } from './recipes'
import { PortAnchors } from './PortAnchors'
import { WireGrab } from './WireGrab'

/** Sonda de performance — expõe o renderer para medir calls/triângulos */
const PerfProbe: React.FC = () => {
  const gl = useThree(s => s.gl)
  useEffect(() => {
    ;(window as any).__renderer = gl
  }, [gl])
  return null
}

const CAT_COLOR: Record<string, string> = {
  plc: '#00D4FF', sensor: '#66BB6A', actuator: '#FFA726', drive: '#AB47BC',
  structure: '#6B7787', vision: '#FFCA28', mass: '#EC407A', power: '#FFB300',
  transmission: '#FF7043',
}

/** Tipos com malha própria (não renderizam o bloco genérico) */
const SPECIALIZED: Record<string, React.FC<{ obj: SceneObject }>> = {
  conveyor_belt: ConveyorMesh,
  conveyor_roller: RollerConveyorMesh,
  trans_gears: TransmissionMesh,
  trans_belt: TransmissionMesh,
  trans_chain: TransmissionMesh,
  trans_coupling: TransmissionMesh,
  trans_screw: TransmissionMesh,
  trans_linear_actuator: TransmissionMesh,
  vision_tape: TapeMesh,
  vision_marker: MarkerMesh,
  vision_target: TargetMesh,
  vision_corner: CornerMesh,
  duct: DuctMesh,
  pump_centrifugal: PumpMesh,
  pump_dosing: PumpMesh,
  valve_control: ValveMesh,
  tank: TankMesh,
}

/** Pipeline A: dispositivos modelados por receita declarativa */
const RECIPE_TYPES = [
  'motor_dc', 'motor_ac', 'motor_stepper', 'motor_servo',
  'sensor_photoelectric', 'sensor_photoelectric_receptor', 'sensor_inductive',
  'sensor_limit_switch', 'sensor_temperature', 'sensor_pressure', 'sensor_encoder',
  'cylinder_pneumatic', 'valve_pneumatic_5_2', 'camera_ip',
  'clp_generic', 'vfd_generic',
  'infra_base_plate', 'infra_din_rail', 'infra_i_beam', 'infra_pillar', 'infra_profile_alu',
  'sensor_capacitive', 'sensor_emergency_button', 'sensor_level', 'sensor_load_cell',
  'cylinder_hydraulic', 'actuator_linear', 'pump_dosing', 'soft_starter', 'flange',
]

const RecipeMesh: React.FC<{
  obj: SceneObject; selected: boolean
  onSelect: (id: string) => void
  onPortDown?: (portId: string) => void
  onPortClick?: (portId: string) => void
}> = ({ obj, selected, onSelect, onPortDown, onPortClick }) => {
  const receita = receitaPara(obj.type_id || '', obj.properties)
  if (!receita) return null
  // backend guarda rotação em GRAUS; three.js usa RADIANOS
  const rad: [number, number, number] = [
    THREE.MathUtils.degToRad(obj.rotation?.[0] ?? 0),
    THREE.MathUtils.degToRad(obj.rotation?.[1] ?? 0),
    THREE.MathUtils.degToRad(obj.rotation?.[2] ?? 0),
  ]
  return (
    <group position={obj.position} rotation={rad}>
      {/* toda a peça é clicável (evento sobe das malhas filhas) */}
      <group onClick={(e) => { e.stopPropagation(); onSelect(obj.id) }}>
        <ModeloReceita receita={receita} onPortDown={onPortDown} onPortClick={onPortClick} />
      </group>
      {/* etiqueta flutuante */}
      <Html position={[0, 0.45, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div className="flex items-center gap-1 bg-[#141922]/85 border rounded px-1.5 py-0.5 whitespace-nowrap"
          style={{ borderColor: selected ? '#00E5FF' : '#232C38' }}>
          <span className="w-1.5 h-1.5 rounded-sm" style={{ background: selected ? '#00E5FF' : '#6B7787' }} />
          <span className="text-[9px] font-mono text-[#D7DEE8]">{String(obj.type).slice(0, 16)}</span>
        </div>
      </Html>
    </group>
  )
}

/** Mapeia domínio do backend para WireDomain do fio */
function toWireDomain(d: string): WireDomain {
  if (['electrical', 'pneumatic', 'hydraulic', 'data'].includes(d)) return d as WireDomain
  return 'signal'
}

const NodeMesh: React.FC<{ id: string; obj: SceneObject; onSelect: (id: string) => void; selected: boolean }> = ({ id, obj, onSelect, selected }) => {
  const ref = useRef<any>(null)
  const color = CAT_COLOR[obj.category || ''] || '#6B7787'
  const [px, py, pz] = obj.position
  const [sx, sy, sz] = obj.scale

  useFrame((s) => {
    if (ref.current && selected) {
      ref.current.position.y = py + Math.sin(s.clock.elapsedTime * 3) * 0.03
    }
  })

  return (
    <group>
      <group position={[px, py, pz]} rotation={obj.rotation}>
        {/* Sombra de contato no chão */}
        <mesh position={[0, -py + 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[sx * 1.4, sz * 1.4]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>

        <mesh
          ref={ref}
          onClick={(e) => { e.stopPropagation(); onSelect(id) }}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial
            color={color}
            metalness={0.6}
            roughness={0.35}
            emissive={selected ? '#00E5FF' : color}
            emissiveIntensity={selected ? 0.4 : 0.07}
          />
        </mesh>

        {/* Aro de seleção no chão */}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -py + 0.02, 0]}>
            <ringGeometry args={[Math.max(sx, sz) * 0.85, Math.max(sx, sz) * 1.0, 40]} />
            <meshBasicMaterial color="#00E5FF" transparent opacity={0.55} side={2} />
          </mesh>
        )}

        {/* Etiqueta flutuante */}
        <Html position={[0, sy / 2 + 0.22, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1 bg-[#141922]/85 border border-[#232C38] rounded px-1.5 py-0.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-sm" style={{ background: color }} />
            <span className="text-[9px] font-mono text-[#D7DEE8]">{String(obj.type).slice(0, 16)}</span>
          </div>
        </Html>
      </group>
    </group>
  )
}

interface BenchSceneProps {
  objects: Record<string, SceneObject>
  connections: Connection[]
  slots: MountSlotView[]
  conduits: ConduitView[]
  drivetrains: DrivetrainView[]
  selectedId: string | null
  fiaçãoDe: string | null
  onSelect: (id: string) => void
  onIniciarFiação: (qualifiedId: string) => void
  onConectar: (alvo: string) => void
  onCancelarFiação: () => void
  onRotaFio: (connectionId: string, path: [number, number, number][]) => void
  /** arrastar um borne do modelo (id do dispositivo, id da porta) */
  onPortDownModelo: (deviceId: string, portId: string) => void
}

export const BenchScene: React.FC<BenchSceneProps> = ({
  objects, connections, slots, conduits, drivetrains, selectedId, fiaçãoDe,
  onSelect, onIniciarFiação, onConectar, onCancelarFiação, onRotaFio, onPortDownModelo,
}) => {
  const nodes = Object.entries(objects)
  const freeSlots = slots.filter(s => !s.occupied)

  // Ligações mecânicas do trem de força (fonte → transmissões → carga)
  const bonds = drivetrains.map(d => {
    const src = objects[d.source_id]
    const tgt = objects[d.target_id]
    if (!src || !tgt) return null
    const via = d.transmissions
      .map(tid => objects[tid])
      .filter(Boolean)
      .map(o => o.position)
    // razão total = produto das razões das transmissões
    let ratio = 1
    for (const t of d.transmissions) {
      const o = objects[t]
      if (o && o.properties?.ratio) ratio *= Number(o.properties.ratio) || 1
    }
    return { id: d.id, src: src.position, via, tgt: tgt.position, ratio }
  }).filter(Boolean) as any[]

  return (
    <group onClick={() => onSelect('')}>
      <PerfProbe />

      {/* Dutos e calhas (infra de condução) */}
      {conduits.map(c => (
        <ConduitRun key={c.id} path={c.path} kind={c.kind as any} />
      ))}

      {/* Ligações mecânicas (trem de força) */}
      {bonds.map(b => (
        <MechanicalBond key={b.id} from={b.src} via={b.via} to={b.tgt} ratio={b.ratio} />
      ))}

      {/* Fios vivos (conexões reais) */}
      {connections.map(c => (
        <group key={c.id}>
          <LiveWire
            from={c.from}
            to={c.to}
            domain={toWireDomain(c.domain)}
            active
            gauge={c.domain === 'hydraulic' ? 1.6 : c.domain === 'data' ? 0.6 : 1}
            waypoints={c.properties?.path}
          />
          <WireGrab
            wireId={c.id}
            from={c.from}
            to={c.to}
            waypoints={c.properties?.path}
            onCommit={(path) => onRotaFio(c.id, path)}
          />
        </group>
      ))}

      {/* Anéis magnéticos nos slots LIVRES (convite ao encaixe) */}
      {freeSlots.map(s => (
        <MagneticSnap key={s.id} position={s.position} label={s.label || undefined} />
      ))}

      {/* Portas visíveis + pré-acoplamento (modo fiação) */}
      <PortAnchors
        objects={objects}
        fiaçãoDe={fiaçãoDe}
        onIniciarFiação={onIniciarFiação}
        onConectar={onConectar}
        onCancelar={onCancelarFiação}
        bornesNoModelo
      />

      {/* Dispositivos — especializados têm malha própria */}
      {nodes.map(([id, obj]) => {
        const Special = obj.type_id ? SPECIALIZED[obj.type_id] : undefined
        if (Special) return <Special key={id} obj={obj} />
        if (obj.type_id && RECIPE_TYPES.includes(obj.type_id)) {
          return (
            <RecipeMesh
              key={id}
              obj={obj}
              selected={selectedId === id}
              onSelect={onSelect}
              onPortDown={(pid) => onPortDownModelo(id, pid)}
              onPortClick={(pid) => {
                const q = (obj.ports?.[pid] as any)?.qualified_id || `${id}_${pid}`
                onIniciarFiação(q)
              }}
            />
          )
        }
        return (
          <NodeMesh
            key={id}
            id={id}
            obj={obj}
            onSelect={onSelect}
            selected={selectedId === id}
          />
        )
      })}
    </group>
  )
}

export default BenchScene