// SceneElements — Malhas especializadas da bancada.
// Cada tipo de dispositivo tem sua representação física própria:
// esteiras escaláveis em grade, transmissões animadas, fitas de visão,
// dutos com flanges, bombas, válvulas e tanques com nível.
// Otimizado para hardware fraco: baixa contagem de segmentos, sem sombras.
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneObject } from '../../store/sceneStore'

const num = (v: any, d: number) => (typeof v === 'number' && isFinite(v) ? v : d)
const prop = (o: SceneObject, k: string, d: any) => (o.properties && o.properties[k] != null ? o.properties[k] : d)

/* ============================================================
   ESTEIRA DE CORREIA — escalável (cells_x × cells_y)
   ============================================================ */
export const ConveyorMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const cellsX = Math.max(1, Math.round(num(prop(obj, 'cells_x', 5), 5)))
  const cellsY = Math.max(1, Math.round(num(prop(obj, 'cells_y', 1), 1)))
  const module = num(prop(obj, 'module_mm', 200), 200) / 1000  // metros
  const length = cellsX * module
  const width = cellsY * module
  const speed = num(prop(obj, 'speed_m_s', 0), 0)
  const rollerAngle = num(prop(obj, 'roller_angle', 0), 0)
  const [px, py, pz] = obj.position

  const rollersRef = useRef<any>(null)
  const beltRef = useRef<any>(null)
  const stripesRef = useRef<any>(null)
  const offset = useRef(0)

  useFrame((_, dt) => {
    // Rolos giram e as listras da correia andam conforme a velocidade real
    offset.current = (offset.current + speed * dt) % 1
    if (rollersRef.current) {
      rollersRef.current.children.forEach((r: any) => {
        if (r.rotation) r.rotation.z = THREE.MathUtils.degToRad(rollerAngle)
      })
    }
    if (beltRef.current) beltRef.current.position.x = offset.current * module * 0.5
    if (stripesRef.current) {
      // reposiciona listras ciclicamente (guarda a base uma vez)
      for (const s of stripesRef.current.children as any[]) {
        if (s.userData.baseX === undefined) s.userData.baseX = s.position.x
        let x = (s.userData.baseX + offset.current * module) % length
        if (x > length / 2) x -= length
        s.position.x = x
        s.visible = speed > 0.001
      }
    }
  })

  return (
    <group position={[px, py, pz]}>
      {/* Estrutura lateral */}
      <mesh position={[0, -0.09, -width / 2 - 0.05]}>
        <boxGeometry args={[length + 0.2, 0.1, 0.06]} />
        <meshStandardMaterial color="#3A4553" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.09, width / 2 + 0.05]}>
        <boxGeometry args={[length + 0.2, 0.1, 0.06]} />
        <meshStandardMaterial color="#3A4553" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Correia */}
      <mesh ref={beltRef} position={[0, 0.02, 0]}>
        <boxGeometry args={[length, 0.02, width]} />
        <meshStandardMaterial color="#1C222B" metalness={0.2} roughness={0.9} />
      </mesh>
      {/* Listras em movimento (sensação de fluxo) */}
      <group ref={stripesRef}>
        {Array.from({ length: Math.min(60, cellsX * 2) }).map((_, i) => {
          const baseX = (i / Math.min(60, cellsX * 2) - 0.5) * length
          return (
            <mesh key={i} position={[baseX, 0.032, 0]}>
              <boxGeometry args={[Math.max(0.02, module * 0.14), 0.006, width * 0.9]} />
              <meshStandardMaterial color="#2A323D" />
            </mesh>
          )
        })}
      </group>
      {/* Rolos (limitados para performance: máx 12) */}
      <group ref={rollersRef}>
        {Array.from({ length: Math.min(12, Math.max(3, cellsX)) }).map((_, i) => {
          const t = i / (Math.min(12, Math.max(3, cellsX)) - 1 || 1)
          return (
            <mesh key={i} position={[(t - 0.5) * length, -0.02, 0]} rotation={[0, 0, THREE.MathUtils.degToRad(rollerAngle)]}>
              <cylinderGeometry args={[0.035, 0.035, width + 0.1, 8]} />
              <meshStandardMaterial color="#8A94A6" metalness={0.6} roughness={0.35} />
            </mesh>
          )
        })}
      </group>
      {/* Pés */}
      {[0, 1].map((e) => (
        <mesh key={e} position={[(e === 0 ? -1 : 1) * (length / 2 - 0.1), -0.2, 0]}>
          <boxGeometry args={[0.08, 0.22, width + 0.2]} />
          <meshStandardMaterial color="#4A5563" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Objetos transportados */}
      {(prop(obj, 'objects_on_belt', []) as any[]).map((o: any) => (
        <mesh key={o.id} position={[num(o.position_mm, 0) / 1000 - length / 2, 0.08, 0]}>
          <boxGeometry args={[0.18, 0.12, 0.18]} />
          <meshStandardMaterial color="#FFA726" />
        </mesh>
      ))}
      {/* Etiqueta com dados vivos */}
      <Text position={[0, 0.42, 0]} fontSize={0.16} color="#D7DEE8" anchorX="center" outlineWidth={0.008} outlineColor="#0B0E13">
        {`${cellsX}×${cellsY} · ${speed.toFixed(2)} m/s`}
      </Text>
    </group>
  )
}

