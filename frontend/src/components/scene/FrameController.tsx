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
  /** id do dispositivo selecionado (para "enquadrar no item") */
  selecionado?: string | null
}

export const FrameController: React.FC<FrameProps> = ({ objects, selecionado }) => {
  const camera = useThree(s => s.camera)
  const ctl = useThree(s => s.controls)
  const gl = useThree(s => s.gl)
  // OrbitControls (acessível via cast) — tem target e update
  const controls = ctl as any as { target: THREE.Vector3; update?: () => void } | null

  useEffect(() => {
    const enquadrar = (ev?: Event) => {
      const alvo = (ev as CustomEvent)?.detail?.alvo ?? 'tudo'

      // ---- quais itens entram no enquadramento ----
      let pts: SceneObject[] = []
      if (alvo === 'selecionado') {
        const um = selecionado ? objects[selecionado] : null
        if (!um) return
        pts = [um]
      } else {
        pts = Object.values(objects)
      }
      if (pts.length === 0) return

      // caixa dos limites (centro + raio) — para um item só, caixa mínima
      const box = new THREE.Box3()
      for (const o of pts) {
        const s = o.scale || [0.6, 0.6, 0.6]
        const m = Math.max(s[0], s[1], s[2]) * 0.75
        box.expandByPoint(new THREE.Vector3(o.position[0] - m, o.position[1] - m, o.position[2] - m))
        box.expandByPoint(new THREE.Vector3(o.position[0] + m, o.position[1] + m, o.position[2] + m))
      }
      const centro = box.getCenter(new THREE.Vector3())
      const tamanho = box.getSize(new THREE.Vector3())
      const raio = Math.max(alvo === 'selecionado' ? 0.35 : 0.5, tamanho.length() / 2)

      // direção atual preservada (não "reseta" o ângulo do usuário)
      const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3())
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.8, 1)
      dir.normalize()

      // base ortonormal da câmera nessa direção (dir, right, up)
      const fwd = dir.clone()
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
      const up = new THREE.Vector3().crossVectors(right, fwd).normalize()

      // distância EXATA para caber a caixa: para cada canto, a distância
      // necessária para que ele caiba no FOV vertical e horizontal.
      // (usar o raio da esfera superestimava muito e deixava "afastado")
      const fovV = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov)
      const aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)
      const tanV = Math.tan(fovV / 2)
      const tanH = tanV * aspect

      let dist = 0.1
      for (const corner of [
        new THREE.Vector3(tamanho.x / 2, tamanho.y / 2, tamanho.z / 2),
        new THREE.Vector3(-tamanho.x / 2, tamanho.y / 2, -tamanho.z / 2),
        new THREE.Vector3(tamanho.x / 2, -tamanho.y / 2, -tamanho.z / 2),
        new THREE.Vector3(-tamanho.x / 2, -tamanho.y / 2, tamanho.z / 2),
      ]) {
        // componentes do canto na base da câmera
        const vz = corner.dot(fwd)          // profundidade
        const vx = Math.abs(corner.dot(right))
        const vy = Math.abs(corner.dot(up))
        if (vz <= 0) { dist = Math.max(dist, raio * 2); continue }
        // d tal que vx/(d+vz) <= tanH  e  vy/(d+vz) <= tanV
        const dNecessaria = Math.max(vx / tanH, vy / tanV) - vz
        dist = Math.max(dist, dNecessaria)
      }
      dist = Math.max(dist, raio) * 1.12   // folga de 12%

      if (controls) controls.target.copy(centro)
      camera.position.copy(centro).add(dir.multiplyScalar(dist))
      camera.lookAt(centro)
      camera.updateProjectionMatrix()
      // duas atualizações: anula o amortecimento do OrbitControls, que
      // senão deixaria a câmera parada no meio do caminho (não centralizava)
      if (controls) { (controls as any).update?.(); (controls as any).update?.() }
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
