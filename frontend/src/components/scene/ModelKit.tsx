// ModelKit — biblioteca de primitivos industriais + renderizador de receitas.
//
// Pipeline A (procedural): cada dispositivo é declarado como uma RECEITA de
// partes neste arquivo/recipes.ts, e um único renderizador genérico transforma
// a receita em malha. Dispositivo novo = dado, não código.
//
// Orçamento de performance (alvo: 60fps no Galaxy Book Go, 3.7GB RAM):
//   - segmentos baixos por padrão (8-16)
//   - sem sombras nos elementos pequenos
//   - materiais compartilhados (cache por nome) para reduzir state changes

import React, { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// ============================================================
// MATERIAIS (presets industriais — baratos, sem textura por enquanto)
// ============================================================

export type MatName =
  | 'acoPintado' | 'aluminio' | 'acoPolido' | 'acoEscovado'
  | 'plastico' | 'borracha' | 'vidro' | 'cobre' | 'latao'

const MAT_SPEC: Record<MatName, { color: string; metalness: number; roughness: number }> = {
  acoPintado:  { color: '#4A5563', metalness: 0.35, roughness: 0.55 },  // RAL 7012 (motor/VFD)
  aluminio:    { color: '#9AA5B5', metalness: 0.8,  roughness: 0.3 },
  acoPolido:   { color: '#C7D0DA', metalness: 0.95, roughness: 0.12 },  // eixos
  acoEscovado: { color: '#7A8494', metalness: 0.7,  roughness: 0.42 },
  plastico:    { color: '#1C222B', metalness: 0.05, roughness: 0.8 },
  borracha:    { color: '#14181F', metalness: 0.0,  roughness: 0.95 },
  vidro:       { color: '#9FD8E8', metalness: 0.1,  roughness: 0.15 },
  cobre:       { color: '#B87333', metalness: 0.9,  roughness: 0.3 },
  latao:       { color: '#C9A227', metalness: 0.85, roughness: 0.35 },
}

/** Cache de materiais por nome+cor customizada (evita recriar a cada render) */
const matCache = new Map<string, THREE.MeshStandardMaterial>()

function useMat(name: MatName, colorOverride?: string) {
  const key = `${name}:${colorOverride || ''}`
  return useMemo(() => {
    let m = matCache.get(key)
    if (!m) {
      const spec = MAT_SPEC[name] || MAT_SPEC.acoPintado
      m = new THREE.MeshStandardMaterial({
        color: colorOverride || spec.color,
        metalness: spec.metalness,
        roughness: spec.roughness,
      })
      matCache.set(key, m)
    }
    return m
  }, [key, name, colorOverride])
}

// ============================================================
// PRIMITIVAS
// ============================================================

/** Caixa com canto arredondado — a base de 80% das peças industriais */
export const RBox: React.FC<{
  size: [number, number, number]; pos?: [number, number, number];
  rot?: [number, number, number]; mat?: MatName; cor?: string;
  radius?: number;
}> = ({ size, pos = [0, 0, 0], rot = [0, 0, 0], mat = 'acoPintado', cor, radius = 0.01 }) => {
  const m = useMat(mat, cor)
  return (
    <RoundedBox args={[size[0], size[1], size[2]]} radius={radius}
      position={pos} rotation={rot} castShadow receiveShadow>
      <meshStandardMaterial attach="material" color={m.color} metalness={m.metalness} roughness={m.roughness} />
    </RoundedBox>
  )
}

/** Cilindro genérico (eixos, furos, pernas, volutas) */
export const Cil: React.FC<{
  raio: number; comp: number; pos?: [number, number, number];
  rot?: [number, number, number]; mat?: MatName; cor?: string; seg?: number;
}> = ({ raio, comp, pos = [0, 0, 0], rot = [0, 0, 0], mat = 'acoPintado', cor, seg = 14 }) => (
  <mesh position={pos} rotation={rot} castShadow>
    <cylinderGeometry args={[raio, raio, comp, seg]} />
    <meshStandardMaterial color={cor || MAT_SPEC[mat].color} metalness={MAT_SPEC[mat].metalness} roughness={MAT_SPEC[mat].roughness} />
  </mesh>
)

/** Aletas de refrigeração — fileira de placas finas (motor, VFD).
 *  Caixa afiada de propósito: 12 tris cada uma (orçamento do Galaxy Book Go). */
export const Aletas: React.FC<{
  count: number; eixo?: 'x' | 'y' | 'z'; comprimento: number; altura: number;
  espessura?: number; pos?: [number, number, number]; mat?: MatName; cor?: string;
}> = ({ count, eixo = 'x', comprimento, altura, espessura = 0.005, pos = [0, 0, 0], mat = 'aluminio', cor }) => {
  const spec = MAT_SPEC[mat] || MAT_SPEC.aluminio
  const gap = comprimento / Math.max(1, count)
  const items = []
  for (let i = 0; i < count; i++) {
    const t = (i / Math.max(1, count - 1) - 0.5) * (comprimento - gap)
    const off: [number, number, number] =
      eixo === 'x' ? [t, 0, 0] : eixo === 'y' ? [0, t, 0] : [0, 0, t]
    const size: [number, number, number] =
      eixo === 'x' ? [espessura, altura, altura]
      : eixo === 'y' ? [altura, espessura, altura]
      : [altura, altura, espessura]
    items.push(
      <mesh key={i}
        position={[pos[0] + off[0], pos[1] + off[1], pos[2] + off[2]]}
        castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={cor || spec.color} metalness={spec.metalness} roughness={spec.roughness} />
      </mesh>
    )
  }
  return <group>{items}</group>
}

/** Círculo de parafusos (pés, flanges, tampa de caixa de ligação) */
export const ParafCircle: React.FC<{
  count: number; raio: number; comprimento: number; mat?: MatName; cor?: string;
  pos?: [number, number, number];
}> = ({ count, raio, comprimento, mat = 'aluminio', cor, pos = [0, 0, 0] }) => (
  <group position={pos}>
    {Array.from({ length: count }).map((_, i) => {
      const a = (i / count) * Math.PI * 2
      return (
        <Cil key={i}
          raio={raio * 0.35} comp={comprimento}
          pos={[Math.cos(a) * raio, 0, Math.sin(a) * raio]}
          rot={[Math.PI / 2, 0, 0]}
          mat={mat} cor={cor} seg={6} />
      )
    })}
  </group>
)

/** Perfil em torno (voluta, cotovelo, dome) — 2D revolvido */
export const Torno: React.FC<{
  perfil: [number, number][]; pos?: [number, number, number];
  rot?: [number, number, number]; mat?: MatName; cor?: string; seg?: number;
}> = ({ perfil, pos = [0, 0, 0], rot = [0, 0, 0], mat = 'acoPintado', cor, seg = 16 }) => {
  const geo = useMemo(() => {
    const pts = perfil.map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, seg)
  }, [perfil, seg])
  return (
    <mesh geometry={geo} position={pos} rotation={rot} castShadow>
      <meshStandardMaterial color={cor || MAT_SPEC[mat].color} metalness={MAT_SPEC[mat].metalness} roughness={MAT_SPEC[mat].roughness} />
    </mesh>
  )
}

