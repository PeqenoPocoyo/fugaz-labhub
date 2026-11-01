// CircuitCanvas — Editor visual de circuitos elétricos
import React, { useRef, useState } from 'react'

interface CircuitNode {
  id: string
  x: number
  y: number
  type: 'input' | 'output' | 'junction'
}

interface CircuitComp {
  id: string
  type: string
  x: number
  y: number
  rotation: number
  nodeA: string | null
  nodeB: string | null
  value: number
}

const COMPONENT_SYMBOLS: Record<string, string> = {
  resistor: 'R',
  capacitor: 'C',
  inductor: 'L',
  voltage_source: 'V',
  current_source: 'I',
  diode: 'D',
  led: 'LED',
  switch: 'SW',
  ground: 'GND',
}

const CircuitCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<CircuitNode[]>([])
  const [components, setComponents] = useState<CircuitComp[]>([])
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (selectedTool === 'node') {
      const newNode: CircuitNode = {
        id: `node_${Date.now()}`,
        x,
        y,
        type: 'junction',
      }
      setNodes((prev) => [...prev, newNode])
    } else if (selectedTool.startsWith('comp_')) {
      const compType = selectedTool.replace('comp_', '')
      const newComp: CircuitComp = {
        id: `comp_${Date.now()}`,
        type: compType,
        x,
        y,
        rotation: 0,
        nodeA: null,
        nodeB: null,
        value: 0,
      }
      setComponents((prev) => [...prev, newComp])
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking on a component
    const clickedComp = components.find(
      (c) => Math.abs(c.x - x) < 30 && Math.abs(c.y - y) < 30
    )
    if (clickedComp) {
      setSelectedItem(clickedComp.id)
      setIsDragging(true)
      setDragOffset({ x: x - clickedComp.x, y: y - clickedComp.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedItem) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setComponents((prev) =>
      prev.map((c) =>
        c.id === selectedItem ? { ...c, x: x - dragOffset.x, y: y - dragOffset.y } : c
      )
    )
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Draw circuit
  React.useEffect(() => {
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
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw nodes
    nodes.forEach((node) => {
      ctx.fillStyle = '#00D4FF'
      ctx.beginPath()
      ctx.arc(node.x, node.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw components
    components.forEach((comp) => {
      const symbol = COMPONENT_SYMBOLS[comp.type] || '?'
      const isSelected = selectedItem === comp.id

      // Draw component body
      ctx.fillStyle = isSelected ? '#00D4FF' : '#1A1F2E'
      ctx.strokeStyle = isSelected ? '#00D4FF' : '#64748B'
      ctx.lineWidth = 2
      ctx.fillRect(comp.x - 25, comp.y - 15, 50, 30)
      ctx.strokeRect(comp.x - 25, comp.y - 15, 50, 30)

      // Draw symbol
      ctx.fillStyle = isSelected ? '#0A0E17' : '#E2E8F0'
      ctx.font = 'bold 12px JetBrains Mono'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbol, comp.x, comp.y)

      // Draw type label
      ctx.fillStyle = '#64748B'
      ctx.font = '9px Inter'
      ctx.fillText(comp.type, comp.x, comp.y + 25)
    })

    // Draw connections
    components.forEach((comp) => {
      if (comp.nodeA && comp.nodeB) {
        const nodeA = nodes.find((n) => n.id === comp.nodeA)
        const nodeB = nodes.find((n) => n.id === comp.nodeB)
        if (nodeA && nodeB) {
          ctx.strokeStyle = '#00D4FF'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(nodeA.x, nodeA.y)
          ctx.lineTo(comp.x - 25, comp.y)
          ctx.lineTo(comp.x + 25, comp.y)
          ctx.lineTo(nodeB.x, nodeB.y)
          ctx.stroke()
        }
      }
    })
  }, [nodes, components, selectedItem])

  const tools = [
    { id: 'select', label: 'Selecionar' },
    { id: 'node', label: 'Nó' },
    { id: 'comp_resistor', label: 'Resistor' },
    { id: 'comp_capacitor', label: 'Capacitor' },
    { id: 'comp_inductor', label: 'Indutor' },
    { id: 'comp_voltage_source', label: 'Fonte V' },
    { id: 'comp_current_source', label: 'Fonte I' },
    { id: 'comp_diode', label: 'Diodo' },
    { id: 'comp_led', label: 'LED' },
    { id: 'comp_switch', label: 'Chave' },
    { id: 'comp_ground', label: 'Terra' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-[#1A1F2E] border-b border-[#2D3748] overflow-x-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className={`px-2 py-1 text-[10px] rounded transition whitespace-nowrap ${
              selectedTool === tool.id
                ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30'
                : 'text-gray-400 hover:text-white hover:bg-[#2D3748]'
            }`}
          >
            {tool.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { setNodes([]); setComponents([]); setSelectedItem(null) }}
          className="px-2 py-1 text-[10px] text-[#EF4444] hover:bg-[#EF4444]/20 rounded transition"
        >
          Limpar
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Status */}
      <div className="px-3 py-1.5 bg-[#1A1F2E] border-t border-[#2D3748] text-[10px] text-gray-500 flex items-center justify-between">
        <span>Nós: {nodes.length} | Componentes: {components.length}</span>
        <span>Ferramenta: {selectedTool}</span>
      </div>
    </div>
  )
}

export default CircuitCanvas
