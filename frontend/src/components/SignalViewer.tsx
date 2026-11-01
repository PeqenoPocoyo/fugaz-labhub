// SignalViewer — Visualizador de sinais analógicos/digitais
import React, { useState, useRef, useEffect } from 'react'
import { Activity } from 'lucide-react'

const SignalViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signals, setSignals] = useState<{ name: string; data: number[]; color: string }[]>([
    { name: 'AI0', data: [], color: '#00D4FF' },
    { name: 'AI1', data: [], color: '#FF6B35' },
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [timeWindow] = useState(100)

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setSignals((prev) =>
        prev.map((sig) => ({
          ...sig,
          data: [...sig.data.slice(-timeWindow + 1), Math.random() * 10],
        }))
      )
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, timeWindow])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear
    ctx.fillStyle = '#0A0E17'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 0.5
    for (let y = 0; y < canvas.height; y += canvas.height / 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw signals
    signals.forEach((sig) => {
      if (sig.data.length < 2) return
      ctx.strokeStyle = sig.color
      ctx.lineWidth = 2
      ctx.beginPath()
      const step = canvas.width / (timeWindow - 1)
      sig.data.forEach((val, i) => {
        const x = i * step
        const y = canvas.height - (val / 10) * canvas.height
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Label
      ctx.fillStyle = sig.color
      ctx.font = '10px JetBrains Mono'
      ctx.fillText(sig.name, 5, 12 + signals.indexOf(sig) * 14)
    })
  }, [signals, timeWindow])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-[#1A1F2E] border-b border-[#2D3748]">
        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
          <Activity size={12} /> Sinais
        </h3>
        <div className="flex items-center gap-2">
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
      </div>
      <canvas ref={canvasRef} className="flex-1" />
      <div className="px-2 py-1 bg-[#1A1F2E] border-t border-[#2D3748] text-[10px] text-gray-500 flex items-center justify-between">
        <span>Janela: {timeWindow} amostras</span>
        <span>{signals.length} canais</span>
      </div>
    </div>
  )
}

export default SignalViewer
