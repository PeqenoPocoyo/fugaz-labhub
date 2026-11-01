// StatusBar — Barra de status
import React from 'react'
import { useSceneStore } from '../store/sceneStore'
import { Activity, Wifi, Cpu, Clock } from 'lucide-react'

const StatusBar: React.FC = () => {
  const { objects, connections } = useSceneStore()

  return (
    <footer className="h-8 bg-[#1A1F2E] border-t border-[#2D3748] flex items-center px-4 justify-between text-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Activity size={12} className="text-[#10B981]" />
          <span>Simulação: <span className="text-[#10B981]">Parada</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Cpu size={12} className="text-[#00D4FF]" />
          <span>Objetos: {Object.keys(objects).length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Link size={12} className="text-[#FF6B35]" />
          <span>Conexões: {connections.length}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Wifi size={12} className="text-[#10B981]" />
          <span>Backend: <span className="text-[#10B981]">Conectado</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock size={12} />
          <span className="font-mono">00:00:00</span>
        </div>
      </div>
    </footer>
  )
}

// Fix missing import
import { Link } from 'lucide-react'

export default StatusBar