/* ============================================================
   ESTEIRA DE ROLOS
   ============================================================ */
export const RollerConveyorMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const cellsX = Math.max(1, Math.round(num(prop(obj, 'cells_x', 6), 6)))
  const cellsY = Math.max(1, Math.round(num(prop(obj, 'cells_y', 1), 1)))
  const module = num(prop(obj, 'module_mm', 250), 250) / 1000
  const length = cellsX * module
  const width = Math.max(0.5, cellsY * module)
  const angle = num(prop(obj, 'roller_rotation_deg', 0), 0)
  const rollerCount = Math.min(24, Math.max(3, cellsX))
  const [px, py, pz] = obj.position

  return (
    <group position={[px, py, pz]}>
      <mesh position={[0, -0.06, -width / 2]}>
        <boxGeometry args={[length, 0.08, 0.05]} />
        <meshStandardMaterial color="#3A4553" />
      </mesh>
      <mesh position={[0, -0.06, width / 2]}>
        <boxGeometry args={[length, 0.08, 0.05]} />
        <meshStandardMaterial color="#3A4553" />
      </mesh>
      {Array.from({ length: rollerCount }).map((_, i) => {
        const t = i / (rollerCount - 1 || 1)
        return (
          <mesh key={i} position={[(t - 0.5) * length, 0, 0]} rotation={[0, 0, THREE.MathUtils.degToRad(angle)]}>
            <cylinderGeometry args={[0.045, 0.045, width, 8]} />
            <meshStandardMaterial color="#9AA5B5" metalness={0.6} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ============================================================
   TRANSMISSÕES — engrenagens / correia / corrente / acoplamento / fuso / atuador
   ============================================================ */
const Gear: React.FC<{ radius: number; teeth: number; rpm: number; color?: string }> = ({ radius, teeth, rpm, color = '#8A94A6' }) => {
  const ref = useRef<any>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += THREE.MathUtils.degToRad(rpm) * dt })
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[radius, radius, radius * 0.35, 16]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      {Array.from({ length: Math.min(16, teeth) }).map((_, i) => {
        const a = (i / Math.min(16, teeth)) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}>
            <boxGeometry args={[radius * 0.16, radius * 0.16, radius * 0.38]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}
      <mesh position={[0, 0, radius * 0.2]}>
        <cylinderGeometry args={[radius * 0.22, radius * 0.22, 0.05, 10]} />
        <meshStandardMaterial color="#0B0E13" />
      </mesh>
    </group>
  )
}

export const TransmissionMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const rpmIn = num(prop(obj, 'rpm_in', 0), 0)
  const rpmOut = num(prop(obj, 'rpm_out', 0), 0)
  const ratio = num(prop(obj, 'ratio', 1), 1)
  const t = obj.type_id
  const [px, py, pz] = obj.position

  if (t === 'trans_screw' || t === 'trans_linear_actuator') {
    const stroke = num(prop(obj, 'stroke_mm', 300), 300) / 1000
    const posM = num(prop(obj, 'position_mm', 0), 0) / 1000
    const isActuator = t === 'trans_linear_actuator'
    return (
      <group position={[px, py, pz]}>
        {/* Corpo */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, isActuator ? 0.28 : 0.22, 12]} />
          <meshStandardMaterial color="#5A6472" metalness={0.7} roughness={0.35} />
        </mesh>
        {/* Haste que avança */}
        <mesh position={[0, posM + (isActuator ? 0.14 : 0.11), 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.24, 8]} />
          <meshStandardMaterial color="#C7D0DA" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Marca de fim de curso */}
        <mesh position={[0, stroke + 0.25, 0]}>
          <boxGeometry args={[0.05, 0.006, 0.05]} />
          <meshStandardMaterial color="#E53935" />
        </mesh>
        <Text position={[0, -0.16, 0]} fontSize={0.12} color="#D7DEE8" anchorX="center" outlineWidth={0.006} outlineColor="#0B0E13">
          {`${prop(obj, 'position_mm', 0)} mm`}
        </Text>
      </group>
    )
  }

  if (t === 'trans_belt') {
    const rIn = num(prop(obj, 'pulley_d_in_mm', 60), 60) / 2000
    const rOut = num(prop(obj, 'pulley_d_out_mm', 180), 180) / 2000
    return (
      <group position={[px, py, pz]} rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[-0.12, 0, 0]}>
          <cylinderGeometry args={[rIn, rIn, 0.05, 14]} />
          <meshStandardMaterial color="#8A94A6" metalness={0.7} />
        </mesh>
        <mesh position={[0.12, 0, 0]}>
          <cylinderGeometry args={[rOut, rOut, 0.05, 14]} />
          <meshStandardMaterial color="#8A94A6" metalness={0.7} />
        </mesh>
        <Gear radius={rIn} teeth={8} rpm={rpmIn} />
        <group position={[0.12, 0, 0]}>
          <Spinner rpm={rpmOut} radius={rOut} teeth={14} />
        </group>
        {/* Correia */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.008, 6, 24, Math.PI]} />
          <meshStandardMaterial color="#1C222B" roughness={0.9} />
        </mesh>
      </group>
    )
  }

  if (t === 'trans_chain') {
    return (
      <group position={[px, py, pz]} rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[-0.12, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
          <meshStandardMaterial color="#AB47BC" metalness={0.6} />
        </mesh>
        <mesh position={[0.12, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.04, 12]} />
          <meshStandardMaterial color="#AB47BC" metalness={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.006, 6, 24, Math.PI]} />
          <meshStandardMaterial color="#212121" roughness={0.8} />
        </mesh>
      </group>
    )
  }

  if (t === 'trans_coupling') {
    return (
      <group position={[px, py, pz]} rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[-0.07, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 12]} />
          <meshStandardMaterial color="#8A94A6" metalness={0.8} />
        </mesh>
        <mesh position={[0.07, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 12]} />
          <meshStandardMaterial color="#8A94A6" metalness={0.8} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 12]} />
          <meshStandardMaterial color="#E53935" roughness={0.7} />
        </mesh>
      </group>
    )
  }

  // Engrenagens (default)
  const zIn = Math.max(6, Math.round(num(prop(obj, 'teeth_in', 18), 18)))
  const zOut = Math.max(6, Math.round(num(prop(obj, 'teeth_out', 54), 54)))
  const rIn = 0.09
  const rOut = Math.min(0.28, 0.09 * (zOut / Math.max(zIn, 1)) * 0.8 + 0.05)
  const dist = rIn + rOut
  return (
    <group position={[px, py, pz]} rotation={[0, 0, Math.PI / 2]}>
      <Gear radius={rIn} teeth={Math.min(12, zIn)} rpm={rpmIn} color="#9AA5B5" />
      <group position={[dist, 0, 0]}>
        <Gear radius={rOut} teeth={Math.min(16, zOut)} rpm={rpmOut} color="#5A6472" />
      </group>
      <Text position={[dist / 2, -0.2, 0]} fontSize={0.11} color="#FFCA28" anchorX="center" outlineWidth={0.006} outlineColor="#0B0E13">
        {`1:${Number.isFinite(ratio) ? ratio.toFixed(1) : '?'}`}
      </Text>
    </group>
  )
}

