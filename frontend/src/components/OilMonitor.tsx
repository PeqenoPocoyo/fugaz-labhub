// OilMonitor — Monitor de condição do óleo
import React, { useState } from 'react'
import { Droplets, AlertTriangle } from 'lucide-react'

const OilMonitor: React.FC = () => {
  const [tbn, setTbn] = useState(10.0)
  const [viscosity, setViscosity] = useState(100)
  const [waterContent, setWaterContent] = useState(0.01)
  const [particleCount, setParticleCount] = useState(100)
  const [operatingHours] = useState(500)
  const [tbnNew] = useState(10.0)

  const degradation = ((1 - tbn / tbnNew) * 100)
  const remainingPercent = 100 - degradation

  const status = remainingPercent > 50 ? 'Bom' : remainingPercent > 20 ? 'Monitorar' : 'Substituir'
  const statusColor = remainingPercent > 50 ? 'text-[#10B981]' : remainingPercent > 20 ? 'text-[#F59E0B]' : 'text-[#EF4444]'

  const contamination = particleCount > 1000 || waterContent > 0.1

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-[#1A1F2E] border-b border-[#2D3748]">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <Droplets size={12} /> Óleo
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TBN */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">TBN Atual</span>
            <span className="text-[#00D4FF] font-mono">{tbn.toFixed(1)} mg KOH/g</span>
          </div>
          <input
            type="range"
            min="0"
            max="15"
            step="0.1"
            value={tbn}
            onChange={(e) => setTbn(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
          />
        </div>

        {/* Viscosidade */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Viscosidade</span>
            <span className="text-[#FF6B35] font-mono">{viscosity} cSt</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            step="1"
            value={viscosity}
            onChange={(e) => setViscosity(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
          />
        </div>

        {/* Água */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Água</span>
            <span className={`font-mono ${waterContent > 0.1 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
              {waterContent.toFixed(3)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.001"
            value={waterContent}
            onChange={(e) => setWaterContent(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
          />
        </div>

        {/* Partículas */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Partículas</span>
            <span className={`font-mono ${particleCount > 1000 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
              {particleCount}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5000"
            step="10"
            value={particleCount}
            onChange={(e) => setParticleCount(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0A0E17] rounded-lg p-2 text-center">
            <p className="text-[9px] text-gray-500">Degradação</p>
            <p className="text-xs text-[#F59E0B] font-mono">{degradation.toFixed(1)}%</p>
          </div>
          <div className="bg-[#0A0E17] rounded-lg p-2 text-center">
            <p className="text-[9px] text-gray-500">Vida Restante</p>
            <p className={`text-xs font-mono ${statusColor}`}>{remainingPercent.toFixed(1)}%</p>
          </div>
        </div>

        {/* Status */}
        <div className={`px-2 py-1.5 rounded-lg text-[10px] font-medium text-center ${statusColor} bg-opacity-20 ${
          remainingPercent > 50 ? 'bg-[#10B981]/20' : remainingPercent > 20 ? 'bg-[#F59E0B]/20' : 'bg-[#EF4444]/20'
        }`}>
          {contamination && <AlertTriangle size={10} className="inline mr-1" />}
          Status: {status}
          {contamination && ' — CONTAMINAÇÃO DETECTADA'}
        </div>

        {/* Horas de operação */}
        <div className="text-[10px] text-gray-500 text-center">
          Horas de operação: {operatingHours}h
        </div>
      </div>
    </div>
  )
}

export default OilMonitor
