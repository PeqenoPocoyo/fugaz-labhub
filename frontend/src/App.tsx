// App — shell do LABHUB.
// Estrutura TIA Portal (árvore | área de trabalho | inspetor | console)
// + atitude Factory I/O (a cena 3D domina, dados vivos na peça).
// Zero decoração: cada pixel carrega dado ou é respiro.
import React from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import { useSimulation } from './hooks/useSimulation'
import { useWorldSync } from './hooks/useWorldSync'
import { useSceneStore } from './store/sceneStore'
import { ProjectTree } from './components/shell/ProjectTree'
import { Inspector } from './components/shell/Inspector'
import { BenchScene } from './components/scene/BenchScene'
import { Placement } from './components/scene/Placement'
import { FrameController } from './components/scene/FrameController'
import { bornesDe } from './components/scene/recipes'
import { CameraPiP } from './components/scene/CameraPiP'
import { CommandPalette } from './components/command/CommandPalette'
import DiagnosisConsole from './components/diagnostics/DiagnosisConsole'
import { NoticeStack, useNotices } from './components/diagnostics/NoticeStack'
import {
  Layers, Crosshair, Trash2, Zap, Search, Radio, Play, Pause, Terminal,
} from 'lucide-react'
import './styles/base.css'
import './styles/shell.css'

