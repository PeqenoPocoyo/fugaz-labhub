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
/** Engrenagem: coroa com dentes, alma vazada, cubo, furo e chaveta */
const Gear: React.FC<{ radius: number; teeth: number; rpm: number; color?: string; width?: number; phase?: number }> =
  ({ radius, teeth, rpm, color = '#9AA5B5', width, phase = 0 }) => {
  const ref = useSpin(rpm, phase)
  const w = width ?? Math.max(0.026, radius * 0.4)
  const n = Math.max(6, Math.min(34, Math.round(teeth)))
  const rRoot = radius * 0.88
  const rTip = radius * 1.07
  const hub = Math.max(0.02, radius * 0.3)
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[rRoot, rRoot, w, Math.max(12, n * 2)]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, w * 0.34]}>
        <cylinderGeometry args={[rRoot * 0.74, rRoot * 0.74, w * 0.5, 14]} />
        <meshStandardMaterial color="#2E3642" metalness={0.45} roughness={0.55} />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <mesh key={`s${i}`} position={[Math.cos(a) * rRoot * 0.4, Math.sin(a) * rRoot * 0.4, w * 0.34]} rotation={[0, 0, a]}>
            <boxGeometry args={[rRoot * 0.78, rRoot * 0.2, w * 0.5]} />
            <meshStandardMaterial color={color} metalness={0.68} roughness={0.36} />
          </mesh>
        )
      })}
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <mesh key={`t${i}`} position={[Math.cos(a) * (rRoot + rTip) / 2, Math.sin(a) * (rRoot + rTip) / 2, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[rTip - rRoot, ((radius * 2 * Math.PI) / n) * 0.5, w]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.28} />
          </mesh>
        )
      })}
      <mesh>
        <cylinderGeometry args={[hub, hub, w * 2, 12]} />
        <meshStandardMaterial color="#3A4553" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[hub * 0.45, hub * 0.45, w * 2.2, 10]} />
        <meshStandardMaterial color="#0B0E13" />
      </mesh>
      <mesh position={[hub * 0.75, 0, w * 0.85]}>
        <boxGeometry args={[0.008, 0.012, w * 0.4]} />
        <meshStandardMaterial color="#C7D0DA" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

/** Polia coroada com sulcos (correia em V) */
const Pulley: React.FC<{ radius: number; rpm: number }> = ({ radius, rpm }) => {
  const ref = useSpin(rpm)
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.05, 18]} />
        <meshStandardMaterial color="#8A94A6" metalness={0.65} roughness={0.35} />
      </mesh>
      {[0.023, 0, -0.023].map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <torusGeometry args={[radius * 0.84, 0.005, 4, 18]} />
          <meshStandardMaterial color="#2E3642" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.028]}>
        <cylinderGeometry args={[radius * 1.06, radius * 1.06, 0.006, 18]} />
        <meshStandardMaterial color="#B0BAC8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.028]}>
        <cylinderGeometry args={[radius * 1.06, radius * 1.06, 0.006, 18]} />
        <meshStandardMaterial color="#B0BAC8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.026, 0.026, 0.1, 10]} />
        <meshStandardMaterial color="#3A4553" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.011, 0.011, 0.12, 8]} />
        <meshStandardMaterial color="#0B0E13" />
      </mesh>
    </group>
  )
}

/** Roda dentada de corrente (sprocket) */
const Sprocket: React.FC<{ radius: number; teeth: number; rpm: number }> = ({ radius, teeth, rpm }) => {
  const ref = useSpin(rpm)
  const n = Math.max(8, Math.min(30, Math.round(teeth)))
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[radius * 0.9, radius * 0.9, 0.026, Math.max(12, n)]} />
        <meshStandardMaterial color="#6B7787" metalness={0.7} roughness={0.3} />
      </mesh>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[radius * 0.18, ((radius * 2 * Math.PI) / n) * 0.45, 0.03]} />
            <meshStandardMaterial color="#8A94A6" metalness={0.75} roughness={0.25} />
          </mesh>
        )
      })}
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, 0.052, 10]} />
        <meshStandardMaterial color="#3A4553" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.012, 0.012, 0.062, 8]} />
        <meshStandardMaterial color="#0B0E13" />
      </mesh>
    </group>
  )
}

