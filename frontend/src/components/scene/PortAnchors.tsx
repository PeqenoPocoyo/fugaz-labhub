// PortAnchors — as portas ficam VISÍVEIS na peça e são arrastáveis.
//
// Cada porta tem âncora 3D (vinda do backend). Renderizamos um conector
// pequeno nela. Clicar num conector entra no modo fiação: as portas
// compatíveis acendem com nome flutuante (pré-acoplamento magnético) e
// clicar nela cria a conexão de verdade.
import React, { useMemo, useState } from 'react'
import { Html } from '@react-three/drei'
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
  objects, fiaçãoDe, onIniciarFiação, onConectar, onCancelar,
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

  // Esc cancela
  React.useEffect(() => {
    if (!modoFiação) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modoFiação, onCancelar])

  return (
    <group>
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
            {/* conector (pequeno cilindro na direção do eixo) */}
            <mesh
              onClick={(e) => {
                e.stopPropagation()
                if (ehAlvo) onConectar(p.qualifiedId)
                else if (!ehOrigem) onIniciarFiação(p.qualifiedId)
              }}
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

            {/* anel de pré-acoplamento nos alvos compatíveis */}
            {ehAlvo && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.05, 0.006, 6, 20]} />
                <meshBasicMaterial color="#66BB6A" transparent opacity={0.9} />
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
                      solte o botão / clique no destino · Esc cancela
                    </span>
                  )}
                  {ehAlvo && (
                    <span className="text-[7px] font-mono text-[#66BB6A]/80 whitespace-nowrap">
                      conectar
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
