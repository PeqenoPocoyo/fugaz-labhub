// FrameController — "enquadrar tudo" / "enquadrar no item".
//
// Ajusta a câmera para a seleção caber no quadro, preservando a direção
// atual do usuário (não "reseta" o ângulo que ele escolheu).
//
// Dispara via window 'labhub:enquadrar' { alvo: 'tudo' | 'selecionado' }.
//
// O QUE ESTAVA ERRADO (por que o enquadramento "ficava zoado"):
//  1. A distância era calculada canto a canto, e quando um canto caía atrás
//     do centro da caixa (vz <= 0 — comum em cenas achatadas como bancadas)
//     a rotina desistia e usava dist = raio * 2, ou seja, o DOBRO da
//     distância necessária. Resultado: zoom excessivo para fora, peças
//     minúsculas no meio de um mar de grid vazio.
//     Agora usa a esfera de limites: dist = raio / sin(meioFOV), que é
//     sempre suficiente e nunca exagerada.
//  2. O tamanho do objeto vinha de obj.scale (valor genérico 0.6), então
//     enquadrar uma esteira de 3 m calculava uma caixa de 1,2 m e a câmera
//     entrava DENTRO da peça. Agora há uma tabela de dimensões reais por
//     tipo (a mesma que alimenta as malhas especializadas).
//  3. O salto era instantâneo e brigava com o amortecimento do
//     OrbitControls (a câmera parava no meio do caminho). Agora é uma
//     animação de ~450 ms com ease-out, aplicada por quadro, e o alvo do
//     controle é reposicionado junto — sem briga.
import React, { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneObject } from '../../store/sceneStore'

interface FrameProps {
  objects: Record<string, SceneObject>
  /** id do dispositivo selecionado (para "enquadrar no item") */
  selecionado?: string | null
}

const num = (v: any, d: number) => (typeof v === 'number' && isFinite(v) ? v : d)

/**
 * Dimensões aproximadas (largura, altura, profundidade) em METROS do modelo
 * real de cada tipo. Alimenta o enquadramento e o contorno de seleção, então
 * precisa acompanhar o que SceneElements/recipes desenham.
 */
function tamanhoReal(o: SceneObject): [number, number, number] {
  const p = o.properties || {}
  const t = o.type_id || ''

  // esteiras escaláveis: células × módulo
  if (t === 'conveyor_belt' || t === 'conveyor_roller') {
    const mod = num(p.module_mm, t === 'conveyor_roller' ? 250 : 250) / 1000
    const cx = Math.max(1, Math.round(num(p.cells_x, 5)))
    const cy = Math.max(1, Math.round(num(p.cells_y, 1)))
    const compr = cx * mod
    const larg = cy * mod
    return t === 'conveyor_roller'
      ? [compr, 0.55, larg + 0.25]
      : [compr + 0.2, 0.55, larg + 0.2]
  }

  // transmissões: vão da montagem (eixo ao longo de X no mundo)
  if (t.startsWith('trans_')) {
    if (t === 'trans_screw' || t === 'trans_linear_actuator') {
      const curso = Math.max(0.08, Math.min(0.5, num(p.stroke_mm, 300) / 1000))
      return [0.22, curso + 0.28, 0.22]
    }
    if (t === 'trans_gears') {
      const z1 = Math.max(6, Math.round(num(p.teeth_in, 18)))
      const z2 = Math.max(6, Math.round(num(p.teeth_out, 54)))
      const m = Math.min(0.0032, 0.20 / (z1 + z2))
      const r1 = (m * z1) / 2, r2 = (m * z2) / 2
      return [r1 + r2 + Math.max(r1, r2) + 0.12, Math.max(r1, r2) + 0.18, 0.4]
    }
    if (t === 'trans_belt' || t === 'trans_chain') {
      const d1 = num(p.pulley_d_in_mm ?? p.sprocket_d_in_mm, 80) / 1000
      const d2 = num(p.pulley_d_out_mm ?? p.sprocket_d_out_mm, 240) / 1000
      const r1 = d1 / 2, r2 = d2 / 2
      const meio = (r1 + r2) * 0.95
      return [meio * 2 + Math.max(r1, r2) + 0.12, Math.max(r1, r2) + 0.16, 0.36]
    }
    if (t === 'trans_coupling') return [0.34, 0.26, 0.26]
  }

  // demais tipos: receita declarativa, escala aproximada pela categoria
  const s = o.scale || [0.6, 0.6, 0.6]
  const cat = o.category || ''
  if (cat === 'structure') return [Math.max(1.2, s[0]), 0.3, Math.max(1.2, s[2])]
  return [Math.max(0.5, s[0] * 1.2), 0.7, Math.max(0.5, s[2] * 1.2)]
}

