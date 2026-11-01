// Placement — posicionamento na cela.
//
// 1. FANTASMA: ao arrastar um dispositivo da árvore, um preview
//    translúcido do modelo aparece no chão seguindo o cursor, com seta de
//    direção. R gira (Shift = 90°). Soltar cria o dispositivo naquele ponto.
// 2. MOVER: com um dispositivo selecionado, arrastar a alça horizontal
//    move a peça pela cela (com snap magnético visual dos furos livres).
//
// Tudo resolve contra o plano do chão (y = 0.5, altura de spawn do grid).
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ModeloReceita } from './ModelKit'
import { receitaPara } from './recipes'
import type { SceneObject } from '../../store/sceneStore'

const ALTURA_CENA = 0.5  // altura do plano de referência do grid do backend

interface PlacementProps {
  /** type_id sendo arrastado da árvore (null = nenhum) */
  pendente: string | null
  /** dispositivo selecionado na bancada */
  selecionado: SceneObject | null
  /** slots livres do mundo, para o snap magnético durante o arraste */
  slotsLivres: { id: string; position: [number, number, number] }[]
  onSpawn: (typeId: string, pos: [number, number, number], rotY: number) => void
  onMover: (id: string, pos: [number, number, number], rotY: number) => void
  onRot: (graus: number) => void
}

/** aplica aparência de fantasma a todos os materiais do grupo */
const GhostMaterial: React.FC<{ groupRef: React.RefObject<THREE.Group> }> = ({ groupRef }) => {
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.traverse((o: any) => {
      if (!o.isMesh || !o.material) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        m.transparent = true
        m.opacity = 0.45
        m.depthWrite = false
        m.emissive = new THREE.Color('#00B4D8')
        m.emissiveIntensity = 0.25
      }
    })
  }, [groupRef])
  return null
}