/** correia/corrente seguindo as tangentes entre as duas polias */
const BeltLoop: React.FC<{ r1: number; r2: number; cx1: number; cx2: number; thickness?: number; color?: string }> =
  ({ r1, r2, cx1, cx2, thickness = 0.006, color = '#151A21' }) => {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(driveCurve(r1, r2, cx1, cx2), true, 'centripetal', 0.4),
    [r1, r2, cx1, cx2]
  )
  return (
    <mesh>
      <tubeGeometry args={[curve, 60, thickness, 5, true]} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
    </mesh>
  )
}

/** rolos da corrente girando com a velocidade da corrente */
const ChainRollers: React.FC<{ r1: number; r2: number; cx1: number; cx2: number; speed: number }> = ({ r1, r2, cx1, cx2, speed }) => {
  const ref = useRef<any>(null)
  const pts = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(driveCurve(r1, r2, cx1, cx2), true, 'centripetal', 0.4)
    const out: THREE.Vector3[] = []
    const total = 26
    for (let i = 0; i < total; i++) out.push(c.getPoint(i / total))
    return out
  }, [r1, r2, cx1, cx2])
  useFrame((_, dt) => {
    if (ref.current) ref.current.children.forEach((r: any) => { r.rotation.z -= speed * dt })
  })
  return (
    <group ref={ref}>
      {pts.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.009, 0.009, 0.014, 6]} />
          <meshStandardMaterial color="#B0BAC8" metalness={0.75} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/* ============ helpers de montagem (eixo ao longo de Z) ============ */

/** eixo girando: rpm do backend -> rad/s na malha (preserva a fase inicial) */
const useSpin = (rpm: number, phase = 0) => {
  const ref = useRef<any>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z = phase + ref.current.rotation.z + THREE.MathUtils.degToRad(rpm) * dt })
  return ref
}

/** fuso / sem-fim: haste com filete aproximado por anéis em espiral */
const ScrewRod: React.FC<{ len: number; r: number; rpm: number }> = ({ len, r, rpm }) => {
  const ref = useSpin(rpm)
  const rings = Math.max(6, Math.min(26, Math.round(len / 0.014)))
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[r, r, len, 10]} />
        <meshStandardMaterial color="#C7D0DA" metalness={0.85} roughness={0.2} />
      </mesh>
      {Array.from({ length: rings }).map((_, i) => {
        const t = i / rings
        const a = t * Math.PI * 4
        return (
          <mesh key={i} position={[Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, -len / 2 + t * len]}>
            <torusGeometry args={[r * 1.02, r * 0.2, 4, 8]} />
            <meshStandardMaterial color="#9AA5B5" metalness={0.8} roughness={0.25} />
          </mesh>
        )
      })}
    </group>
  )
}

/** coluna + mancal (castelo) apoiando um eixo na altura y */
const Pedestal: React.FC<{ x: number; y: number; height: number; z?: number }> = ({ x, y, height, z = 0 }) => (
  <group position={[x, y - height, z]}>
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[0.08, height, 0.11]} />
      <meshStandardMaterial color="#39424F" metalness={0.6} roughness={0.42} />
    </mesh>
    <mesh position={[0, height + 0.012, 0]}>
      <cylinderGeometry args={[0.034, 0.034, 0.05, 10]} />
      <meshStandardMaterial color="#2E3642" metalness={0.5} roughness={0.5} />
    </mesh>
    <mesh position={[0, height + 0.038, 0]}>
      <cylinderGeometry args={[0.016, 0.016, 0.03, 8]} />
      <meshStandardMaterial color="#C7D0DA" metalness={0.8} roughness={0.25} />
    </mesh>
  </group>
)

