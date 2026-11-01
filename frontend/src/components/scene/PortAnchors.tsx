// PortAnchors — as portas ficam VISÍVEIS na peça e são arrastáveis.
//
// Dois gestos de fiação:
//  1. ARRASTAR (principal): aperta num borne e puxa até o destino. Enquanto
//     arrasta, um fio provisório segue o cursor e os bornes COMPATÍVEIS
//     mais próximos ganham ímã (anel + nome) — solta em cima = conecta.
//  2. CLICAR (fallback): clique num borne entra no modo fiação e as
//     opções acendem; clique no destino conecta.
import React, { useEffect, useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObject } from '../../store/sceneStore'

export interface PortaVisivel {
  qualifiedId: string
  portId: string
  deviceId: string
  nome: string
  direcao: 'input' | 'output' | 'bidirectional'
  dominio: string
  ancora: [number, number, number]
  conectada: boolean
  valor: any
}

interface PortAnchorsProps {
  objects: Record<string, SceneObject>
  /** porta de origem quando em modo fiação (qualifiedId) */
  fiaçãoDe: string | null
  onIniciarFiação: (qualifiedId: string) => void
  onConectar: (alvoqualifiedId: string) => void
  onCancelar: () => void
  /**
   * quando true, o conector físico já é desenhado pela receita do modelo
   * (bornes na carcaça) — aqui só entram o anel de pré-acoplamento e o nome.
   */
  bornesNoModelo?: boolean
}

/** Uma porta aceita outra se as direções forem opostas e o domínio compatível */
function compativel(a: PortaVisivel, b: PortaVisivel): boolean {
  if (a.deviceId === b.deviceId) return false
  const dirOK =
    (a.direcao === 'output' && b.direcao === 'input') ||
    (a.direcao === 'input' && b.direcao === 'output') ||
    a.direcao === 'bidirectional' || b.direcao === 'bidirectional'
  const domOK = a.dominio === b.dominio || a.dominio === 'signal' || b.dominio === 'signal'
  return dirOK && domOK
}

