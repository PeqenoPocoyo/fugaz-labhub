// Vision Config — Configuração de visão computacional
import React, { useState } from 'react'
import { Camera, Play, Square } from 'lucide-react'

const VisionConfig: React.FC = () => {
  const [cameraSource, setCameraSource] = useState('0')
  const [detectionMode, setDetectionMode] = useState('contours')
  const [minArea, setMinArea] = useState(500)
  const [isRunning, setIsRunning] = useState(false)
  const [detections] = useState(0)

  const detectionModes = [
    { id: 'contours', name: 'Contornos' },
    { id: 'color', name: 'Cor (HSV)' },
    { id: 'barcode', name: 'Código de Barras' },
    { id: 'face', name: 'Face' },
    { id: 'object', name: 'Objeto (YOLO)' },
  ]

  return (
    <div className="p-3 border-t border-[#2D3748]">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Camera size={14} /> Visão Computacional
      </h2>

      {/* Camera source */}
      <div className="mb-3">
        <label className="text-[10px] text-gray-500 mb-1 block">Fonte da Câmera</label>
        <select
          value={cameraSource}
          onChange={(e) => setCameraSource(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
        >
          <option value="0">Webcam (0)</option>
          <option value="1">Webcam (1)</option>
          <option value="rtsp">RTSP Stream</option>
          <option value="file">Arquivo de Vídeo</option>
        </select>
      </div>

      {/* Detection mode */}
      <div className="mb-3">
        <label className="text-[10px] text-gray-500 mb-1 block">Modo de Detecção</label>
        <select
          value={detectionMode}
          onChange={(e) => setDetectionMode(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-[#0A0E17] border border-[#2D3748] rounded text-gray-300 focus:outline-none focus:border-[#00D4FF]"
        >
          {detectionModes.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Min area */}
      <div className="mb-3">
        <label className="text-[10px] text-gray-500 mb-1 block">
          Área Mínima: {minArea}px²
        </label>
        <input
          type="range"
          min="100"
          max="5000"
          step="100"
          value={minArea}
          onChange={(e) => setMinArea(parseInt(e.target.value))}
          className="w-full h-1 bg-[#2D3748] rounded-lg appearance-none cursor-pointer accent-[#00D4FF]"
        />
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#10B981] animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-[10px] text-gray-400">
            {isRunning ? 'Rodando' : 'Parado'}
          </span>
        </div>
        <span className="text-[10px] text-[#00D4FF] font-mono">
          {detections} detecções
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-lg transition ${
            isRunning
              ? 'bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30'
              : 'bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30'
          }`}
        >
          {isRunning ? <Square size={12} /> : <Play size={12} />}
          {isRunning ? 'Parar' : 'Iniciar'}
        </button>
      </div>
    </div>
  )
}

export default VisionConfig
