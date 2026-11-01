// LiveWire — Fio 3D vivo: cabo entre dois pontos que pulsa quando o sinal flui.
// Usa react-three-fiber. Cor por domínio, espessura por bitola.
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Tube, Line } from '@react-three/drei'
import * as THREE from 'three'

export type WireDomain = 'electrical' | 'pneumatic' | 'hydraulic' | 'data' | 'signal'

const DOMAIN_COLOR: Record<WireDomain, string> = {
  electrical: '#FFB300',  // âmbar
  pneumatic:  '#29B6F6',  // azul claro
  hydraulic:  '#26C6DA',  // ciano
  data:       '#AB47BC',  // violeta
  signal:     '#66BB6A',  // verde
}

/**
 * FÍSICA DO CONDUTO — cada domínio tem bitola e rigidez próprias.
 * Rigidez alta = cabo reto (cai pouco); baixa = fio mole (barriga grande).
 * Mangueira é mais grossa e mais tesa que fio elétrico — lê-se de imediato.
 */
const DOMAIN_FISICA: Record<WireDomain, { gauge: number; rigidez: number; corFisica: string }> = {
  electrical: { gauge: 1.00, rigidez: 0.55, corFisica: '#2A323D' },  // fio 24V: fino, médio
  signal:     { gauge: 0.55, rigidez: 0.30, corFisica: '#1C222B' },  // fio de sinal: fino, mole
  data:       { gauge: 0.75, rigidez: 0.70, corFisica: '#232B36' },  // cabo de rede: médio, teso
  pneumatic:  { gauge: 1.90, rigidez: 0.85, corFisica: '#14181F' },  // mangueira: grossa, TESA
  hydraulic:  { gauge: 2.60, rigidez: 0.95, corFisica: '#0F1216' },  // alta pressão: grossíssima
}

interface LiveWireProps {
  from: [number, number, number]
  to: [number, number, number]
  domain: WireDomain
  active?: boolean     // sinal fluindo → pulsar
  gauge?: number       // bitola (0.5 fino → 2 grosso)
  label?: string
  /** waypoints definidos pelo usuário (rota própria do fio) */
  waypoints?: [number, number, number][]
}

export const LiveWire: React.FC<LiveWireProps> = ({
  from, to, domain, active = true, gauge = 1, label, waypoints
}) => {
  const color = DOMAIN_COLOR[domain]
  const fisica = DOMAIN_FISICA[domain] || DOMAIN_FISICA.electrical
  // bitola: a recebida manda quando explícita; senão, a do domínio
  const radius = 0.016 * (gauge ?? fisica.gauge)

  // Curva: sem waypoints = sag natural; com = passa pelos pontos do usuário
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    if (waypoints && waypoints.length > 0) {
      const pts = [start, ...waypoints.map(w => new THREE.Vector3(...w)), end]
      return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.08)
    }
    const dist = start.distanceTo(end)
    // sag limitado pela RIGIDEZ: mangueira de ar quase não cai; fio de sinal
    // faz barriga pronunciada. Também varia levemente a cada conexão.
    const sag = Math.min(0.75, dist * 0.16 * (1 - fisica.rigidez))
    const mid = start.clone().add(end).multiplyScalar(0.5)
    mid.y -= sag
    mid.x += (Math.random() - 0.5) * Math.min(0.25, dist * 0.06)
    mid.z += (Math.random() - 0.5) * Math.min(0.25, dist * 0.06)
    return new THREE.QuadraticBezierCurve3(start, mid, end)
  }, [from, to, waypoints, fisica.rigidez])

  const matRef = useRef<any>(null)

  useFrame((state) => {
    if (active && matRef.current) {
      // Pulso luminoso via emissive oscilante
      const pulse = 0.35 + Math.sin(state.clock.elapsedTime * 6) * 0.25
      matRef.current.emissiveIntensity = pulse
    }
  })

  const points = useMemo(() => curve.getPoints(40), [curve])

  return (
    <group>
      {/* Corpo do cabo */}
      <Tube args={[curve, 40, radius, 8, false]}>
        <meshStandardMaterial
          ref={matRef}
          color={active ? color : '#34404F'}
          emissive={active ? color : '#000000'}
          emissiveIntensity={active ? 0.4 : 0}
          roughness={0.4}
          metalness={0.5}
        />
      </Tube>

      {/* Invólucro escuro (cabo industrial tem capa preta) */}
      <Tube args={[curve, 40, radius * 0.6, 6, false]}>
        <meshStandardMaterial color="#0B0E13" roughness={0.8} />
      </Tube>

      {/* Conectores nas pontas */}
      <mesh position={from}>
        <cylinderGeometry args={[radius * 1.4, radius * 1.4, radius * 2, 8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={to}>
        <cylinderGeometry args={[radius * 1.4, radius * 1.4, radius * 2, 8]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
      </mesh>

      {label && (
        <Line
          points={points}
          color="transparent"
          lineWidth={1}
        />
      )}
    </group>
  )
}

export default LiveWire