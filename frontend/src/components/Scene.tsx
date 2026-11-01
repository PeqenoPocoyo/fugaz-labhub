// Scene — Componente 3D principal (Three.js)
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'
import DataOverlay from './DataOverlay'

// Cores por categoria
const CATEGORY_COLORS: Record<string, string> = {
  plc: '#00D4FF',
  microcontroller: '#7C3AED',
  actuator: '#FF6B35',
  sensor: '#10B981',
  pneumatic: '#3B82F6',
  hydraulic: '#06B6D4',
  mechanical: '#64748B',
  vision: '#F59E0B',
  material: '#A8A29E',
  electronic: '#EC4899',
  power: '#FBBF24',
  hmi: '#8B5CF6',
  drive: '#14B8A6',
}

const DeviceMesh: React.FC<{ id: string; obj: any }> = ({ obj }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = CATEGORY_COLORS[obj.type?.split('_')[0]] || '#64748B'

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group position={obj.position} rotation={obj.rotation}>
      <Box
        ref={meshRef}
        args={[obj.scale[0], obj.scale[1], obj.scale[2]]}
        onClick={() => {}}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.7}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </Box>
      <Text
        position={[0, obj.scale[1] / 2 + 0.3, 0]}
        fontSize={0.2}
        color="#E2E8F0"
        anchorX="center"
        anchorY="middle"
      >
        {obj.id?.split('_')[0] || 'Device'}
      </Text>
    </group>
  )
}

const ConnectionLine: React.FC<{ conn: any }> = ({ conn }) => {
  const fromObj = useSceneStore((s) => s.objects[conn.from])
  const toObj = useSceneStore((s) => s.objects[conn.to])

  if (!fromObj || !toObj) return null

  const points = useMemo(() => {
    const from = new THREE.Vector3(...fromObj.position)
    const to = new THREE.Vector3(...toObj.position)
    return [from, to]
  }, [fromObj.position, toObj.position])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#00D4FF" linewidth={2} />
    </line>
  )
}

const Scene: React.FC = () => {
  const { objects, connections } = useSceneStore()

  return (
    <group>
      {Object.entries(objects).map(([id, obj]) => (
        <DeviceMesh key={id} id={id} obj={obj} />
      ))}
      {connections.map((conn) => (
        <ConnectionLine key={conn.id} conn={conn} />
      ))}
      <DataOverlay />
    </group>
  )
}

export default Scene
