// EnvironmentLight — mapa de ambiente procedural.
//
// POR QUE ISSO EXISTE: num material PBR (nosso meshStandardMaterial com
// metalness alto), a luz que "dá material" não vem da luz direta — vem do
// AMBIENTE que o metal reflete. Sem um environment map, alumínio e aço
// aparecem PRETOS ou chapados, não importa quanta directionalLight se ponha.
// Baixar um HDR exigiria rede e alguns MB; aqui geramos um cépu de gradiente
// de 64×128 px num canvas e passamos pelo PMREMGenerator do three, que produz
// exatamente o mapa de reflexos que o shader precisa. Custo: um canvas
// minúsculo e uma textura — irrelevante até para máquina fraca.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** desenha o "céu" do laboratório: claro em cima, escuro no piso */
function pintarCeu(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0.00, '#8FA6C4')  // zênite (claraboia)
  g.addColorStop(0.35, '#5E7392')
  g.addColorStop(0.52, '#2E3A4E')  // horizonte
  g.addColorStop(0.55, '#1B222E')  // piso
  g.addColorStop(1.00, '#0B0E13')  // chão da célula
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // uma "janela" retangular clara: dá reflexo alongado no aço (cara de fábrica)
  ctx.fillStyle = 'rgba(220,232,248,0.55)'
  ctx.fillRect(w * 0.08, h * 0.10, w * 0.22, h * 0.16)
  ctx.fillRect(w * 0.62, h * 0.14, w * 0.16, h * 0.12)
  // lâmpadas do teto
  ctx.fillStyle = 'rgba(255,250,230,0.5)'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(w * (0.3 + i * 0.2), h * 0.06, w * 0.05, h * 0.035)
  }
}

export const EnvironmentLight: React.FC = () => {
  const scene = useThree(s => s.scene)
  const gl = useThree(s => s.gl)

  useEffect(() => {
    const w = 128, h = 64
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    pintarCeu(ctx, w, h)

    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace

    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()
    const target = pmrem.fromEquirectangular(texture)
    scene.environment = target.texture
    scene.environmentIntensity = 0.55   // ambiente contido: o metal brilha,
                                        // mas a cena não fica lavada

    return () => {
      scene.environment = null
      texture.dispose()
      target.dispose()
      pmrem.dispose()
    }
  }, [scene, gl])

  return null
}

/**
 * Liga sombra/projeção numa árvore de malhas de uma vez.
 * Usado pelos embrulhos de peça: sem isso nenhum mesh tinha castShadow e
 * habilitar shadowMap no Canvas não produzia uma única sombra.
 */
export const ligarSombras = (grupo: THREE.Object3D | null | undefined) => {
  if (!grupo) return
  grupo.traverse((o: any) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
  })
}

export default EnvironmentLight
