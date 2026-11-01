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

/** Controles configurados no gesto Factory I/O — usado dentro do <Canvas> */
export const FactoryControls: React.FC = () => (
  <OrbitControls
    makeDefault
    enableDamping
    dampingFactor={0.09}
    /*
      GESTOS Factory I/O (THREE.MOUSE: ROTATE=0, DOLLY=1, PAN=2):
        ESQUERDO arrastado = mover a cena (PAN)
        DIREITO  arrastado = girar a perspectiva (ROTATE)
        MEIO     arrastado = zoom por arraste (DOLLY)
      Clicar sem arrastar continua selecionando (a órbita só age com movimento).
    */
    mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 0 }}
    // zoom onde o cursor aponta — é o que faz o zoom "parar no lugar certo"
    zoomToCursor
    zoomSpeed={0.85}
    panSpeed={0.95}
    rotateSpeed={0.85}
    // toque: 1 dedo move a cena, 2 dedos giram, pinch dá zoom
    touches={{ ONE: 2, TWO: 0 }}
  />
)

export default SceneCamera