// Spinner auxiliar (roda girando isolada)
const Spinner: React.FC<{ rpm: number; radius: number; teeth: number }> = ({ rpm, radius, teeth }) => {
  const ref = useRef<any>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z -= THREE.MathUtils.degToRad(rpm) * dt })
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.05, 14]} />
        <meshStandardMaterial color="#8A94A6" metalness={0.7} />
      </mesh>
      {Array.from({ length: Math.min(16, teeth) }).map((_, i) => {
        const a = (i / Math.min(16, teeth)) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}>
            <boxGeometry args={[radius * 0.14, radius * 0.14, 0.055]} />
            <meshStandardMaterial color="#8A94A6" metalness={0.7} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ============================================================
   VISÃO COMPUTACIONAL — fita colorida / marcador / alvo / canto
   ============================================================ */
const TAPE_HEX: Record<string, string> = {
  amarela: '#F5C518', vermelha: '#E53935', verde: '#43A047',
  azul: '#1E88E5', branca: '#ECEFF1', preta: '#212121',
}

export const TapeMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const color = String(prop(obj, 'color', 'amarela'))
  const hex = TAPE_HEX[color] || prop(obj, 'color_hex', '#F5C518')
  const length = num(prop(obj, 'length_cm', 50), 50) / 100
  const width = num(prop(obj, 'width_cm', 5), 5) / 100
  const plane = String(prop(obj, 'plane', 'floor'))
  const orient = THREE.MathUtils.degToRad(num(prop(obj, 'orientation_deg', 0), 0))
  const [px, py, pz] = obj.position

  return (
    <group position={[px, py + 0.005, pz]} rotation={plane === 'wall' ? [Math.PI / 2, 0, orient] : [-Math.PI / 2, 0, orient]}>
      <mesh>
        <planeGeometry args={[length, Math.max(0.02, width)]} />
        <meshBasicMaterial color={hex} toneMapped={false} />
      </mesh>
      {/* Borda sutil para leitura */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[length + 0.01, Math.max(0.02, width) + 0.01]} />
        <meshBasicMaterial color="#0B0E13" toneMapped={false} />
      </mesh>
    </group>
  )
}

export const MarkerMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const size = num(prop(obj, 'size_mm', 100), 100) / 1000
  const id = prop(obj, 'marker_id', 7)
  const plane = String(prop(obj, 'plane', 'wall'))
  const [px, py, pz] = obj.position
  const rot: [number, number, number] = plane === 'wall' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]

  return (
    <group position={[px, py, pz]} rotation={rot}>
      <mesh position={[0, 0, plane === 'wall' ? -0.002 : -0.002]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#ECEFF1" />
      </mesh>
      {/* Padrão interno: anel + cantos (estilo ArUco simplificado) */}
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[size * 0.22, size * 0.3, 16]} />
        <meshBasicMaterial color="#111418" />
      </mesh>
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], i) => (
        <mesh key={i} position={[sx * size * 0.32, sy * size * 0.32, 0.001]}>
          <planeGeometry args={[size * 0.24, size * 0.24]} />
          <meshBasicMaterial color="#111418" />
        </mesh>
      ))}
      <Text position={[0, -size * 0.62, 0.002]} fontSize={size * 0.18} color="#111418" anchorX="center">
        {`#${id}`}
      </Text>
    </group>
  )
}

