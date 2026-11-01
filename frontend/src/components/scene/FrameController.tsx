// FrameController — "enquadrar tudo": ajusta a câmera para caber a cena
// inteira no quadro, com zoom e posicionamento calculados.
//
// Dispara via evento window 'labhub:enquadrar' (botão da topbar / comando).
// Também expõe window.__enquadrar para chamada direta.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObject } from '../../store/sceneStore'

interface FrameProps {
  objects: Record<string, SceneObject>
}

export const FrameController: React.FC<FrameProps> = ({ objects }) => {
  const camera = useThree(s => s.camera)
  const ctl = useThree(s => s.controls)
  const gl = useThree(s => s.gl)
  // OrbitControls (acessível via cast) — tem target e update
  const controls = ctl as any as { target: THREE.Vector3; update?: () => void } | null

  useEffect(() => {
    const enquadrar = () => {
      const pts = Object.values(objects)
      if (pts.length === 0) return

      // caixa dos limites da cena (centro + raio)
      const box = new THREE.Box3()
      for (const o of pts) {
        const s = o.scale || [0.6, 0.6, 0.6]
        const m = Math.max(s[0], s[1], s[2])
        box.expandByPoint(new THREE.Vector3(o.position[0] - m, o.position[1] - m, o.position[2] - m))
        box.expandByPoint(new THREE.Vector3(o.position[0] + m, o.position[1] + m, o.position[2] + m))
      }
      const centro = box.getCenter(new THREE.Vector3())
      const raio = Math.max(0.8, box.getSize(new THREE.Vector3()).length() / 2)

      // distância para caber no FOV (com folga de 15%)
      const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov)
      const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)
      const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspect)
      const dist = (raio * 1.15) / Math.sin(Math.min(fov, fovH) / 2)

      // direção atual preservada (não "reseta" o ângulo do usuário)
      const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3())
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.8, 1)
      dir.normalize()

      if (controls) controls.target.copy(centro)
      camera.position.copy(centro).add(dir.multiplyScalar(dist))
      camera.updateProjectionMatrix()
      if (controls) (controls as any).update?.()
    }

    ;(window as any).__enquadrar = enquadrar
    const onEvt = () => enquadrar()
    window.addEventListener('labhub:enquadrar', onEvt)
    return () => {
      window.removeEventListener('labhub:enquadrar', onEvt)
      delete (window as any).__enquadrar
    }
  }, [objects, camera, controls, gl])

  return null
}

export default FrameController
