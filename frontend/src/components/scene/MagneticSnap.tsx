// MagneticSnap — Indicador visual de encaixe magnético em slots livres.
// Anel que "respira", muda cor quando alinhado.
import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Ring, Text } from '@react-three/drei'
import * as THREE from 'three'

interface MagneticSnapProps {
  position: [number, number, number]
  aligned?: boolean
  label?: string
}

export const MagneticSnap: React.FC<MagneticSnapProps> = ({
  position, aligned = false, label
}) => {
  const ringRef = useRef<any>(null)
  const color = aligned ? '#66BB6A' : '#00E5FF'

  useFrame((state) => {
    if (!ringRef.current) return
    // "Respiração" + giro sutil
    const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.08
    ringRef.current.scale.setScalar(s)
    ringRef.current.rotation.z += 0.01
  })

  return (
    <group position={position}>
      {/* Anel externo (alvo) */}
      <Ring ref={ringRef} args={[0.3, 0.36, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </Ring>

      {/* Anel interno */}
      <Ring args={[0.16, 0.2, 24]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </Ring>

      {/* Ponto central */}
      <mesh>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Halo quando alinhado */}
      {aligned && (
        <mesh>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshBasicMaterial color="#66BB6A" transparent opacity={0.15} />
        </mesh>
      )}

      {/* Etiqueta (fonte padrão do drei) */}
      {label && (
        <Text
          position={[0, 0.5, 0]}
          fontSize={0.13}
          color={aligned ? '#66BB6A' : '#00E5FF'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor="#0B0E13"
        >
          {label}
        </Text>
      )}
    </group>
  )
}

export default MagneticSnap