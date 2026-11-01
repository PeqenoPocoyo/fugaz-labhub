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

interface LiveWireProps {
  from: [number, number, number]
  to: [number, number, number]
  domain: WireDomain
  active?: boolean     // sinal fluindo → pulsar
  gauge?: number       // bitola (0.5 fino → 2 grosso)
  label?: string
}

export const LiveWire: React.FC<LiveWireProps> = ({
  from, to, domain, active = true, gauge = 1, label
}) => {
  const color = DOMAIN_COLOR[domain]
  const radius = 0.02 * gauge

  // Curva com "folga" (cabo não fica reto — tem sag realista)
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = start.clone().add(end).multiplyScalar(0.5)
    const dist = start.distanceTo(end)
    mid.y -= Math.min(0.6, dist * 0.15)  // sag proporcional à distância
    return new THREE.QuadraticBezierCurve3(
      start,
      mid.add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2)),
      end
    )
  }, [from, to])

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