export const TargetMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const rows = Math.max(2, Math.round(num(prop(obj, 'rows', 6), 6)))
  const cols = Math.max(2, Math.round(num(prop(obj, 'cols', 9), 9)))
  const sq = num(prop(obj, 'square_mm', 25), 25) / 1000
  const totalW = cols * sq
  const totalH = rows * sq
  const [px, py, pz] = obj.position

  const cells = useMemo(() => {
    const out: { x: number; y: number; dark: boolean }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          x: (c - (cols - 1) / 2) * sq,
          y: (r - (rows - 1) / 2) * sq,
          dark: (r + c) % 2 === 0,
        })
      }
    }
    return out
  }, [rows, cols, sq])

  return (
    <group position={[px, py, pz]}>
      <mesh>
        <planeGeometry args={[totalW, totalH]} />
        <meshStandardMaterial color="#F5F7FA" />
      </mesh>
      {cells.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, 0.001]}>
          <planeGeometry args={[sq * 0.98, sq * 0.98]} />
          <meshBasicMaterial color={c.dark ? '#111418' : '#F5F7FA'} />
        </mesh>
      ))}
    </group>
  )
}

export const CornerMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const arm = num(prop(obj, 'arm_length_cm', 40), 40) / 100
  const [px, py, pz] = obj.position
  return (
    <group position={[px, py + 0.006, pz]}>
      <mesh position={[arm / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[arm, 0.05]} />
        <meshBasicMaterial color="#E53935" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, arm / 2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[arm, 0.05]} />
        <meshBasicMaterial color="#43A047" toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ============================================================
   FLUIDOS — duto / bomba / válvula / tanque
   ============================================================ */
export const DuctMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const diameter = num(prop(obj, 'diameter_mm', 100), 100) / 1000
  const segments = Math.max(1, Math.round(num(prop(obj, 'segments', 4), 4)))
  const segLen = num(prop(obj, 'segment_length_m', 1), 1)
  const length = segments * segLen
  const [px, py, pz] = obj.position

  return (
    <group position={[px, py, pz]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[diameter / 2, diameter / 2, length, 12]} />
        <meshStandardMaterial color="#8A94A6" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* Anéis de reforço por segmento */}
      {Array.from({ length: Math.min(12, segments) }).map((_, i) => {
        const t = (i + 1) / (Math.min(12, segments) + 1)
        return (
          <mesh key={i} position={[(t - 0.5) * length, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[diameter / 2 + 0.005, 0.006, 6, 14]} />
            <meshStandardMaterial color="#5A6472" metalness={0.7} />
          </mesh>
        )
      })}
      {/* Flanges nas pontas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[diameter / 2 + 0.02, diameter / 2 + 0.02, 0.02, 12]} />
          <meshStandardMaterial color="#3A4553" metalness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export const PumpMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const rpm = num(prop(obj, 'rpm', 0), 0)
  const flow = num(prop(obj, 'flow_m3h', 0), 0)
  const ref = useRef<any>(null)
  useFrame((_, dt) => { if (ref.current && rpm > 1) ref.current.rotation.z += THREE.MathUtils.degToRad(rpm) * dt })
  const [px, py, pz] = obj.position

  return (
    <group position={[px, py, pz]}>
      {/* Voluta */}
      <mesh>
        <cylinderGeometry args={[0.14, 0.14, 0.16, 14]} />
        <meshStandardMaterial color="#00B8D4" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Motor */}
      <mesh position={[0, 0.02, -0.26]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.3, 12]} />
        <meshStandardMaterial color="#5A6472" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Hélice (gira com o RPM real) */}
      <group ref={ref}>
        <mesh position={[0, 0, 0.09]}>
          <cylinderGeometry args={[0.11, 0.11, 0.01, 12]} />
          <meshStandardMaterial color="#C7D0DA" metalness={0.85} roughness={0.15} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0, 0.09]} rotation={[0, 0, i * Math.PI / 3]}>
            <boxGeometry args={[0.16, 0.03, 0.005]} />
            <meshStandardMaterial color="#C7D0DA" />
          </mesh>
        ))}
      </group>
      {/* LEDs de status */}
      <mesh position={[0, 0.12, -0.3]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={rpm > 1 ? '#66BB6A' : '#3A4553'} />
      </mesh>
      <Text position={[0, 0.28, 0]} fontSize={0.11} color="#00E5FF" anchorX="center" outlineWidth={0.006} outlineColor="#0B0E13">
        {`${flow.toFixed(1)} m³/h`}
      </Text>
    </group>
  )
}

