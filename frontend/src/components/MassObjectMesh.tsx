// MassObjectMesh — Renderização de objetos de massa na cena 3D
import React from 'react'
import { Html } from '@react-three/drei'

import { useSceneStore } from '../store/sceneStore'

interface MassObjectMeshProps {
  id: string
  obj: any
  onSelect: (id: string) => void
}

const MassObjectMesh: React.FC<MassObjectMeshProps> = ({ id, obj, onSelect }) => {
  const { selectedId } = useSceneStore()
  const isSelected = selectedId === id

  // Cor baseada no material
  const color = obj.color || '#64748b'

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
            ? 'border-[#00D4FF] text-[#00D4FF] shadow-[0_0_8px_rgba(0,212,255,0.4)]'
            : `border-${obj.category === 'solid' ? '#00D4FF' : obj.category === 'liquid' ? '#10B981' : '#F59E0B'}/30 text-${obj.category === 'solid' ? '#00D4FF' : obj.category === 'liquid' ? '#10B981' : '#F59E0B'}`
        }`}>
          {id.split('_')[0]} ({obj.category})
        </div>
      </Html>
    </group>
  )
}

export default MassObjectMesh
