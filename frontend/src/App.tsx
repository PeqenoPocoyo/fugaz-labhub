import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import { useSimulation } from './hooks/useSimulation'
import { useWorldSync } from './hooks/useWorldSync'
import { useSceneStore } from './store/sceneStore'
import { DeviceDrawer } from './components/drawers/DeviceDrawer'
import { DeviceCard } from './components/device/DeviceCard'
import DiagnosisConsole from './components/diagnostics/DiagnosisConsole'
import { NoticeStack, useNotices } from './components/diagnostics/NoticeStack'
import { BenchScene } from './components/scene/BenchScene'
import { CameraPiP } from './components/scene/CameraPiP'
import { CommandPalette } from './components/command/CommandPalette'
import { Layers, SlidersHorizontal, Radio, Crosshair, Pause, Play, Terminal, Trash2, Zap, Search } from 'lucide-react'
import './styles/base.css'

const App: React.FC = () => {
  const sim = useSimulation('ws://localhost:8000/ws/sim')
  useWorldSync(true)  // bancada reflete o mundo real do backend
  const { objects, connections, slots, conduits, drivetrains, selectObject, selectedId } = useSceneStore()
  // Câmera selecionada → preview ao vivo (render duplo da vista fixa)
  const cameraNode = selectedId && objects[selectedId]?.type_id === 'camera_ip'
    ? objects[selectedId] : null
  const [view, setView] = React.useState<'bench' | 'commission'>('bench')
  const [dragOver, setDragOver] = React.useState(false)
  const [xrayLevel, setXrayLevel] = React.useState(1) // 1 = tudo visível
  const [simRunning, setSimRunning] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const { notices, push, dismiss } = useNotices()
  const booted = React.useRef(false)

  // Log real (alimenta o Console de Diagnóstico)
  const [logs, setLogs] = React.useState<any[]>([])
  const addLog = React.useCallback((level: string, source: string, message: string) => {
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`
    setLogs(prev => [{ id: Math.random().toString(36).slice(2), time: t, level, source, message }, ...prev].slice(0, 200))
  }, [])

  React.useEffect(() => {
    if (booted.current) return  // evita duplicata no StrictMode
    booted.current = true
    push({ severity: 'info', title: 'Fugaz LABHUB pronto', source: 'boot', detail: 'Bancada carregada. Arraste dispositivos para começar.' })
    addLog('success', 'boot', 'Bancada carregada — backend conectado')
  }, [])

  const handleQuickAdd = async (typeId: string) => {
    try {
      const r = await fetch('/api/devices/spawn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_id: typeId }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      push({ severity: 'success', title: `${d.name} adicionado`, source: 'spawn' })
      addLog('success', 'spawn', `${d.name} (${d.id}) adicionado à bancada`)
    } catch {
      push({ severity: 'error', title: 'Falha ao adicionar', source: 'spawn', detail: 'Backend offline?' })
      addLog('error', 'spawn', `Falha ao adicionar ${typeId} — backend offline?`)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const typeId = e.dataTransfer.getData('deviceType')
    if (typeId) handleQuickAdd(typeId)
  }

  const toggleSim = () => {
    if (simRunning) { sim.stopSimulation(); setSimRunning(false); push({ severity: 'info', title: 'Simulação parada', source: 'sim' }); addLog('info', 'sim', 'Simulação parada') }
    else { sim.startSimulation(); setSimRunning(true); push({ severity: 'success', title: 'Simulação iniciada', source: 'sim', detail: 'Passo fixo 60 Hz' }); addLog('success', 'sim', 'Simulação iniciada (passo fixo 60 Hz)') }
  }

  // Atalho global Ctrl/⌘+K
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commands = React.useMemo(() => [
    { id: 'sim_toggle', group: 'Simulação', label: simRunning ? 'Parar simulação' : 'Iniciar simulação', hint: '60Hz', icon: simRunning ? Pause : Play, run: toggleSim },
    { id: 'commission', group: 'Visualização', label: view === 'commission' ? 'Modo Bancada' : 'Modo Comissionamento', icon: Crosshair, run: () => setView(v => v === 'bench' ? 'commission' : 'bench') },
    { id: 'xray_max', group: 'Visualização', label: 'Raio-X: mostrar tudo', icon: Layers, run: () => setXrayLevel(1) },
    { id: 'clear_log', group: 'Diagnóstico', label: 'Limpar log', icon: Terminal, run: () => { setLogs([]) } },
    { id: 'reset', group: 'Diagnóstico', label: 'Resetar bancada', icon: Trash2, run: async () => { await fetch('/api/world/reset', { method: 'POST' }); addLog('warn', 'world', 'Bancada resetada') } },
    { id: 'proto', group: 'Diagnóstico', label: 'Ver protocolos ativos', icon: Radio, run: () => addLog('info', 'proto', 'Endpoint /api/protocols') },
    ...['clp_generic', 'motor_dc', 'vfd_generic', 'sensor_photoelectric', 'conveyor_belt',
        'trans_gears', 'trans_belt', 'trans_screw', 'vision_tape', 'vision_marker',
        'camera_ip', 'pump_centrifugal', 'flow_vortex', 'valve_control', 'tank', 'duct']
      .map(t => ({ id: `add_${t}`, group: 'Adicionar rápido', label: `Adicionar ${t.replace(/_/g, ' ')}`, icon: Zap, run: () => handleQuickAdd(t) })),
  ], [simRunning, view, handleQuickAdd, addLog])

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B0E13] overflow-hidden">
      {/* Topbar minimalista */}
      <header className="h-11 bg-[#141922] border-b border-[#232C38] flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-[#00E5FF] to-[#AB47BC] flex items-center justify-center">
            <span className="text-white font-bold text-[11px]">F</span>
          </div>
          <span className="fz-display text-sm">Fugaz <span className="text-[#00E5FF]">LABHUB</span></span>
        </div>
        <div className="flex-1" />
        {/* Atalho command palette */}
        <button onClick={() => setPaletteOpen(true)}
          title="Comandos (Ctrl+K)"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono rounded border border-[#232C38] text-[#6B7787] hover:text-white hover:border-[#34404F] transition">
          <Search size={11} /> <span className="opacity-60">⌘K</span>
        </button>
        {/* Toggle modo */}
        <button onClick={() => setView(v => v === 'bench' ? 'commission' : 'bench')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded border transition ${
            view === 'commission' ? 'bg-[#AB47BC]/15 border-[#AB47BC]/40 text-[#AB47BC]' : 'border-[#232C38] text-[#6B7787] hover:text-white'
          }`}>
          <Crosshair size={11} /> {view === 'bench' ? 'Comissionar' : 'Bancada'}
        </button>
        {/* Sim */}
        <button onClick={toggleSim}
          className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded transition ${
            simRunning ? 'bg-[#EF5350]/20 text-[#EF5350]' : 'bg-[#26A69A]/20 text-[#26A69A]'
          }`}
          style={simRunning ? { animation: 'fz-breathe 2s infinite' } : {}}>
          {simRunning ? '■ Parar' : '▶ Simular'}
        </button>
        <span className="flex items-center gap-1 text-[9px] font-mono text-[#6B7787]">
          <Radio size={10} className="text-[#26A69A]" /> online
        </span>
      </header>

      {/* Corpo: gaveta + bancada + cartão */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative"
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}>

        {/* Gaveta esquerda */}
        <div className="w-60 shrink-0">
          <DeviceDrawer onDragDevice={() => setDragOver(true)} onQuickAdd={handleQuickAdd} />
        </div>

        {/* Bancada 3D */}
        <main className="flex-1 relative min-w-0">
          <Canvas className="w-full h-full" camera={{ position: [8, 7, 8], fov: 45 }}>
            <PerspectiveCamera makeDefault position={[8, 7, 8]} fov={45} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[8, 12, 6]} intensity={0.9} castShadow />
            <hemisphereLight args={['#1A2130', '#0B0E13', 0.5]} />
            <Grid args={[30, 30]} cellSize={1} cellColor="#1A2130" sectionSize={5} sectionColor="#232C38"
              fadeDistance={40} infiniteGrid />
            <BenchScene
              objects={objects}
              connections={connections}
              slots={slots}
              conduits={conduits}
              drivetrains={drivetrains}
              selectedId={selectedId}
              onSelect={(id) => selectObject(id)}
            />
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
          </Canvas>

          {/* Overlay drop */}
          {dragOver && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-dashed border-[#00E5FF] rounded-lg px-6 py-3 bg-[#00E5FF]/10 text-[#00E5FF] font-mono text-xs">
                SOLTE PARA ENCAIXAR
              </div>
            </div>
          )}

          {/* Raio-X de camadas (slider vertical) */}
          <div className="absolute top-3 right-3 flex flex-col items-center gap-1.5 bg-[#141922]/80 backdrop-blur border border-[#232C38] rounded p-2">
            <Layers size={13} className="text-[#6B7787]" />
            <span className="fz-label text-[8px]">RAIO-X</span>
            <input type="range" min="0" max="1" step="0.05" value={xrayLevel}
              onChange={e => setXrayLevel(parseFloat(e.target.value))}
              className="h-24 w-1 accent-[#00E5FF]" style={{ writingMode: 'vertical-lr' } as any} />
            <span className="text-[8px] font-mono text-[#00E5FF]">{(xrayLevel * 100).toFixed(0)}%</span>
          </div>

          {/* Notificações */}
          <NoticeStack notices={notices} onDismiss={dismiss} />

          {/* Preview ao vivo da câmera (canto inferior direito) */}
          {cameraNode && (
            <div className="absolute bottom-3 right-3 z-20">
              <CameraPiP
                camera={cameraNode}
                objects={objects}
                connections={connections}
                slots={slots}
                conduits={conduits}
                drivetrains={drivetrains}
                onClose={() => selectObject(null)}
              />
            </div>
          )}

          {/* HUD canto inferior esquerdo */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[9px] font-mono text-[#6B7787]">
            <span>{Object.keys(objects).length} nós</span>
            <span>{connections.length} conexões</span>
            <span className="flex items-center gap-1"><SlidersHorizontal size={9} /> arraste p/ orbitar</span>
          </div>
        </main>

        {/* Gaveta direita: cartão do dispositivo */}
        <div className="w-72 shrink-0">
          <DeviceCard deviceId={selectedId} onClose={() => selectObject(null)} />
          {!selectedId && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#141922] border-l border-[#232C38]">
              <div className="w-12 h-12 rounded-full border-2 border-[#232C38] flex items-center justify-center mb-3">
                <Layers size={20} className="text-[#6B7787]" />
              </div>
              <p className="text-[11px] text-[#6B7787]">Selecione um dispositivo<br />na bancada</p>
            </div>
          )}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      {/* Console de diagnóstico */}
      <DiagnosisConsole logs={logs} onClear={() => setLogs([])} />
    </div>
  )
}

export default App