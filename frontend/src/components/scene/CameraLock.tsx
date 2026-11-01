// CameraLock — trava a órbita quando um gesto de peça precisa do mouse.
//
// Problema que resolve: o OrbitControls escuta o DOM diretamente, então
// arrastar um borne/alça também girava a cena. Qualquer componente dispara
// 'labhub:cam' {on:false} e a câmera congela até o usuário soltar o botão.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export const travarCamera = () =>
  window.dispatchEvent(new CustomEvent('labhub:cam', { detail: { on: false } }))

export const soltarCamera = () =>
  window.dispatchEvent(new CustomEvent('labhub:cam', { detail: { on: true } }))

export const CameraLock: React.FC = () => {
  const ctl = useThree(s => s.controls)

  useEffect(() => {
    const onCam = (e: Event) => {
      const ligar = (e as CustomEvent).detail?.on !== false
      if (ctl) (ctl as any).enabled = ligar
      // ao travar, libera sozinho quando o botão do mouse subir
      if (!ligar) {
        const up = () => { if (ctl) (ctl as any).enabled = true; window.removeEventListener('pointerup', up) }
        window.addEventListener('pointerup', up)
      }
    }
    window.addEventListener('labhub:cam', onCam)
    return () => window.removeEventListener('labhub:cam', onCam)
  }, [ctl])

  return null
}

export default CameraLock
