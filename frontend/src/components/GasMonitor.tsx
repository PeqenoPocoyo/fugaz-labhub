// GasMonitor — Monitor de gases e sistemas pneumáticos
import React, { useState } from 'react'
import { Wind } from 'lucide-react'

const GasMonitor: React.FC = () => {
  const [pressure, setPressure] = useState(6)
  const [temperature, setTemperature] = useState(25)
  const [humidity, setHumidity] = useState(50)
  const [flowRate, setFlowRate] = useState(100)
  const [purity, setPurity] = useState(99.5)

  const dewPoint = (17.27 * temperature) / (237.7 + temperature) + Math.log(humidity / 100)
  const dp = (237.7 * dewPoint) / (17.27 - dewPoint)

  const status = purity >= 99 ? 'Bom' : purity >= 95 ? 'Monitorar' : 'Crítico'
  const statusColor = purity >= 99 ? 'text-[#10B981]' : purity >= 95 ? 'text-[#F59E0B]' : 'text-[#EF4444]'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-[#1A1F2E] border-b border-[#2D3748]">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <Wind size={12} /> Gases
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Pressão */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Pressão</span>
            <span className="text-[#00D4FF] font-mono">{pressure} bar</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={pressure}
            onChange={(e) => setPressure(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
          />
        </div>

        {/* Temperatura */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Temperatura</span>
            <span className="text-[#FF6B35] font-mono">{temperature}°C</span>
          </div>
          <input
            type="range"
            min="-20"
            max="80"
            step="1"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
          />
        </div>

        {/* Umidade */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Umidade</span>
            <span className="text-[#10B981] font-mono">{humidity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={humidity}
            onChange={(e) => setHumidity(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
          />
        </div>

        {/* Vazão */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Vazão</span>
            <span className="text-[#7C3AED] font-mono">{flowRate} l/min</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="1"
            value={flowRate}
            onChange={(e) => setFlowRate(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
          />
        </div>

        {/* Pureza */}
        <div>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-gray-400">Pureza</span>
            <span className={`font-mono ${statusColor}`}>{purity.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="90"
            max="100"
            step="0.1"
            value={purity}
            onChange={(e) => setPurity(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0A0E17] rounded-lg p-2 text-center">
            <p className="text-[9px] text-gray-500">Ponto de Orvalho</p>
            <p className="text-xs text-[#00D4FF] font-mono">{dp.toFixed(1)}°C</p>
          </div>
          <div className="bg-[#0A0E17] rounded-lg p-2 text-center">
            <p className="text-[9px] text-gray-500">Status</p>
            <p className={`text-xs font-mono ${statusColor}`}>{status}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GasMonitor