/** placa de base com parafusos (vão ao longo de x ou z) */
const Bedplate: React.FC<{ len: number; depth?: number; y?: number; along?: 'x' | 'z'; center?: number }> = ({ len, depth = 0.3, y = -0.14, along = 'x', center = 0 }) => (
  <group position={along === 'x' ? [center, y, 0] : [0, y, center]}>
    <mesh>
      <boxGeometry args={along === 'x' ? [len, 0.016, depth] : [depth, 0.016, len]} />
      <meshStandardMaterial color="#39424F" metalness={0.65} roughness={0.4} />
    </mesh>
    {[[-len / 2 + 0.035, -depth / 2 + 0.035], [len / 2 - 0.035, -depth / 2 + 0.035],
      [-len / 2 + 0.035, depth / 2 - 0.035], [len / 2 - 0.035, depth / 2 - 0.035]].map(([a, b], i) => (
      <mesh key={i} position={along === 'x' ? [a, 0.004, b] : [b, 0.004, a]}>
        <cylinderGeometry args={[0.007, 0.007, 0.01, 6]} />
        <meshStandardMaterial color="#8A94A6" metalness={0.7} roughness={0.3} />
      </mesh>
    ))}
  </group>
)

/** ponta de eixo passante (saindo dos dois lados) */
const ShaftStub: React.FC<{ len?: number }> = ({ len = 0.18 }) => (
  <mesh>
    <cylinderGeometry args={[0.013, 0.013, len, 10]} />
    <meshStandardMaterial color="#C7D0DA" metalness={0.85} roughness={0.2} />
  </mesh>
)

/** caminho fechado de correia/corrente em volta de duas polias (tangentes externas) */
function driveCurve(r1: number, r2: number, cx1: number, cx2: number): THREE.Vector3[] {
  const d = Math.max(0.02, cx2 - cx1)
  const phi = Math.asin(Math.max(-1, Math.min(1, (r2 - r1) / d)))
  // Normais das duas tangentes externas:
  //   superior N_u = (-sen(phi),  cos(phi)) -> contato no angulo  aTop
  //   inferior N_l = (-sen(phi), -cos(phi)) -> contato no angulo -aTop
  // Em ambas dist(centro -> reta) = r da polia: a correia encosta sem cortar.
  const aTop = Math.atan2(Math.cos(phi), -Math.sin(phi))
  const aBot = -aTop
  const Pt = (cx: number, r: number, a: number) => new THREE.Vector3(cx + r * Math.cos(a), r * Math.sin(a), 0)
  const pts: THREE.Vector3[] = []
  const arc = (cx: number, r: number, a0: number, a1: number, steps: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps
      pts.push(Pt(cx, r, a))
    }
  }
  const b1 = Pt(cx1, r1, aBot)
  const b2 = Pt(cx2, r2, aBot)
  const t1 = Pt(cx1, r1, aTop)
  const t2 = Pt(cx2, r2, aTop)
  // polia 1: contato superior -> inferior pelo lado OPOSTO a polia 2 (CCW)
  arc(cx1, r1, aTop, aBot + Math.PI * 2, 12)
  for (let i = 1; i < 4; i++) pts.push(b1.clone().lerp(b2, i / 4))
  // polia 2: contato inferior -> superior passando por 0 (lado OPOSTO a polia 1)
  arc(cx2, r2, aBot, aTop, 12)
  for (let i = 1; i < 4; i++) pts.push(t2.clone().lerp(t1, i / 4))
  return pts
}