/** seta de direção — mostra "para onde" a peça está apontando */
const SetaDirecao: React.FC<{ rotY: number; cor?: string; escala?: number }> = ({ rotY, cor = '#00B4D8', escala = 1 }) => (
  <group rotation={[0, rotY, 0]} position={[0, 0.012, 0]}>
    <mesh position={[0.42 * escala, 0, 0]}>
      <boxGeometry args={[0.42 * escala, 0.004, 0.02]} />
      <meshBasicMaterial color={cor} transparent opacity={0.85} />
    </mesh>
    <mesh position={[0.62 * escala, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
      <coneGeometry args={[0.03 * escala, 0.09 * escala, 8]} />
      <meshBasicMaterial color={cor} transparent opacity={0.9} />
    </mesh>
  </group>
)

export const Placement: React.FC<PlacementProps> = ({
  pendente, selecionado, slotsLivres, onSpawn, onMover, onRot,
}) => {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls)
  const gl = useThree(s => s.gl)

  const [fantasmaPos, setFantasmaPos] = useState<[number, number, number]>([0, ALTURA_CENA, 0])
  const [fantasmaRot, setFantasmaRot] = useState(0)
  const [snapAtivo, setSnapAtivo] = useState<[number, number, number] | null>(null)

  // rotação do fantasma pelo teclado
  useEffect(() => {
    if (!pendente) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'r') return
      setFantasmaRot(r => {
        const passo = e.shiftKey ? Math.PI / 2 : Math.PI / 12
        const novo = r + passo
        onRot(THREE.MathUtils.radToDeg(novo) % 360)
        return novo
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendente, onRot])

  // reset do fantasma ao começar um novo arraste
  useEffect(() => {
    if (pendente) setFantasmaRot(0)
    setSnapAtivo(null)
  }, [pendente])

  // projeta o ponteiro no plano do chão
  const paraChao = (clientX: number, clientY: number): [number, number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndc, camera)
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ALTURA_CENA)
    const alvo = new THREE.Vector3()
    if (!raycaster.ray.intersectPlane(plano, alvo)) return null
    return [alvo.x, ALTURA_CENA, alvo.z]
  }

  // acompanha o arraste da árvore (eventos nativos de drag&drop do DOM)
  useEffect(() => {
    if (!pendente) return
    const onOver = (e: DragEvent) => {
      const p = paraChao(e.clientX, e.clientY)
      if (p) {
        setFantasmaPos(p)
        // destaca furo livre próximo (pré-snap magnético)
        const perto = slotsLivres.find(s => Math.hypot(s.position[0] - p[0], s.position[2] - p[2]) < 0.45)
        setSnapAtivo(perto ? perto.position : null)
      }
    }
    const onDrop = (e: DragEvent) => {
      const p = paraChao(e.clientX, e.clientY)
      const final = pertoSnap(p) || p
      if (final) onSpawn(pendente, final, fantasmaRot)
      setSnapAtivo(null)
    }
    const pertoSnap = (p: [number, number, number] | null) => {
      if (!p) return null
      const perto = slotsLivres.find(s => Math.hypot(s.position[0] - p[0], s.position[2] - p[2]) < 0.3)
      return perto ? perto.position : null
    }
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [pendente, fantasmaRot, slotsLivres, onSpawn])

  const receita = useMemo(
    () => (pendente ? receitaPara(pendente, {}) : null),
    [pendente]
  )

  // ---------- mover o selecionado arrastando a alça ----------
  const [movendo, setMovendo] = useState(false)
  const grupoRef = useRef<THREE.Group>(null)

  // estado do arraste: altura e rotação atuais do selecionado
  const alturaAtual = selecionado?.position?.[1] ?? ALTURA_CENA
  const [elevando, setElevando] = useState<number | null>(null)
  const [girando, setGirando] = useState<number>(0)
  const ultimoY = useRef(0)

  useEffect(() => {
    if (!movendo) return
    if (controls) (controls as any).enabled = false
    setElevando(alturaAtual)
    setGirando(0)
    ultimoY.current = 0

    const onMove = (e: PointerEvent) => {
      if (!selecionado) return
      const p = paraChao(e.clientX, e.clientY)
      if (!p) return

      if (e.shiftKey) {
        // SHIFT = girar: a peça aponta na direção do cursor
        const ang = Math.atan2(p[0] - selecionado.position[0], p[2] - selecionado.position[2])
        setGirando(ang)
        onMover(selecionado.id, selecionado.position, ang)
        return
      }
      if (e.ctrlKey || e.metaKey) {
        // CTRL = elevar/abaixar: arraste vertical muda a altura
        if (ultimoY.current) {
          const delta = (ultimoY.current - e.clientY) * 0.01
          const nova = Math.max(0, Math.min(4, (elevando ?? alturaAtual) + delta))
          setElevando(nova)
          onMover(selecionado.id, [selecionado.position[0], nova, selecionado.position[2]], girando)
        }
        ultimoY.current = e.clientY
        return
      }
      // padrão: mover no plano do chão
      onMover(selecionado.id, [p[0], elevando ?? alturaAtual, p[2]], girando)
    }
    const onUp = () => {
      setMovendo(false)
      setElevando(null)
      setGirando(0)
      if (controls) (controls as any).enabled = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (controls) (controls as any).enabled = true
    }
  }, [movendo, selecionado, onMover, alturaAtual, elevando, girando])

  // teclado com a peça selecionada: R gira 15°, [ e ] elevam/abaixam
  useEffect(() => {
    if (!selecionado || pendente) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'r') {
        const passo = e.shiftKey ? Math.PI / 2 : Math.PI / 12
        const novo = (girando || 0) + passo
        setGirando(novo)
        onMover(selecionado.id, selecionado.position, novo)
      } else if (k === '[' || k === ']') {
        const passo = e.shiftKey ? 0.5 : 0.1
        const base = elevando ?? selecionado.position[1]
        const nova = Math.max(0, Math.min(4, base + (k === ']' ? passo : -passo)))
        setElevando(nova)
        onMover(selecionado.id, [selecionado.position[0], nova, selecionado.position[2]], girando)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecionado, pendente, onMover, girando, elevando])

  return (
    <group>
      {/* ---------- FANTASMA do que está sendo colocado ---------- */}
      {pendente && receita && (
        <group position={fantasmaPos}>
          <group ref={grupoRef}>
            <ModeloReceita receita={receita} />
          </group>
          <GhostMaterial groupRef={grupoRef} />
          <SetaDirecao rotY={fantasmaRot} />
          {/* anel de posição no chão */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -ALTURA_CENA + 0.006, 0]}>
            <ringGeometry args={[0.30, 0.34, 28]} />
            <meshBasicMaterial color="#00B4D8" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          {/* alvo de snap magnético quando há furo livre perto */}
          {snapAtivo && (
            <group position={[snapAtivo[0] - fantasmaPos[0], -ALTURA_CENA + 0.008, snapAtivo[2] - fantasmaPos[2]]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.10, 0.14, 20]} />
                <meshBasicMaterial color="#66BB6A" transparent opacity={0.9} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* ---------- alça de mover o selecionado ---------- */}
      {selecionado && !pendente && (
        <group position={[selecionado.position[0], elevando ?? selecionado.position[1], selecionado.position[2]]}>
          {/* disco de arraste no chão */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -selecionado.position[1] + 0.02, 0]}
            onPointerDown={(e) => { e.stopPropagation(); setMovendo(true) }}
            onPointerOver={() => { document.body.style.cursor = 'move' }}
            onPointerOut={() => { document.body.style.cursor = '' }}
          >
            <circleGeometry args={[0.55, 24]} />
            <meshBasicMaterial transparent opacity={movendo ? 0.18 : 0.06} color="#00B4D8" depthWrite={false} />
          </mesh>
          {/* anel de seleção */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -selecionado.position[1] + 0.012, 0]}>
            <ringGeometry args={[0.5, 0.55, 32]} />
            <meshBasicMaterial color="#00B4D8" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <SetaDirecao rotY={girando} escala={0.7} />
          {/* marcador de altura (linha até o chão) */}
          <mesh position={[0, -(selecionado.position[1]) / 2, 0]}>
            <cylinderGeometry args={[0.003, 0.003, Math.max(0.01, selecionado.position[1]), 4]} />
            <meshBasicMaterial color="#00B4D8" transparent opacity={0.3} />
          </mesh>
          {movendo && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -selecionado.position[1] + 0.02, 0]}>
              <ringGeometry args={[0.2, 0.5, 24, 1, 0, Math.PI * 1.4]} />
              <meshBasicMaterial color="#FFCA28" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
}

export default Placement
