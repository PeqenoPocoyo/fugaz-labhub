// DataOverlay — Visualização de dados na cena
import React from 'react'
import { Html } from '@react-three/drei'
import { useSceneStore } from '../store/sceneStore'

const DataOverlay: React.FC = () => {
  const { objects } = useSceneStore()

  return (
    <>
      {Object.entries(objects).map(([id, obj]) => (
        <Html
          key={id}
          position={[obj.position[0], obj.position[1] + obj.scale[1] / 2 + 0.5, obj.position[2]]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-[#1A1F2E]/80 backdrop-blur-sm border border-[#00D4FF]/30 rounded px-2 py-1 text-[10px] font-mono text-[#00D4FF] whitespace-nowrap">
            <div className="font-semibold">{id.split('_')[0]}</div>
            <div className="text-gray-400">X:{obj.position[0].toFixed(1)} Y:{obj.position[1].toFixed(1)}</div>
          </div>
        </Html>
      ))}
    </>
  )
}

export default DataOverlay
