// ThermalMonitor — Monitor de temperatura de componentes
import React, { useState, useEffect, useRef } from 'react'
import { Thermometer, AlertTriangle } from 'lucide-react'

const ThermalMonitor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [temperature, setTemperature] = useState(25)
  const [maxTemp] = useState(85)
  const [power] = useState(5)
  const [thermalResistance] = useState(10)
  const [history, setHistory] = useState<number[]>([])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setTemperature((prev) => {
        // Simular aquecimento: T = T_amb + P * R_th * (1 - exp(-t/tau))
        const target = 25 + power * thermalResistance
        const newTemp = prev + (target - prev) * 0.05
        setHistory((h) => [...h.slice(-100), newTemp])
        return newTemp
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, power, thermalResistance])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.fillStyle = '#0A0E17'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 0.5
    for (let y = 0; y < canvas.height; y += canvas.height / 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Temperature history
    if (history.length > 1) {
      ctx.strokeStyle = temperature > maxTemp ? '#EF4444' : temperature > maxTemp - 10 ? '#F59E0B' : '#10B981'
      ctx.lineWidth = 2
      ctx.beginPath()
      const step = canvas.width / (history.length - 1)
      history.forEach((val, i) => {
        const x = i * step
        const y = canvas.height - ((val - 20) / (maxTemp - 20)) * canvas.height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Max temp line
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      const maxLineY = canvas.height - ((maxTemp - 20) / (maxTemp - 20)) * canvas.height
      ctx.beginPath()
      ctx.moveTo(0, maxLineY)
      ctx.lineTo(canvas.width, maxLineY)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [history, temperature, maxTemp])

  const severity = temperature > maxTemp ? 'critical' : temperature > maxTemp - 10 ? 'warning' : 'normal'
  const severityColors = {
    normal: 'text-[#10B981]',
    warning: 'text-[#F59E0B]',
    critical: 'text-[#EF4444]',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-[#1A1F2E] border-b border-[#2D3748]">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <Thermometer size={12} /> Térmico
        </h3>
        <button
          onClick={() => { setIsRunning(!isRunning); if (!isRunning) setTemperature(25) }}
          className={`px-2 py-0.5 text-[10px] rounded transition ${
            isRunning
              ? 'bg-[#EF4444]/20 text-[#EF4444]'
              : 'bg-[#10B981]/20 text-[#10B981]'
          }`}
        >
          {isRunning ? 'Parar' : 'Iniciar'}
        </button>
      </div>

      <canvas ref={canvasRef} className="flex-1" />

      <div className="grid grid-cols-2 gap-1 p-2 bg-[#1A1F2E] border-t border-[#2D3748]">
        <div className="text-center">
          <p className="text-[9px] text-gray-500">Temperatura</p>
          <p className={`text-xs font-mono ${severityColors[severity]}`}>
            {temperature.toFixed(1)}°C
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">Máxima</p>
          <p className="text-xs text-[#EF4444] font-mono">{maxTemp}°C</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">Potência</p>
          <p className="text-xs text-[#FF6B35] font-mono">{power}W</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">R_th</p>
          <p className="text-xs text-[#7C3AED] font-mono">{thermalResistance}°C/W</p>
        </div>
      </div>

      {severity === 'critical' && (
        <div className="px-2 py-1 text-[10px] font-medium text-center text-[#EF4444] bg-[#EF4444]/10 flex items-center justify-center gap-1">
          <AlertTriangle size={10} /> SUPER AQUECIMENTO!
        </div>
      )}
    </div>
  )
}

export default ThermalMonitor
