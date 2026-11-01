// WireGrab — pega o fio e puxa para criar a rota.
//
// Sem rota: uma alça no ponto médio do fio. Arrastar cria o primeiro
// waypoint e o fio passa a segui-lo. Com rota: uma alça em cada waypoint
// (arrastar move, duplo clique remove) + alça no meio de cada trecho
// para acrescentar ponto. Ao soltar, commita o caminho no backend.
import React, { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface WireGrabProps {
  wireId: string
  from: [number, number, number]
  to: [number, number, number]
  waypoints?: [number, number, number][]
  onCommit: (path: [number, number, number][]) => void
}

const ALTURA = 0.35  // altura em que a alça flutua (acima do chão)

export const WireGrab: React.FC<WireGrabProps> = ({ wireId, from, to, waypoints, onCommit }) => {
  const camera = useThree(s => s.camera)
  const gl = useThree(s => s.gl)
  const controls = useThree(s => s.controls)

  const [arrastando, setArrastando] = useState<number | null>(null)
  const [local, setLocal] = useState<[number, number, number][] | null>(null)
  const pathRef = useRef<[number, number, number][]>([])

  const caminho = local ?? (waypoints ?? [])
  pathRef.current = caminho

  // ponto de controle: quando não há rota, oferece o meio
  const meio: [number, number, number] = [
    (from[0] + to[0]) / 2,
    Math.min(from[1], to[1]) + ALTURA,
    (from[2] + to[2]) / 2,
  ]

  // arraste pelo plano do chão
  useEffect(() => {
    if (arrastando === null) return
    if (controls) (controls as any).enabled = false

    const paraChao = (clientX: number, clientY: number): [number, number, number] | null => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      )
      const rc = new THREE.Raycaster()
      rc.setFromCamera(ndc, camera)
      const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const alvo = new THREE.Vector3()
      if (!rc.ray.intersectPlane(plano, alvo)) return null
      return [alvo.x, alvo.y, alvo.z]
    }

    const onMove = (e: PointerEvent) => {
      const p = paraChao(e.clientX, e.clientY)
      if (!p) return
      setLocal(prev => {
        const base = prev ?? (waypoints ?? [])
        if (arrastando < 0) return [p]                 // cria primeiro ponto
        const copia = base.slice()
        copia[arrastando] = p
        return copia
      })
    }
    const onUp = () => {
      setArrastando(null)
      setLocal(prev => {
        if (prev) onCommit(prev)
        return null
      })
      if (controls) (controls as any).enabled = true
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (controls) (controls as any).enabled = true
    }
  }, [arrastando, waypoints, onCommit])

  const Alca: React.FC<{ idx: number; pos: [number, number, number] }> = ({ idx, pos }) => (
    <mesh
      position={pos}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(e) => { e.stopPropagation(); setArrastando(idx) }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        // duplo clique remove o waypoint (volta ao automático)
        if (idx >= 0 && caminho.length) {
          const copia = caminho.slice(); copia.splice(idx, 1)
          onCommit(copia)
        }
      }}
      onPointerOver={() => { document.body.style.cursor = 'grab' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <cylinderGeometry args={[0.022, 0.022, 0.006, 10]} />
      <meshBasicMaterial
        color={arrastando === idx ? '#FFCA28' : '#00B4D8'}
        transparent opacity={arrastando === idx ? 1 : 0.75}
      />
    </mesh>
  )

  return (
    <group>
      {caminho.length === 0
        ? <Alca idx={-1} pos={meio} />
        : caminho.map((p, i) => <Alca key={`${wireId}-wp-${i}`} idx={i} pos={p} />)}
    </group>
  )
}

export default WireGrab