/** Cabo por caminho (sensor → conector, chicote) */
export const Cabo: React.FC<{
  pontos: [number, number, number][]; raio?: number; mat?: MatName; cor?: string;
}> = ({ pontos, raio = 0.012, mat = 'borracha', cor }) => {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      pontos.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.4
    )
    return new THREE.TubeGeometry(curve, 24, raio, 6, false)
  }, [pontos, raio])
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={cor || MAT_SPEC[mat].color} metalness={MAT_SPEC[mat].metalness} roughness={MAT_SPEC[mat].roughness} />
    </mesh>
  )
}

/** Etiqueta/decal com texto em canvas (frente de VFD, plaqueta do motor) */
export const Decal: React.FC<{
  texto: string; largura: number; pos?: [number, number, number];
  rot?: [number, number, number]; corFundo?: string; corTexto?: string; fontePx?: number;
}> = ({ texto, largura, pos = [0, 0, 0], rot = [0, 0, 0], corFundo = '#1C222B', corTexto = '#8FE3F5', fontePx = 28 }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = corFundo; g.fillRect(0, 0, 256, 128)
    g.strokeStyle = '#33404F'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 120)
    g.fillStyle = corTexto
    g.font = `bold ${fontePx}px monospace`
    g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillText(texto, 128, 66)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [texto, corFundo, corTexto, fontePx])
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[largura, largura * 0.5]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

