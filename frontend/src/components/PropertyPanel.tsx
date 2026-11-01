// PropertyPanel — Painel de propriedades
import React from 'react'
import { useSceneStore } from '../store/sceneStore'
import { Settings, Tag, Zap } from 'lucide-react'

const PropertyPanel: React.FC = () => {
  const { selectedId, objects } = useSceneStore()
  const selected = selectedId ? objects[selectedId] : null

  if (!selected) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Settings size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs">Selecione um dispositivo</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-[#2D3748]">
        <h2 className="text-sm font-semibold text-white">Propriedades</h2>
        <p className="text-xs text-[#00D4FF] font-mono mt-1">{selected.id}</p>
      </div>

      <div className="p-3 space-y-4">
        {/* Posição */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <Settings size={12} /> Posição
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis}>
                <label className="text-[10px] text-gray-500">{axis}</label>
                <input
                  type="number"
                  step="0.1"
                  value={selected.position[i].toFixed(2)}
                  className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
                  readOnly
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rotação */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <RotateCw size={12} /> Rotação
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis}>
                <label className="text-[10px] text-gray-500">{axis}</label>
                <input
                  type="number"
                  step="0.1"
                  value={selected.rotation[i].toFixed(2)}
                  className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
                  readOnly
                />
              </div>
            ))}
          </div>
        </div>

        {/* Escala */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
            <Zap size={12} /> Escala
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {['X', 'Y', 'Z'].map((axis, i) => (
              <div key={axis}>
                <label className="text-[10px] text-gray-500">{axis}</label>
                <input
                  type="number"
                  step="0.1"
                  value={selected.scale[i].toFixed(2)}
                  className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
                  readOnly
                />
              </div>
            ))}
          </div>
        </div>

        {/* Propriedades */}
        {Object.keys(selected.properties).length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
              <Tag size={12} /> Propriedades
            </h3>
            <div className="space-y-2">
              {Object.entries(selected.properties).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{key}</span>
                  <span className="text-xs text-[#00D4FF] font-mono">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Layer */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">Camada</h3>
          <span className="text-xs text-[#7C3AED] font-mono">{selected.layer}</span>
        </div>
      </div>
    </div>
  )
}

// Import missing icon
import { RotateCw } from 'lucide-react'

export default PropertyPanel