export const ValveMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const opening = num(prop(obj, 'opening_pct', 0), 0)
  const flow = num(prop(obj, 'flow_m3h', 0), 0)
  const [px, py, pz] = obj.position
  const k = opening / 100

  return (
    <group position={[px, py, pz]}>
      {/* Corpo */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.26, 12]} />
        <meshStandardMaterial color="#4A5563" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Flanges */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.015, 12]} />
          <meshStandardMaterial color="#3A4553" />
        </mesh>
      ))}
      {/* Haste que sobe com a abertura */}
      <mesh position={[0, 0.06 + k * 0.1, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
        <meshStandardMaterial color="#C7D0DA" metalness={0.8} />
      </mesh>
      {/* Atuador */}
      <mesh position={[0, 0.17 + k * 0.1, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 12]} />
        <meshStandardMaterial color="#FFA726" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Indicador de abertura (anel que abre) */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.1 + 0.02 + k * 0.06, 16, 1, 0, Math.PI * 2 * Math.max(k, 0.05)]} />
        <meshBasicMaterial color={opening > 5 ? '#66BB6A' : '#3A4553'} side={2} />
      </mesh>
      <Text position={[0, 0.32 + k * 0.1, 0]} fontSize={0.1} color="#D7DEE8" anchorX="center" outlineWidth={0.006} outlineColor="#0B0E13">
        {`${opening.toFixed(0)}% · ${flow.toFixed(1)}`}
      </Text>
    </group>
  )
}