export const FrameController: React.FC<FrameProps> = ({ objects, selecionado }) => {
  const camera = useThree(s => s.camera)
  const ctl = useThree(s => s.controls)
  const gl = useThree(s => s.gl)
  const controls = ctl as any as { target: THREE.Vector3; update?: () => void } | null

  // animação em andamento (origem -> destino), aplicada por quadro
  const anim = useRef<{
    t0: number; dur: number
    deOnde: THREE.Vector3; paraOnde: THREE.Vector3
    alvoDe: THREE.Vector3; alvoPara: THREE.Vector3
  } | null>(null)

  useFrame(() => {
    const a = anim.current
    if (!a) return
    const k = Math.min(1, (performance.now() - a.t0) / a.dur)
    // ease-out cúbico: sai rápido, chega suave (não "derrapa")
    const e = 1 - Math.pow(1 - k, 3)
    camera.position.lerpVectors(a.deOnde, a.paraOnde, e)
    if (controls) controls.target.lerpVectors(a.alvoDe, a.alvoPara, e)
    if (k >= 1) {
      anim.current = null
      if (controls) { controls.update?.(); controls.update?.() }
    } else if (controls) {
      controls.update?.()
    }
  })

  useEffect(() => {
    const enquadrar = (ev?: Event) => {
      const alvo = (ev as CustomEvent)?.detail?.alvo ?? 'tudo'

      let pts: SceneObject[] = []
      if (alvo === 'selecionado') {
        const um = selecionado ? objects[selecionado] : null
        if (!um) return
        pts = [um]
      } else {
        pts = Object.values(objects)
      }
      if (pts.length === 0) return

      // ---- caixa de limites usando as dimensões REAIS de cada peça ----
      const box = new THREE.Box3()
      for (const o of pts) {
        const [w, h, d] = tamanhoReal(o)
        // altura da peça: do centro (y da peça) para cima/baixo
        const y = o.position[1]
        box.expandByPoint(new THREE.Vector3(o.position[0] - w / 2, y - h / 2, o.position[2] - d / 2))
        box.expandByPoint(new THREE.Vector3(o.position[0] + w / 2, y + h / 2, o.position[2] + d / 2))
      }
      const centro = box.getCenter(new THREE.Vector3())
      const tamanho = box.getSize(new THREE.Vector3())
      // raio da esfera que contém a caixa (nunca corta nenhum canto)
      let raio = tamanho.length() / 2
      if (raio < 1e-3) raio = 0.4
      if (alvo === 'selecionado') raio = Math.max(raio, 0.45)

      // ---- distância pela ESFERA (correta e sem exagero) ----
      const fovV = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov || 45)
      const aspect = Math.max(0.4, gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight))
      const tanH = Math.tan(fovV / 2) * aspect
      // meio-FOV vertical e horizontal — o menor dos dois é o limitante
      const meioV = Math.atan(Math.tan(fovV / 2))
      const meioH = Math.atan(tanH)
      const meio = Math.min(meioV, meioH)
      let dist = raio / Math.sin(Math.max(0.08, meio))
      dist *= 1.10            // folga de 10%
      dist = Math.min(dist, 34)   // nunca mais longe que o limite do controle
      dist = Math.max(dist, 1.1)  // nunca dentro da peça

      // direção atual preservada (o usuário não perde o ângulo que escolheu)
      const alvoAtual = controls?.target ?? new THREE.Vector3()
      const dir = camera.position.clone().sub(alvoAtual)
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.75, 1)
      dir.normalize()
      // não deixa a câmera entrar por baixo do piso ao reenquadrar
      if (dir.y < 0.06) dir.y = 0.06
      dir.normalize()

      const paraOnde = centro.clone().add(dir.multiplyScalar(dist))

      anim.current = {
        t0: performance.now(),
        dur: alvo === 'selecionado' ? 380 : 450,
        deOnde: camera.position.clone(),
        paraOnde,
        alvoDe: (controls?.target ?? new THREE.Vector3()).clone(),
        alvoPara: centro.clone(),
      }
    }

    ;(window as any).__enquadrar = enquadrar
    const onEvt = () => enquadrar()
    window.addEventListener('labhub:enquadrar', onEvt)
    return () => {
      window.removeEventListener('labhub:enquadrar', onEvt)
      delete (window as any).__enquadrar
    }
  }, [objects, camera, controls, gl, selecionado])

  return null
}

export default FrameController
