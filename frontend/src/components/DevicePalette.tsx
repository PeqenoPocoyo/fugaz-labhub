// DevicePalette — Paleta de dispositivos
import React, { useEffect } from 'react'
import { useDeviceStore } from '../store/deviceStore'
import { useSceneStore } from '../store/sceneStore'
import { Cpu, Zap, Gauge, Camera, Box, Layers } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  plc: Cpu,
  microcontroller: Cpu,
  actuator: Zap,
  sensor: Gauge,
  pneumatic: Box,
  hydraulic: Box,
  mechanical: Layers,
  vision: Camera,
  material: Box,
  electronic: Zap,
  power: Zap,
  hmi: Cpu,
  drive: Zap,
}

const DevicePalette: React.FC = () => {
  const { catalog, categories, fetchCatalog, selectedDeviceType, selectDeviceType } = useDeviceStore()
  const { addObject } = useSceneStore()

  useEffect(() => {
    fetchCatalog()
  }, [])

  const handleDragStart = (e: React.DragEvent, deviceType: string) => {
    e.dataTransfer.setData('deviceType', deviceType)
    selectDeviceType(deviceType)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const deviceType = e.dataTransfer.getData('deviceType')
    if (deviceType) {
      const device = catalog.find((d) => d.id === deviceType)
      if (device) {
        addObject({
          id: `${device.id}_${Date.now()}`,
          type: device.id,
          position: [0, 0.5, 0],
          rotation: [0, 0, 0],
          scale: [
            device.dimensions.width / 100,
            device.dimensions.height / 100,
            device.dimensions.depth / 100,
          ],
          properties: device.factory_defaults || {},
          layer: 'devices',
        })
      }
    }
    selectDeviceType(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="p-3 border-b border-[#2D3748]">
        <h2 className="text-sm font-semibold text-white mb-2">Dispositivos</h2>
        <input
          type="text"
          placeholder="Buscar dispositivo..."
          className="w-full px-3 py-1.5 text-xs bg-[#0A0E17] border border-[#2D3748] rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00D4FF]"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => (
          <div key={category} className="mb-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 px-1">
              {category}
            </h3>
            <div className="space-y-1">
              {catalog
                .filter((d) => d.category === category)
                .map((device) => {
                  const Icon = CATEGORY_ICONS[device.category] || Box
                  return (
                    <div
                      key={device.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, device.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-[#2D3748] transition group ${
                        selectedDeviceType === device.id ? 'bg-[#00D4FF]/10 border border-[#00D4FF]/30' : ''
                      }`}
                    >
                      <Icon size={14} className="text-[#00D4FF] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate group-hover:text-white transition">
                          {device.name}
                        </p>
                        <p className="text-[10px] text-gray-600 truncate">
                          {device.manufacturer}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-[#2D3748] text-center">
        <p className="text-[10px] text-gray-600">
          {catalog.length} dispositivos disponíveis
        </p>
      </div>
    </div>
  )
}

export default DevicePalette