const App: React.FC = () => {
  const sim = useSimulation('ws://localhost:8000/ws/sim')
  useWorldSync(true)  // bancada reflete o mundo real do backend
  const { objects, connections, slots, conduits, drivetrains, selectObject, selectedId } = useSceneStore()

  // câmera selecionada → preview ao vivo (render duplo da vista fixa)
  const cameraNode = selectedId && objects[selectedId]?.type_id === 'camera_ip'
    ? objects[selectedId] : null
  const selectedObj = selectedId ? objects[selectedId] ?? null : null

  const [dragOver, setDragOver] = React.useState(false)
  // type_id sendo arrastado da árvore → fantasma de posicionamento
  const [pendente, setPendente] = React.useState<string | null>(null)
  const [xray, setXray] = React.useState(1)
  const [simRunning, setSimRunning] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [consoleAberto, setConsoleAberto] = React.useState(true)
  const [fiaçãoDe, setFiaçãoDe] = React.useState<string | null>(null)
  const { notices, push, dismiss } = useNotices()
  const booted = React.useRef(false)

  // log real (alimenta o Console de Diagnóstico)
  const [logs, setLogs] = React.useState<any[]>([])
  const addLog = React.useCallback((level: string, source: string, message: string) => {
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`
    setLogs(prev => [{ id: Math.random().toString(36).slice(2), time: t, level, source, message }, ...prev].slice(0, 200))
  }, [])

  React.useEffect(() => {
    if (booted.current) return
    booted.current = true
    push({ severity: 'info', title: 'LABHUB pronto', source: 'boot', detail: 'bancada conectada ao backend' })
    addLog('success', 'boot', 'Bancada carregada — backend conectado')
  }, [])

  const handleQuickAdd = async (typeId: string) => {
    try {
      const r = await fetch('/api/devices/spawn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_id: typeId, port_anchors: bornesDe(typeId) }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      push({ severity: 'success', title: `${d.name} adicionado`, source: 'spawn' })
      addLog('success', 'spawn', `${d.name} (${d.id}) adicionado à bancada`)
    } catch {
      push({ severity: 'error', title: 'Falha ao adicionar', source: 'spawn', detail: 'backend offline?' })
      addLog('error', 'spawn', `Falha ao adicionar ${typeId} — backend offline?`)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    // com fantasma ativo, quem posiciona é o Placement (evita spawn duplo)
    if (pendente) return
    const typeId = e.dataTransfer.getData('deviceType')
    if (typeId) handleQuickAdd(typeId)
  }

  // spawn na posição escolhida com o fantasma (com rotação em graus)
  const handleSpawnEm = async (typeId: string, pos: [number, number, number], rotY: number) => {
    try {
      const r = await fetch('/api/devices/spawn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_id: typeId,
          position: pos,
          rotation: [THREE.MathUtils.radToDeg(rotY), 0, 0],
          port_anchors: bornesDe(typeId),
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      push({ severity: 'success', title: `${d.name} posicionado`, source: 'spawn' })
      addLog('success', 'spawn', `${d.name} em (${pos.map(n => n.toFixed(1)).join(', ')}) rotação ${Math.round(THREE.MathUtils.radToDeg(rotY))}°`)
      setPendente(null)
    } catch {
      push({ severity: 'error', title: 'Falha ao posicionar', source: 'spawn' })
      setPendente(null)
    }
  }

  // mover dispositivo existente (arraste pela alça)
  const handleMover = async (id: string, pos: [number, number, number], rotY: number) => {
    try {
      await fetch(`/api/devices/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transform: { position: pos, rotation: [THREE.MathUtils.radToDeg(rotY), 0, 0] } }),
      })
    } catch { /* silencioso durante o arraste */ }
  }

  const toggleSim = () => {
    if (simRunning) {
      sim.stopSimulation(); setSimRunning(false)
      push({ severity: 'info', title: 'Simulação parada', source: 'sim' }); addLog('info', 'sim', 'Simulação parada')
    } else {
      sim.startSimulation(); setSimRunning(true)
      push({ severity: 'success', title: 'Simulação iniciada', source: 'sim', detail: 'passo fixo 60 Hz' })
      addLog('success', 'sim', 'Simulação iniciada (passo fixo 60 Hz)')
    }
  }

  // ---------- fiação ----------
  const handleConectar = async (alvoQualified: string) => {
    const origem = fiaçãoDe
    if (!origem) return
    try {
      const r = await fetch('/api/world/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_port: origem, to_port: alvoQualified }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`)
      push({ severity: 'success', title: 'Fio criado', source: 'wire', detail: `${data.connection.domain}` })
      addLog('success', 'wire', `Conexão ${data.connection.id} criada (${data.connection.domain})`)
      setFiaçãoDe(null)
    } catch (e: any) {
      push({ severity: 'error', title: 'Não conectou', source: 'wire', detail: String(e?.message || e) })
      addLog('error', 'wire', `Falha ao conectar: ${String(e?.message || e)}`)
    }
  }

  // arrastar um borne do modelo → inicia a fiação por aquela porta
  const handlePortDownModelo = (deviceId: string, portId: string) => {
    const q = (objects[deviceId]?.ports?.[portId] as any)?.qualified_id || `${deviceId}_${portId}`
    setFiaçãoDe(q)
  }

  // commit da rota de um fio (arrastar e puxar)
  const handleRotaFio = async (connectionId: string, path: [number, number, number][]) => {
    try {
      await fetch(`/api/world/connections/${connectionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      addLog('info', 'wire', `Rota do fio ${connectionId} atualizada (${path.length} pontos)`)
    } catch {
      push({ severity: 'error', title: 'Falha ao salvar rota', source: 'wire' })
    }
  }

  const handleRemover = async (id: string) => {
    try {
      await fetch(`/api/devices/${id}`, { method: 'DELETE' })
      selectObject(null)
      addLog('warn', 'spawn', `Dispositivo ${id} removido`)
    } catch {
      push({ severity: 'error', title: 'Falha ao remover', source: 'spawn' })
    }
  }

  const handleProp = async (id: string, chave: string, valor: any) => {
    try {
      const r = await fetch(`/api/devices/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { [chave]: valor } }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      addLog('info', 'prop', `${id}.${chave} = ${JSON.stringify(valor)}`)
    } catch {
      push({ severity: 'error', title: 'Falha ao salvar', source: 'prop' })
    }
  }

  // ---------- atalhos ----------
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      if (e.key === 'Escape') setFiaçãoDe(null)
      if (e.key === 'Home') { e.preventDefault(); window.dispatchEvent(new Event('labhub:enquadrar')) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const removerLogs = () => setLogs([])
  const resetar = async () => {
    await fetch('/api/world/reset', { method: 'POST' })
    addLog('warn', 'world', 'Bancada resetada')
  }

  const commands = React.useMemo(() => [
    { id: 'sim_toggle', group: 'Simulação', label: simRunning ? 'Parar simulação' : 'Iniciar simulação', hint: '60Hz', icon: simRunning ? Pause : Play, run: toggleSim },
    { id: 'enquadrar', group: 'Visualização', label: 'Enquadrar tudo', hint: 'Home', icon: Crosshair, run: () => window.dispatchEvent(new Event('labhub:enquadrar')) },
    { id: 'xray_max', group: 'Visualização', label: 'Raio-X: mostrar tudo', icon: Layers, run: () => setXray(1) },
    { id: 'console', group: 'Visualização', label: consoleAberto ? 'Fechar console' : 'Abrir console', icon: Terminal, run: () => setConsoleAberto(v => !v) },
    { id: 'clear_log', group: 'Diagnóstico', label: 'Limpar log', icon: Terminal, run: removerLogs },
    { id: 'reset', group: 'Diagnóstico', label: 'Resetar bancada', icon: Trash2, run: resetar },
    { id: 'proto', group: 'Diagnóstico', label: 'Ver protocolos ativos', icon: Radio, run: () => addLog('info', 'proto', 'endpoint /api/protocols') },
    ...['clp_generic', 'motor_dc', 'vfd_generic', 'sensor_photoelectric', 'conveyor_belt',
        'trans_gears', 'trans_belt', 'trans_screw', 'vision_tape', 'vision_marker', 'camera_ip',
        'pump_centrifugal', 'flow_vortex', 'valve_control', 'tank', 'duct']
      .map(t => ({ id: `add_${t}`, group: 'Adicionar rápido', label: `Adicionar ${t.replace(/_/g, ' ')}`, icon: Zap, run: () => handleQuickAdd(t) })),
  ], [simRunning, consoleAberto, handleQuickAdd, addLog])

  return (
    <div className="sh-shell fz-sans">
      {/* ---------- TOPBAR ---------- */}
      <header className="sh-top fz-mono" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px',
        background: 'var(--panel)', borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 14, background: 'var(--acc)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, color: '#0E1218' }}>F</span>
          <span style={{ fontSize: 11, letterSpacing: '.04em', color: 'var(--tx)' }}>LABHUB</span>
        </div>
        <span style={{ width: 1, height: 16, background: 'var(--line-str)' }} />
        <span className="fz-label" style={{ color: 'var(--tx-dim)' }}>projeto · bancada 01</span>

        <div style={{ flex: 1 }} />

        <button className="sh-btn"
          onClick={() => window.dispatchEvent(new Event('labhub:enquadrar'))}
          title="Enquadrar tudo (Home)">
          <Crosshair size={10} /> enquadrar
        </button>
        <button className="sh-btn" onClick={() => setPaletteOpen(true)} title="Comandos (Ctrl+K)">
          <Search size={10} /> comandos
        </button>
        <button className="sh-btn" onClick={() => setConsoleAberto(v => !v)} title="Console">
          <Terminal size={10} />
        </button>
        <button className={`sh-btn play${simRunning ? ' on' : ''}`} onClick={toggleSim}
          title={simRunning ? 'Parar simulação' : 'Iniciar simulação'}>
          {simRunning ? <Pause size={10} /> : <Play size={10} />} {simRunning ? 'parar' : 'simular'}
        </button>
        <span className="fz-mono" style={{ fontSize: 9, color: simRunning ? 'var(--ok)' : 'var(--tx-dim)' }}>
          {simRunning ? '● rodando' : '○ parado'}
        </span>
      </header>

      {/* ---------- ÁRVORE DE PROJETO ---------- */}
      <aside className="sh-tree">
        <ProjectTree
          onSpawn={handleQuickAdd}
          onDragStart={(typeId) => { setDragOver(true); setPendente(typeId) }}
        />
      </aside>

      {/* ---------- ÁREA DE TRABALHO 3D ---------- */}
      <main className="sh-bench"
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}>

        <Canvas className="w-full h-full" camera={{ position: [8, 7, 8], fov: 45 }}>
          <PerspectiveCamera makeDefault position={[8, 7, 8]} fov={45} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[8, 12, 6]} intensity={0.85} />
          <hemisphereLight args={['#1A2130', '#0B0E13', 0.45]} />

          {/* CHÃO DA CELA — sempre visível, mesmo vazio.
              Plano escuro (dá "piso") + grade legível + eixos na origem. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color="#121821" roughness={0.94} metalness={0.05} />
          </mesh>
          <Grid
            args={[60, 60]}
            cellSize={0.5}
            cellColor="#26303E"
            cellThickness={0.6}
            sectionSize={2.5}
            sectionColor="#39475A"
            sectionThickness={0.9}
            fadeDistance={55}
            fadeStrength={1.2}
          />
          {/* eixos de referência na origem (CAD: X vermelho, Z verde) */}
          <group position={[0, 0.004, 0]}>
            <mesh position={[1.25, 0, 0]}><boxGeometry args={[2.5, 0.002, 0.02]} /><meshBasicMaterial color="#C0392B" /></mesh>
            <mesh position={[0, 0, 1.25]}><boxGeometry args={[0.02, 0.002, 2.5]} /><meshBasicMaterial color="#27AE60" /></mesh>
            <mesh><cylinderGeometry args={[0.05, 0.05, 0.002, 20]} /><meshBasicMaterial color="#4A5563" /></mesh>
          </group>
          <BenchScene
            objects={objects}
            connections={connections}
            slots={slots}
            conduits={conduits}
            drivetrains={drivetrains}
            selectedId={selectedId}
            fiaçãoDe={fiaçãoDe}
            onSelect={(id) => selectObject(id)}
            onIniciarFiação={(q) => setFiaçãoDe(q)}
            onConectar={handleConectar}
            onCancelarFiação={() => setFiaçãoDe(null)}
            onRotaFio={handleRotaFio}
            onPortDownModelo={handlePortDownModelo}
          />
          {/* posicionamento: fantasma ao arrastar da árvore + mover selecionado */}
          <Placement
            pendente={pendente}
            selecionado={selectedObj}
            slotsLivres={slots.filter(s => !s.occupied).map(s => ({ id: s.id, position: s.position }))}
            onSpawn={handleSpawnEm}
            onMover={handleMover}
            onRot={() => {}}
          />
          <FrameController objects={objects} />
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Canvas>

        {/* HUD: modo de interação ( Factory I/O: mínimo, informativo ) */}
        <div className="sh-hud sh-hud-tl fz-mono">
          <Crosshair size={9} />
          {pendente
            ? <span style={{ color: 'var(--acc)' }}>posicionando <b>{pendente}</b> · R gira · solte p/ criar</span>
            : fiaçãoDe
              ? <span style={{ color: 'var(--warn)' }}>fiação: escolha o destino · Esc cancela</span>
              : <span className="sh-hint">arraste p/ orbitar · arraste da árvore p/ posicionar · alça move (Shift=gira, Ctrl=eleva) · <b style={{color:'var(--tx-mut)'}}>borne: arraste p/ ligar fio</b> · Home enquadra</span>}
        </div>

        {/* HUD: raio-X */}
        <div className="sh-hud sh-hud-tr" style={{ flexDirection: 'column', gap: 4, padding: '5px 6px' }}>
          <span className="fz-label">Raio-X</span>
          <input type="range" min="0" max="1" step="0.05" value={xray}
            onChange={e => setXray(parseFloat(e.target.value))}
            style={{ width: 60, accentColor: 'var(--acc)' }} />
          <span className="fz-mono" style={{ fontSize: 9, color: 'var(--acc)' }}>{(xray * 100).toFixed(0)}%</span>
        </div>

        {/* preview ao vivo da câmera (canto) */}
        {cameraNode && (
          <div style={{ position: 'absolute', top: 8, right: 90, zIndex: 20 }}>
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

        {/* overlay de soltar */}
        {dragOver && (
          <div style={{
            position: 'absolute', inset: 8, display: 'grid', placeItems: 'center',
            border: '1px dashed var(--acc)', background: 'rgba(0,180,216,.06)', pointerEvents: 'none',
          }}>
            <span className="fz-mono" style={{ fontSize: 10, color: 'var(--acc)' }}>solte para adicionar</span>
          </div>
        )}

        {/* notificações: canto superior esquerdo, abaixo do HUD (não colide
            com o console que encosta no rodapé da bancada) */}
        <div style={{ position: 'absolute', top: 32, left: 8, right: 8, zIndex: 15 }}>
          <NoticeStack notices={notices} onDismiss={dismiss} />
        </div>
      </main>

      {/* ---------- INSPETOR ---------- */}
      <aside className="sh-insp">
        <Inspector
          device={selectedObj}
          objects={objects}
          connections={connections}
          drivetrains={drivetrains}
          onConectarDe={(q) => setFiaçãoDe(q)}
          onFechar={() => selectObject(null)}
          onRemover={handleRemover}
          onDefinirPropriedade={handleProp}
        />
      </aside>

      {/* ---------- CONSOLE (rodapé da área de trabalho) ---------- */}
      {consoleAberto && (
        <div style={{ gridArea: 'bench', alignSelf: 'end', maxHeight: '38%', zIndex: 12 }}>
          <DiagnosisConsole logs={logs} onClear={() => setLogs([])} />
        </div>
      )}

      {/* ---------- BARRA DE STATUS ---------- */}
      <footer className="sh-status-bar fz-mono">
        <span className={`sh-led ${simRunning ? 'on' : 'off'}`} />
        <span><b>{Object.keys(objects).length}</b> nós</span>
        <span><b>{connections.length}</b> conexões</span>
        <span><b>{drivetrains.length}</b> trens de força</span>
        <span style={{ width: 1, height: 11, background: 'var(--line-str)' }} />
        <span>passo fixo <b>60 Hz</b></span>
        <span style={{ flex: 1 }} />
        <span>arraste p/ orbitar · clique duplo na árvore adiciona</span>
        <span style={{ color: 'var(--ok)' }}>● online</span>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  )
}

export default App
