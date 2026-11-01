// Scene3D — Cena 3D interativa com dispositivos e objetos de massa
import React from 'react'
import { Html } from '@react-three/drei'

import { useSceneStore } from '../store/sceneStore'
import { useMassStore } from '../store/massStore'

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
  // Mass categories
  solid: '#EC4899',
  liquid: '#10B981',
  gas: '#F59E0B',
}

const DeviceMesh: React.FC<{ id: string; obj: any; onSelect: (id: string) => void }> = ({ id, obj, onSelect }) => {
  const color = CATEGORY_COLORS[obj.type?.split('_')[0]] || '#64748b'
  const { selectedId } = useSceneStore()
  const isSelected = selectedId === id

  return (
    <group position={obj.position} rotation={obj.rotation} onClick={() => onSelect(id)}>
      <mesh>
        <boxGeometry args={obj.scale} />
        <meshStandardMaterial
          color={color}
          metalness={isSelected ? 0.8 : 0.3}
          roughness={isSelected ? 0.2 : 0.7}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.15}
        />
      </mesh>
      <Html
        position={[0, obj.scale[1] / 2 + 0.3, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`bg-[#1A1F2E]/90 backdrop-blur-sm border rounded px-1.5 py-0.5 text-[9px] font-mono whitespace-nowrap ${
          isSelected
            ? 'border-[#00D4FF] text-[#00D4FF] shadow-[0_0_8px_rgba(0,212,255,0.4)]'
            : 'border-[#2D3748]/50 text-[#00D4FF]'
        }`}>
          {id.split('_')[0]}
        </div>
      </Html>
    </group>
  )
}

const MassObjectMesh: React.FC<{ id: string; obj: any; onSelect: (id: string) => void }> = ({ id, obj, onSelect }) => {
  const color = obj.color || CATEGORY_COLORS[obj.category] || '#64748b'
  const { selectedId } = useMassStore()
  const isSelected = selectedId === id

  return (
    <group position={obj.position} rotation={obj.rotation} onClick={() => onSelect(id)}>
      <mesh>
        <boxGeometry args={obj.scale} />
        <meshStandardMaterial
          color={color}
          metalness={obj.category === 'solid' ? 0.5 : 0.1}
          roughness={obj.category === 'liquid' ? 0.2 : 0.7}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.1}
          transparent={obj.category !== 'solid' ? true : false}
          opacity={obj.category !== 'solid' ? 0.6 : 1.0}
        />
      </mesh>
      <Html
        position={[0, obj.scale[1] / 2 + 0.3, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`bg-[#1A1F2E]/90 backdrop-blur-sm border rounded px-1.5 py-0.5 text-[9px] font-mono whitespace-nowrap ${
          isSelected
            ? 'border-[#EC4899] text-[#EC4899] shadow-[0_0_8px_rgba(236,72,153,0.4)]'
            : `border-[#2D3748]/50 text-${obj.category === 'solid' ? '#EC4899' : obj.category === 'liquid' ? '#10B981' : '#F59E0B'}`
        }`}>
          {id.split('_')[0]} ({obj.category})
        </div>
      </Html>
    </group>
  )
}

interface Scene3DProps {
  onSelect: (id: string, type: 'device' | 'mass') => void
}

const Scene3D: React.FC<Scene3DProps> = ({ onSelect }) => {
  const { objects } = useSceneStore()
  const { objects: massObjects } = useMassStore()

  return (
    <group>
      {Object.entries(objects).map(([id, obj]) => (
        <DeviceMesh key={`dev-${id}`} id={id} obj={obj} onSelect={(id) => onSelect(id, 'device')} />
      ))}
      {Object.entries(massObjects).map(([id, obj]) => (
        <MassObjectMesh key={`mass-${id}`} id={id} obj={obj} onSelect={(id) => onSelect(id, 'mass')} />
      ))}
    </group>
  )
}

export default Scene3D