export const TankMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const levelPct = num(prop(obj, 'level_pct', 0), 0)
  const height = 1.0
  const [px, py, pz] = obj.position

  return (
    <group position={[px, py, pz]}>
      {/* casco */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, height, 14]} />
        <meshStandardMaterial color="#5A6472" metalness={0.6} roughness={0.4} transparent opacity={0.25} />
      </mesh>
      {/* nível (cilindro que sobe) */}
      <mesh position={[0, -height / 2 + (levelPct / 100) * height / 2, 0]}>
        <cylinderGeometry args={[0.29, 0.29, Math.max(0.001, (levelPct / 100) * height), 14]} />
        <meshStandardMaterial color="#1E88E5" transparent opacity={0.55} metalness={0.2} />
      </mesh>
      {/* marca de escala */}
      {[0.25, 0.5, 0.75].map((f) => (
        <mesh key={f} position={[0, (f - 0.5) * height, 0.3]}>
          <boxGeometry args={[0.06, 0.004, 0.004]} />
          <meshBasicMaterial color="#D7DEE8" />
        </mesh>
      ))}
      <Text position={[0, height / 2 + 0.1, 0]} fontSize={0.11} color="#00E5FF" anchorX="center" outlineWidth={0.006} outlineColor="#0B0E13">
        {`${levelPct.toFixed(0)}%`}
      </Text>
    </group>
  )
}

/* ============================================================
   LIGAÇÃO MECÂNICA (trem de força) — linha tracejada + razão
   ============================================================ */
export const MechanicalBond: React.FC<{
  from: [number, number, number]
  via: [number, number, number][]
  to: [number, number, number]
  ratio?: number
}> = ({ from, via, to, ratio }) => {
  const points = useMemo(() => {
    const pts = [new THREE.Vector3(...from)]
    for (const p of via) pts.push(new THREE.Vector3(p[0], p[1] + 0.15, p[2]))
    pts.push(new THREE.Vector3(...to))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1)
    return curve.getPoints(48)
  }, [from, via, to])

  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineDashedMaterial({
      color: '#FF7043', dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.9,
    })
    const l = new THREE.Line(geom, mat)
    l.computeLineDistances()
    return l
  }, [points])

  const mid = via.length ? via[Math.floor(via.length / 2)] : [
    (from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.2, (from[2] + to[2]) / 2,
  ]

  return (
    <group>
      <primitive object={lineObj} />
      <mesh position={[mid[0], mid[1] + 0.05, mid[2]] as any}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#FF7043" />
      </mesh>
      {ratio != null && ratio !== 1 && (
        <Text
          position={[mid[0], mid[1] + 0.12, mid[2]]}
          fontSize={0.13}
          color="#FF7043"
          anchorX="center"
          outlineWidth={0.007}
          outlineColor="#0B0E13"
        >
          {`1:${ratio.toFixed(1)}`}
        </Text>
      )}
    </group>
  )
}