// ============================================================
// RENDERIZADOR GENÉRICO DE RECEITAS
// ============================================================

export type Parte =
  | { t: 'rbox'; size: [number, number, number]; pos?: any; rot?: any; mat?: MatName; cor?: string; radius?: number }
  | { t: 'cil'; raio: number; comp: number; pos?: any; rot?: any; mat?: MatName; cor?: string }
  | { t: 'aletas'; count: number; eixo?: 'x' | 'y' | 'z'; comp: number; altura: number; pos?: any; mat?: MatName; cor?: string }
  | { t: 'paraf'; count: number; raio: number; comp: number; pos?: any; mat?: MatName; cor?: string }
  | { t: 'torno'; perfil: [number, number][]; pos?: any; rot?: any; mat?: MatName; cor?: string }
  | { t: 'cabo'; pontos: [number, number, number][]; raio?: number; mat?: MatName; cor?: string }
  | { t: 'decal'; texto: string; largura: number; pos?: any; rot?: any; corFundo?: string; corTexto?: string; fontePx?: number }

export interface Receita {
  id: string
  partes: Parte[]
  /**
   * Bornes: posição REAL de cada porta NA CARCAÇA do dispositivo
   * (offset local). Estes pontos são enviados ao backend no spawn, de modo
   * que os fios nasçam exatamente onde o borne está — não flutuando no ar.
   */
  portas?: Record<string, [number, number, number]>
}

/** Renderiza uma receita inteira, incluindo os bornes na carcaça */
export const ModeloReceita: React.FC<{
  receita: Receita
  mostrarBornes?: boolean
  /** clique num borne (o conector físico é o elemento interativo) */
  onPortClick?: (portId: string) => void
  /** iniciar arraste de fio a partir de um borne */
  onPortDown?: (portId: string) => void
}> = ({ receita, mostrarBornes = true, onPortClick, onPortDown }) => {
  const bornes = receita.portas ? Object.entries(receita.portas) : []
  return (
    <group>
      {receita.partes.map((p, i) => {
        const k = `${receita.id}-p${i}`
        switch (p.t) {
          case 'rbox':
            return <RBox key={k} size={p.size} pos={p.pos} rot={p.rot} mat={p.mat} cor={p.cor} radius={p.radius} />
          case 'cil':
            return <Cil key={k} raio={p.raio} comp={p.comp} pos={p.pos} rot={p.rot} mat={p.mat} cor={p.cor} />
          case 'aletas':
            return <Aletas key={k} count={p.count} eixo={p.eixo} comprimento={p.comp} altura={p.altura} pos={p.pos} mat={p.mat} cor={p.cor} />
          case 'paraf':
            return <ParafCircle key={k} count={p.count} raio={p.raio} comprimento={p.comp} pos={p.pos} mat={p.mat} cor={p.cor} />
          case 'torno':
            return <Torno key={k} perfil={p.perfil} pos={p.pos} rot={p.rot} mat={p.mat} cor={p.cor} />
          case 'cabo':
            return <Cabo key={k} pontos={p.pontos} raio={p.raio} mat={p.mat} cor={p.cor} />
          case 'decal':
            return <Decal key={k} texto={p.texto} largura={p.largura} pos={p.pos} rot={p.rot} corFundo={p.corFundo} corTexto={p.corTexto} fontePx={p.fontePx} />
          default:
            return null
        }
      })}

      {/* bornes fisicamente na carcaça — o conector É o elemento interativo */}
      {mostrarBornes && bornes.map(([pid, pos]) => (
        <mesh key={`borne-${pid}`} position={pos as [number, number, number]}
          onClick={onPortClick ? (e) => { e.stopPropagation(); onPortClick(pid) } : undefined}
          onPointerDown={onPortDown ? (e) => { e.stopPropagation(); onPortDown(pid) } : undefined}
          onPointerOver={() => { if (onPortClick || onPortDown) document.body.style.cursor = 'crosshair' }}
          onPointerOut={() => { document.body.style.cursor = '' }}
        >
          <cylinderGeometry args={[0.016, 0.018, 0.030, 8]} />
          <meshStandardMaterial color="#8A94A6" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

export default ModeloReceita