export const PortAnchors: React.FC<PortAnchorsProps> = ({
  objects, fiaçãoDe, onIniciarFiação, onConectar, onCancelar, bornesNoModelo = false,
}) => {
  const [hover, setHover] = useState<string | null>(null)

  // achata todas as portas de todos os dispositivos
  const portas: PortaVisivel[] = useMemo(() => {
    const out: PortaVisivel[] = []
    for (const [id, obj] of Object.entries(objects)) {
      const ports = (obj as any).ports as Record<string, any> | undefined
      const anchors = (obj as any).port_anchors as Record<string, number[]> | undefined
      if (!ports) continue
      for (const [pid, p] of Object.entries(ports)) {
        const a = anchors?.[pid] ?? [0, 0, 0]
        out.push({
          qualifiedId: p.qualified_id || `${id}_${pid}`,
          portId: pid,
          deviceId: id,
          nome: p.name || pid,
          direcao: p.direction || 'bidirectional',
          dominio: p.domain || 'signal',
          ancora: [obj.position[0] + a[0], obj.position[1] + a[1], obj.position[2] + a[2]],
          conectada: !!p.connected_to,
          valor: p.value ?? null,
        })
      }
    }
    return out
  }, [objects])

  const origem = portas.find(p => p.qualifiedId === fiaçãoDe) || null
  const modoFiação = !!origem

  // ---------- arraste magnético de fio ----------
  const camera = useThree(s => s.camera)
  const gl = useThree(s => s.gl)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [pontoLivre, setPontoLivre] = useState<[number, number, number] | null>(null)
  const [ima, setIma] = useState<string | null>(null)
  const RAIO_IMA = 0.45   // alcance do ímã (metros)

  /** posição mundial do ponteiro: 1ª tenta os bornes; senão, plano no altura da origem */
  const ponteiroMundo = (clientX: number, clientY: number, altOrigem: number): [number, number, number] | null => {
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    const rc = new THREE.Raycaster()
    rc.setFromCamera(ndc, camera)
    // 1) ímã: se o raio acerta um borne próximo,usa ele
    for (const p of portas) {
      const d = rc.ray.distanceSqToPoint(new THREE.Vector3(...p.ancora))
      if (d < RAIO_IMA * RAIO_IMA * 0.35) return p.ancora
    }
    // 2) plano horizontal na altura do borne de origem
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -altOrigem)
    const alvo = new THREE.Vector3()
    if (rc.ray.intersectPlane(plano, alvo)) return [alvo.x, alvo.y, alvo.z]
    return null
  }

  useEffect(() => {
    if (!arrastando) return
    const src = portas.find(p => p.qualifiedId === arrastando)
    if (!src) return
    const alt = src.ancora[1]
    let moveu = 0

    const onMove = (e: PointerEvent) => {
      moveu++
      const p = ponteiroMundo(e.clientX, e.clientY, alt)
      if (!p) return
      setPontoLivre(p)
      // ímã: borne compatível mais próximo dentro do alcance
      const perto = portas
        .filter(q => compativel(src, q))
        .map(q => ({ q, d: Math.hypot(q.ancora[0] - p[0], q.ancora[1] - p[1], q.ancora[2] - p[2]) }))
        .filter(x => x.d < RAIO_IMA)
        .sort((a, b) => a.d - b.d)[0]
      setIma(perto ? perto.q.qualifiedId : null)
    }

    const onUp = () => {
      if (ima) onConectar(ima)
      setArrastando(null); setIma(null); setPontoLivre(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setArrastando(null); setIma(null); setPontoLivre(null) }
    }

    document.body.style.cursor = 'crosshair'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
    }
  }, [arrastando, ima, portas, onConectar])

  const srcDrag = arrastando ? portas.find(p => p.qualifiedId === arrastando) : null
  const destinoDrag = ima ? portas.find(p => p.qualifiedId === ima) : null
  const pontaFio = destinoDrag ? destinoDrag.ancora : pontoLivre

  // Esc cancela o modo clique
  React.useEffect(() => {
    if (!modoFiação) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modoFiação, onCancelar])

  return (
    <group>
      {/* fio provisório enquanto arrasta (some no solto) */}
      {srcDrag && pontaFio && (
        <mesh>
          <tubeGeometry args={[
            (() => {
              const a = new THREE.Vector3(...srcDrag.ancora)
              const b = new THREE.Vector3(...pontaFio)
              const meio = a.clone().add(b).multiplyScalar(0.5)
              meio.y -= Math.min(0.35, a.distanceTo(b) * 0.14)
              return new THREE.QuadraticBezierCurve3(a, meio, b)
            })(),
            24, 0.012, 6, false
          ]} />
          <meshBasicMaterial color={destinoDrag ? '#3FB950' : '#00B4D8'} transparent opacity={0.85} />
        </mesh>
      )}

      {portas.map(p => {
        const ehOrigem = p.qualifiedId === fiaçãoDe
        const ehAlvo = modoFiação && !ehOrigem && origem ? compativel(origem, p) : false
        const cor = ehOrigem ? '#FFCA28'
          : ehAlvo ? '#66BB6A'
          : p.conectada ? '#4A5563'
          : p.dominio === 'electrical' ? '#00D4FF'
          : p.dominio === 'mechanical' ? '#FF7043'
          : p.dominio === 'fluid' ? '#26A69A'
          : '#8A94A6'
        // em modo fiação, portas incompatíveis somem (reduz ruído)
        const opacidade = modoFiação && !ehOrigem && !ehAlvo ? 0.12 : 1

        return (
          <group key={p.qualifiedId} position={p.ancora as [number, number, number]}>
            {/* conector: só quando o modelo NÃO desenha o borne na carcaça */}
            {!bornesNoModelo && (
              <mesh
                onClick={(e) => {
                  e.stopPropagation()
                  if (ehAlvo) onConectar(p.qualifiedId)
                  else if (!ehOrigem) onIniciarFiação(p.qualifiedId)
                }}
                onPointerDown={(e) => { e.stopPropagation(); setArrastando(p.qualifiedId) }}
                onPointerOver={(e) => { e.stopPropagation(); setHover(p.qualifiedId) }}
                onPointerOut={() => setHover(null)}
              >
                <cylinderGeometry args={[0.014, 0.014, 0.03, 8]} />
                <meshStandardMaterial
                  color={cor}
                  emissive={ehAlvo || ehOrigem ? cor : '#000000'}
                  emissiveIntensity={ehAlvo ? 0.8 : 0.2}
                  transparent={opacidade < 1}
                  opacity={opacidade}
                />
              </mesh>
            )}

            {/* anel de pré-acoplamento nos alvos compatíveis */}
            {(ehAlvo || p.qualifiedId === ima) && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.055, 0.008, 6, 20]} />
                <meshBasicMaterial color="#66BB6A" transparent opacity={p.qualifiedId === ima ? 1 : 0.7} />
              </mesh>
            )}

            {/* nome flutuante: sempre no hover, sempre nos alvos */}
            {(hover === p.qualifiedId || ehAlvo || ehOrigem) && opacidade === 1 && (
              <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-[8px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded border"
                    style={{
                      color: cor,
                      borderColor: cor,
                      background: 'rgba(11,14,19,0.88)',
                    }}
                  >
                    {p.nome}
                  </span>
                  {ehOrigem && (
                    <span className="text-[7px] font-mono text-[#FFCA28]/80 whitespace-nowrap">
                      {arrastando ? 'solte no destino · Esc cancela' : 'clique no destino · Esc cancela'}
                    </span>
                  )}
                  {(ehAlvo || p.qualifiedId === ima) && (
                    <span className="text-[7px] font-mono whitespace-nowrap"
                      style={{ color: p.qualifiedId === ima ? '#3FB950' : 'rgba(102,187,74,0.8)' }}>
                      {p.qualifiedId === ima ? 'solte para conectar' : 'conectar'}
                    </span>
                  )}
                </div>
              </Html>
            )}
          </group>
        )
      })}

      {/* linha do pensamento enquanto escolhe o destino */}
      {modoFiação && hover && compativel(origem!, portas.find(p => p.qualifiedId === hover)!) && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...origem!.ancora, ...portas.find(p => p.qualifiedId === hover)!.ancora])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FFCA28" transparent opacity={0.5} />
        </line>
      )}
    </group>
  )
}

export default PortAnchors
