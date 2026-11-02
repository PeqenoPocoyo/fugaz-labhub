// SceneCamera — navegação no padrão Factory I/O.
//
// Gestos (como no Factory I/O):
//   • botão ESQUERDO arrastado = mover a cena (pan)
//   • botão DIREITO arrastado  = girar a perspectiva (órbita)
//   • botão do MEIO arrastado  = mover a cena (alternativo)
//   • roda do mouse            = zoom NO PONTO que o cursor aponta
//   • W A S D                  = mover a vista (pan por teclado)
//   • Q / E                    = descer / subir a vista
//   • F                        = enquadrar no selecionado · Home = tudo
//
// Por que o LEFT é PAN: é o gesto que o usuário mais usa numa bancada
// (posicionar a vista onde o trabalho está). Clicar sem arrastar continua
// selecionando, porque a órbita só age quando o ponteiro sai do lugar.
import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export const SceneCamera: React.FC = () => {
  const keys = useRef<Set<string>>(new Set())
  const { camera, controls } = useThree()

  // teclas pressionadas (WASD/QE)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      keys.current.add(e.key.toLowerCase())
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    // solta tudo ao perder o foco (evita "vida presa" andando sozinha)
    const blur = () => keys.current.clear()

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // movimento por teclado — move câmera e alvo juntos (pan, não órbita)
  useFrame((_, dt) => {
    const k = keys.current
    if (k.size === 0 || !controls) return
    const step = 6 * dt * (k.has('shift') ? 2.5 : 1)
    const fwd = new (camera.position.constructor as any)()
    camera.getWorldDirection(fwd)
    fwd.y = 0
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1)
    fwd.normalize()
    const right = fwd.clone().cross(new (camera.position.constructor as any)(0, 1, 0)).normalize()

    const move = (v: any) => {
      camera.position.addScaledVector(v, step)
      ;(controls as any).target.addScaledVector(v, step)
    }
    if (k.has('w')) move(fwd)
    if (k.has('s')) move(fwd.clone().negate())
    if (k.has('d')) move(right)
    if (k.has('a')) move(right.clone().negate())
    if (k.has('q')) move(new (camera.position.constructor as any)(0, 1, 0))
    if (k.has('e')) move(new (camera.position.constructor as any)(0, -1, 0))
  })

  return null
}

/**
 * Controles configurados no gesto Factory I/O — usado dentro do <Canvas>.
 *
 * GESTOS (o mapeamento que o usuário precisa decorar):
 *   ESQUERDO arrastado = mover a cena (PAN no plano do chão)
 *   DIREITO  arrastado = girar a perspectiva (ÓRBITA)
 *   MEIO     arrastado = zoom por arraste
 *   roda do mouse      = zoom
 *   W A S D / Q E      = mover a vista
 *   F                  = enquadrar o selecionado · Home = tudo
 *
 * DECISÕES que tornam a navegação usável (eram a reclamação principal):
 *  • SEM zoomToCursor: ele é instável no three.js atual e faz a vista
 *    "saltar"/derivar sozinha quando a câmera tem amortecimento. O zoom
 *    passa a ir ao alvo, que é previsível.
 *  • screenSpacePanning = false: o pan desliza no PLANO DO CHÃO, não na
 *    tela. Arrastar para o lado move a bancada para o lado — o que se espera.
 *  • damping 0.16 (mais seco que 0.09): em máquina fraca o 0.09 deixava a
 *    cena "derrapando" por segundos depois de soltar o botão.
 *  • maxPolarAngle 1.48 (~85°): impede entrar por baixo do piso e o
 *    usuário se perder no vazio.
 *  • limites de distância e de alvo: a câmera nunca foge da bancada.
 */
export const FactoryControls: React.FC = () => (
  <OrbitControls
    makeDefault
    enableDamping
    dampingFactor={0.16}
    /*
      THREE.MOUSE: ROTATE=0, DOLLY=1, PAN=2
        ESQUERDO = PAN (2) · MEIO = DOLLY (1) · DIREITO = ROTATE (0)
    */
    mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 }}
    screenSpacePanning={false}
    zoomSpeed={0.9}
    panSpeed={1.0}
    rotateSpeed={0.8}
    // não deixa a vista virar por baixo do chão
    minPolarAngle={0.05}
    maxPolarAngle={1.48}
    // mantém a distância útil numa bancada
    minDistance={1.0}
    maxDistance={38}
    // toque: 1 dedo move a cena, 2 dedos giram
    touches={{ ONE: 2, TWO: 0 }}
  />
)

/**
 * Trava de segurança da câmera: impede o alvo de escapar da bancada.
 * Sem isso, um pan rápido pode mandar a vista para longe dos objetos e o
 * usuário fica sem referência nenhuma do que está olhando.
 */
export const CameraGuard: React.FC = () => {
  const controls = useThree(s => s.controls)

  useFrame(() => {
    const c = controls as any
    if (!c || !c.target) return
    const t = c.target
    const LIM_X = 40, LIM_Z = 40, LIM_Y_MIN = -0.4, LIM_Y_MAX = 14
    if (t.x < -LIM_X) t.x = -LIM_X
    if (t.x > LIM_X) t.x = LIM_X
    if (t.z < -LIM_Z) t.z = -LIM_Z
    if (t.z > LIM_Z) t.z = LIM_Z
    if (t.y < LIM_Y_MIN) t.y = LIM_Y_MIN
    if (t.y > LIM_Y_MAX) t.y = LIM_Y_MAX
  })

  return null
}

export default SceneCamera