export const TransmissionMesh: React.FC<{ obj: SceneObject }> = ({ obj }) => {
  const rpmIn = num(prop(obj, 'rpm_in', 0), 0)
  const rpmOut = num(prop(obj, 'rpm_out', 0), 0)
  const ratio = num(prop(obj, 'ratio', 1), 1)
  const t = obj.type_id
  const [px, py, pz] = obj.position
  // rotação gravada no backend em GRAUS, eixo da peça alinhado a +X
  const rad: [number, number, number] = [
    THREE.MathUtils.degToRad(obj.rotation?.[0] ?? 0),
    THREE.MathUtils.degToRad(obj.rotation?.[1] ?? 0),
    THREE.MathUtils.degToRad(obj.rotation?.[2] ?? 0),
  ]

  /* ---------- FUSO e ATUADOR LINEAR: motor + redutor + haste roscada ---------- */
  if (t === 'trans_screw' || t === 'trans_linear_actuator') {
    const stroke = num(prop(obj, 'stroke_mm', 300), 300) / 1000
    const posM = num(prop(obj, 'position_mm', 0), 0) / 1000
    const isActuator = t === 'trans_linear_actuator'
    const bodyLen = isActuator ? 0.3 : 0.24
    const rodLen = Math.max(0.08, Math.min(0.5, stroke))
    const nutZ = posM * 0.8
    return (
      <group position={[px, py, pz]} rotation={rad}>
        <group rotation={[0, Math.PI / 2, 0]}>
          {/* motor traseiro */}
          <mesh position={[0, 0, -bodyLen / 2 - 0.07]}>
            <cylinderGeometry args={[0.055, 0.055, 0.16, 14]} />
            <meshStandardMaterial color="#5A6472" metalness={0.7} roughness={0.35} />
          </mesh>
          {/* aletas de refrigeração */}
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[0, 0, -bodyLen / 2 - 0.15 + (i / 6) * 0.14]}>
              <torusGeometry args={[0.058, 0.006, 4, 12]} />
              <meshStandardMaterial color="#2E3642" metalness={0.6} roughness={0.45} />
            </mesh>
          ))}
          {/* caixa / redutor */}
          <mesh position={[0, 0, -0.04]}>
            <cylinderGeometry args={[0.062, 0.062, bodyLen, 14]} />
            <meshStandardMaterial color="#39424F" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, -0.04 + bodyLen / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 14]} />
            <meshStandardMaterial color="#242C36" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* guia da haste (bucha) */}
          <mesh position={[0, 0, 0.01]}>
            <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
            <meshStandardMaterial color="#C7D0DA" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* haste roscada girando */}
          <group position={[0, 0, 0.02 + rodLen / 2]}>
            <ScrewRod len={rodLen} r={0.013} rpm={rpmOut} />
          </group>
          {/* porca que avança + garra */}
          <group position={[0, 0, 0.03 + nutZ]}>
            <mesh>
              <boxGeometry args={[0.05, 0.05, 0.035]} />
              <meshStandardMaterial color="#B0BAC8" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.045, 0]}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <meshStandardMaterial color="#8A94A6" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
          {/* fim de curso */}
          <mesh position={[0, 0, 0.02 + rodLen + 0.02]}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 10]} />
            <meshStandardMaterial color="#C7D0DA" metalness={0.8} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.05, 0.02 + rodLen + 0.02]}>
            <boxGeometry args={[0.03, 0.014, 0.014]} />
            <meshStandardMaterial color="#E53935" />
          </mesh>
          {/* pés de fixação */}
          {[-0.06, 0.06].map((z, i) => (
            <mesh key={i} position={[0, -0.075, z]}>
              <boxGeometry args={[0.13, 0.04, 0.05]} />
              <meshStandardMaterial color="#39424F" metalness={0.6} roughness={0.45} />
            </mesh>
          ))}
        </group>
        <Text position={[0, 0.16, 0]} fontSize={0.1} color="#D7DEE8" anchorX="center" outlineWidth={0.005} outlineColor="#0B0E13">
          {`${isActuator ? 'Atuador Linear' : 'Fuso'} · ${Math.round(posM * 1000)} mm / ${Math.round(stroke * 1000)} mm`}
        </Text>
      </group>
    )
  }

  /* ---------- CORREIA + POLIAS ---------- */
  if (t === 'trans_belt') {
    const dIn = num(prop(obj, 'pulley_d_in_mm', 60), 60)
    const dOut = num(prop(obj, 'pulley_d_out_mm', 180), 180)
    const rIn = dIn / 2000
    const rOut = dOut / 2000
    const half = (rIn + rOut) * 0.95
    return (
      <group position={[px, py, pz]} rotation={rad}>
        <group rotation={[0, Math.PI / 2, 0]}>
          <Bedplate len={half * 2 + rIn + rOut + 0.16} depth={0.3} y={-Math.max(rIn, rOut) - 0.06} />
          <Pedestal x={-half} y={0} height={Math.max(0.06, rIn - 0.02)} />
          <Pedestal x={half} y={0} height={Math.max(0.06, rOut - 0.02)} />
          <group position={[-half, 0, 0]}>
            <Pulley radius={rIn} rpm={rpmIn} />
            <ShaftStub len={0.2} />
          </group>
          <group position={[half, 0, 0]}>
            <Pulley radius={rOut} rpm={rpmOut} />
            <ShaftStub len={0.2} />
          </group>
          {/* correia em V aberta seguindo as tangentes */}
          <BeltLoop r1={rIn + 0.004} r2={rOut + 0.004} cx1={-half} cx2={half} />
          {/* esticador */}
          <group position={[0, rIn + rOut + 0.03, 0]}>
            <Pulley radius={0.028} rpm={0} />
          </group>
        </group>
        <Text position={[0, 0.24, 0]} fontSize={0.1} color="#D7DEE8" anchorX="center" outlineWidth={0.005} outlineColor="#0B0E13">
          {`Correia+V ${dIn}/${dOut}mm · 1:${Number.isFinite(ratio) ? ratio.toFixed(2) : '?'}`}
        </Text>
      </group>
    )
  }

  /* ---------- CORRENTE + RODAS DENTADAS ---------- */
  if (t === 'trans_chain') {
    const dIn = num(prop(obj, 'sprocket_d_in_mm', 80), 80)
    const dOut = num(prop(obj, 'sprocket_d_out_mm', 240), 240)
    const rIn = dIn / 2000
    const rOut = dOut / 2000
    const half = (rIn + rOut) * 0.98
    const chainSpeed = Math.abs(rpmIn) * 2 * Math.PI * rIn / 60
    return (
      <group position={[px, py, pz]} rotation={rad}>
        <group rotation={[0, Math.PI / 2, 0]}>
          <Bedplate len={half * 2 + rIn + rOut + 0.16} depth={0.3} y={-Math.max(rIn, rOut) - 0.06} />
          <Pedestal x={-half} y={0} height={Math.max(0.06, rIn - 0.02)} />
          <Pedestal x={half} y={0} height={Math.max(0.06, rOut - 0.02)} />
          <group position={[-half, 0, 0]}>
            <Sprocket radius={rIn} teeth={Math.max(8, Math.round(dIn / 12))} rpm={rpmIn} />
            <ShaftStub len={0.2} />
          </group>
          <group position={[half, 0, 0]}>
            <Sprocket radius={rOut} teeth={Math.max(10, Math.round(dOut / 16))} rpm={rpmOut} />
            <ShaftStub len={0.2} />
          </group>
          <BeltLoop r1={rIn - 0.004} r2={rOut - 0.004} cx1={-half} cx2={half} thickness={0.004} color="#1A1E25" />
          <ChainRollers r1={rIn - 0.004} r2={rOut - 0.004} cx1={-half} cx2={half} speed={chainSpeed / 0.009} />
          {/* tensor de corrente */}
          <mesh position={[0, rIn + rOut + 0.02, 0]}>
            <boxGeometry args={[0.03, 0.02, 0.09]} />
            <meshStandardMaterial color="#6B7787" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
        <Text position={[0, 0.24, 0]} fontSize={0.1} color="#D7DEE8" anchorX="center" outlineWidth={0.005} outlineColor="#0B0E13">
          {`Corrente ${dIn}/${dOut}mm · 1:${Number.isFinite(ratio) ? ratio.toFixed(2) : '?'}`}
        </Text>
      </group>
    )
  }

  /* ---------- ACOPLAMENTO (cubo + aranha elástica) ---------- */
  if (t === 'trans_coupling') {
    return (
      <group position={[px, py, pz]} rotation={rad}>
        <group rotation={[0, Math.PI / 2, 0]}>
          {/* cubo esquerdo (lado motor) */}
          <mesh position={[0, 0, -0.06]}>
            <cylinderGeometry args={[0.042, 0.042, 0.1, 14]} />
            <meshStandardMaterial color="#8A94A6" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* cubo direito (lado carga) */}
          <mesh position={[0, 0, 0.06]}>
            <cylinderGeometry args={[0.042, 0.042, 0.1, 14]} />
            <meshStandardMaterial color="#8A94A6" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* garras de tração */}
          {Array.from({ length: 3 }).map((_, i) => {
            const a = (i / 3) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0]}>
                <boxGeometry args={[0.026, 0.012, 0.09]} />
                <meshStandardMaterial color="#C2543A" roughness={0.6} metalness={0.2} />
              </mesh>
            )
          })}
          {/* anel elástico */}
          <mesh>
            <torusGeometry args={[0.046, 0.008, 5, 20]} />
            <meshStandardMaterial color="#E53935" roughness={0.7} />
          </mesh>
          {/* parafusos */}
          {[-0.06, 0.06].map((z, k) =>
            Array.from({ length: 3 }).map((_, i) => {
              const a = (i / 3) * Math.PI * 2 + Math.PI / 6
              return (
                <mesh key={`${k}-${i}`} position={[Math.cos(a) * 0.03, Math.sin(a) * 0.03, z]}>
                  <cylinderGeometry args={[0.006, 0.006, 0.014, 6]} />
                  <meshStandardMaterial color="#C7D0DA" metalness={0.85} roughness={0.2} />
                </mesh>
              )
            })
          )}
          {/* eixo passante */}
          <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 10]} />
            <meshStandardMaterial color="#5A6472" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
        <Text position={[0, 0.13, 0]} fontSize={0.1} color="#D7DEE8" anchorX="center" outlineWidth={0.005} outlineColor="#0B0E13">
          {`Acoplamento · 1:1`}
        </Text>
      </group>
    )
  }

  /* ---------- PAR DE ENGRENAGENS (padrão) ---------- */
  const zIn = Math.max(6, Math.round(num(prop(obj, 'teeth_in', 18), 18)))
  const zOut = Math.max(6, Math.round(num(prop(obj, 'teeth_out', 54), 54)))
  // Módulo calibrado para o trem de força caber na esteira: a engrenagem
  // maior fica com ~0,11 m de raio (22 cm de diâmetro) e o par inteiro
  // ocupa ~0,35 m — proporcional a uma esteira de 3 m. O módulo antigo
  // (0,27/(z1+z2) ≈ 0,0037) fazia a engrenagem maior ter 24 cm de raio e
  // o conjunto competir visualmente com a própria esteira.
  const module = Math.min(0.0032, 0.20 / (zIn + zOut))
  const rIn = (module * zIn) / 2
  const rOut = (module * zOut) / 2
  const dist = rIn + rOut
  const phaseB = Math.PI / Math.max(6, Math.min(34, zOut))
  return (
    <group position={[px, py, pz]} rotation={rad}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <Bedplate len={dist + rIn + rOut + 0.18} depth={0.34} y={-Math.max(rIn, rOut) - 0.05} />
        <Pedestal x={0} y={0} height={Math.max(0.05, rIn - 0.02)} />
        <Pedestal x={dist} y={0} height={Math.max(0.05, rOut - 0.02)} />
        <Gear radius={rIn} teeth={zIn} rpm={rpmIn} color="#9AA5B5" />
        <group position={[dist, 0, 0]}>
          {/* engrenagens movidas giram ao contrário, dentes defasados */}
          <Gear radius={rOut} teeth={zOut} rpm={-rpmOut} color="#5A6472" phase={phaseB} />
        </group>
        <ShaftStub len={0.22} />
        <group position={[dist, 0, 0]}>
          <ShaftStub len={0.22} />
        </group>
      </group>
      <Text position={[0, 0.26, 0]} fontSize={0.1} color="#FFCA28" anchorX="center" outlineWidth={0.005} outlineColor="#0B0E13">
        {`Engrenagens ${zIn}/${zOut} · 1:${Number.isFinite(ratio) ? ratio.toFixed(2) : '?'} · ${rpmIn | 0}→${rpmOut | 0} rpm`}
      </Text>
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
