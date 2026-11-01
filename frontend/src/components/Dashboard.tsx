// Dashboard — Painel de controle da simulação
import React, { useState } from 'react'
import { Play, Pause, Square, Gauge, TrendingUp, Activity } from 'lucide-react'
import { useSceneStore } from '../store/sceneStore'

const Dashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [simTime, setSimTime] = useState(0)
  const { objects, connections } = useSceneStore()

  const handleStart = () => {
    setIsRunning(true)
    // TODO: enviar comando via WebSocket
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSimTime(0)
  }

  return (
    <div className="p-3 border-t border-[#2D3748]">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Activity size={14} /> Simulação
      </h2>

      {/* Controles */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg transition ${
            isRunning
              ? 'bg-[#2D3748] text-gray-500 cursor-not-allowed'
              : 'bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30'
          }`}
        >
          <Play size={12} /> Iniciar
        </button>
        <button
          onClick={handleStop}
          disabled={!isRunning}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg transition ${
            !isRunning
              ? 'bg-[#2D3748] text-gray-500 cursor-not-allowed'
              : 'bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30'
          }`}
        >
          <Pause size={12} /> Pausar
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-[#EF4444]/20 text-[#EF4444] rounded-lg hover:bg-[#EF4444]/30 transition"
        >
          <Square size={12} />
        </button>
      </div>

      {/* Velocidade */}
      <div className="mb-3">
        <label className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
          <Gauge size={10} /> Velocidade: {speed.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
        />
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#0A0E17] rounded-lg p-2">
          <p className="text-[10px] text-gray-500">Tempo Sim.</p>
          <p className="text-xs text-[#00D4FF] font-mono">{simTime.toFixed(2)}s</p>
        </div>
        <div className="bg-[#0A0E17] rounded-lg p-2">
          <p className="text-[10px] text-gray-500">Objetos</p>
          <p className="text-xs text-[#FF6B35] font-mono">{Object.keys(objects).length}</p>
        </div>
        <div className="bg-[#0A0E17] rounded-lg p-2">
          <p className="text-[10px] text-gray-500">Conexões</p>
          <p className="text-xs text-[#7C3AED] font-mono">{connections.length}</p>
        </div>
        <div className="bg-[#0A0E17] rounded-lg p-2">
          <p className="text-[10px] text-gray-500">Status</p>
          <p className={`text-xs font-mono ${isRunning ? 'text-[#10B981]' : 'text-gray-500'}`}>
            {isRunning ? 'Rodando' : 'Parado'}
          </p>
        </div>
      </div>

      {/* Gráfico de tendência (placeholder) */}
      <div className="bg-[#0A0E17] rounded-lg p-2 h-20 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <TrendingUp size={16} />
          <span className="text-[10px]">Gráfico de tendências</span>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
