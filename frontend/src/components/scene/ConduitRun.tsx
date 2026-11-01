// ConduitRun — Eletroduto / calha renderizado como tubo que segue os waypoints.
// Usa THREE.TubeGeometry nativo (mais robusto que o componente Tube do drei).
import React, { useMemo } from 'react'
import * as THREE from 'three'

interface ConduitRunProps {
  path: [number, number, number][]
  kind: 'conduit' | 'cable_tray'
}

const KIND_SPEC = {
  conduit:    { radius: 0.05, color: '#6B7787' },
  cable_tray: { radius: 0.1,  color: '#8A94A6' },
}

export const ConduitRun: React.FC<ConduitRunProps> = ({ path, kind }) => {
  const spec = KIND_SPEC[kind] || KIND_SPEC.conduit

  const geometry = useMemo(() => {
    if (!path || path.length < 2) return null
    const pts = path.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0)
    return new THREE.TubeGeometry(curve, 48, spec.radius, 8, false)
  }, [path, spec.radius])

  if (!geometry) return null

  return (
    <group>
      {/* Corpo do duto */}
      <mesh geometry={geometry}>
        <meshStandardMaterial color={spec.color} metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Calha tem leito interno escuro */}
      {kind === 'cable_tray' && (
        <mesh>
          <tubeGeometry args={[(() => {
            const pts = path.map(p => new THREE.Vector3(p[0], p[1] - 0.02, p[2]))
            return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0)
          })(), 48, spec.radius * 0.5, 8, false]} />
          <meshStandardMaterial color="#0B0E13" metalness={0.4} roughness={0.6} />
        </mesh>
      )}

      {/* Juntas nas extremidades */}
      {path.map((p, i) =>
        i === 0 || i === path.length - 1 ? (
          <mesh key={i} position={p}>
            <cylinderGeometry args={[spec.radius * 1.25, spec.radius * 1.25, spec.radius * 1.6, 10]} />
            <meshStandardMaterial color="#5A6472" metalness={0.7} roughness={0.3} />
          </mesh>
        ) : null
      )}
    </group>
  )
}

export default ConduitRun