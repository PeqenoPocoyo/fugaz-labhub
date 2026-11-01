// VibrationMonitor — Monitor de vibração de máquinas
import React, { useState, useEffect, useRef } from 'react'
import { Activity, AlertTriangle } from 'lucide-react'

const VibrationMonitor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [rms, setRms] = useState(0)
  const [peak, setPeak] = useState(0)
  const [crestFactor, setCrestFactor] = useState(0)
  const [severity, setSeverity] = useState<'normal' | 'warning' | 'critical'>('normal')
  const [signal, setSignal] = useState<number[]>([])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      // Simular sinal de vibração
      const t = Date.now() / 1000
      const newSample = Math.sin(2 * Math.PI * 50 * t) * 2 + 
                        Math.sin(2 * Math.PI * 120 * t) * 0.5 + 
                        (Math.random() - 0.5) * 0.3
      
      setSignal((prev) => {
        const updated = [...prev.slice(-200), newSample]
        // Calcular métricas
        const rmsVal = Math.sqrt(updated.reduce((a, b) => a + b * b, 0) / updated.length)
        const peakVal = Math.max(...updated.map(Math.abs))
        const cf = peakVal / (rmsVal + 1e-10)
        
        setRms(rmsVal)
        setPeak(peakVal)
        setCrestFactor(cf)
        
        if (rmsVal > 5) setSeverity('critical')
        else if (rmsVal > 2) setSeverity('warning')
        else setSeverity('normal')
        
        return updated
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isRunning])

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
    for (let y = 0; y < canvas.height; y += canvas.height / 4) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Signal
    if (signal.length > 1) {
      ctx.strokeStyle = severity === 'critical' ? '#EF4444' : severity === 'warning' ? '#F59E0B' : '#00D4FF'
      ctx.lineWidth = 2
      ctx.beginPath()
      const step = canvas.width / (signal.length - 1)
      signal.forEach((val, i) => {
        const x = i * step
        const y = canvas.height / 2 - val * (canvas.height / 10)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
  }, [signal, severity])

  const severityColors = {
    normal: 'text-[#10B981]',
    warning: 'text-[#F59E0B]',
    critical: 'text-[#EF4444]',
  }

  const severityLabels = {
    normal: 'Normal',
    warning: 'Atenção',
    critical: 'Crítico',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-[#1A1F2E] border-b border-[#2D3748]">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <Activity size={12} /> Vibração
        </h3>
        <button
          onClick={() => setIsRunning(!isRunning)}
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

      <div className="grid grid-cols-3 gap-1 p-2 bg-[#1A1F2E] border-t border-[#2D3748]">
        <div className="text-center">
          <p className="text-[9px] text-gray-500">RMS</p>
          <p className="text-xs text-[#00D4FF] font-mono">{rms.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">Pico</p>
          <p className="text-xs text-[#FF6B35] font-mono">{peak.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-gray-500">Crest</p>
          <p className="text-xs text-[#7C3AED] font-mono">{crestFactor.toFixed(2)}</p>
        </div>
      </div>

      <div className={`px-2 py-1 text-[10px] font-medium text-center ${severityColors[severity]}`}>
        {severity === 'critical' && <AlertTriangle size={10} className="inline mr-1" />}
        Status: {severityLabels[severity]}
      </div>
    </div>
  )
}

export default VibrationMonitor
