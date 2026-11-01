// LayerManager — Gerenciamento de camadas
import React from 'react'
import { useLayerStore } from '../store/layerStore'
import { Eye, EyeOff, Lock, Unlock, Layers } from 'lucide-react'

const LayerManager: React.FC = () => {
  const { layers, activeLayer, toggleVisibility, toggleLock, setActiveLayer } = useLayerStore()

  return (
    <div className="border-t border-[#2D3748]">
      <div className="p-3 border-b border-[#2D3748]">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers size={14} /> Camadas
        </h2>
      </div>
      <div className="p-2 space-y-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition ${
              activeLayer === layer.id ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/30' : 'hover:bg-[#2D3748]'
            }`}
          >
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: layer.color, opacity: layer.visible ? 1 : 0.3 }}
            />
            <span className={`text-xs flex-1 ${layer.visible ? 'text-gray-300' : 'text-gray-600'}`}>
              {layer.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id) }}
              className="p-0.5 text-gray-500 hover:text-white transition"
            >
              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleLock(layer.id) }}
              className="p-0.5 text-gray-500 hover:text-white transition"
            >
              {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LayerManager
