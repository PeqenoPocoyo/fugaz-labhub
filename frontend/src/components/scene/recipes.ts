// recipes — receitas declarativas dos dispositivos (Conjunto 1: âncoras de estilo)
//
// Formato: cada dispositivo é uma lista de partes. O renderizador genérico
// (ModelKit.ModeloReceita) transforma a receita em malha. Dispositivo novo = dado.
//
// Convenção: origem no centro do dispositivo. +Y para cima, +Z frente.
// Escala em METROS.

import type { Receita } from './ModelKit'

// ============================================================
// MOTOR DC — padrão pé, eixo horizontal (tipo IEC 90)
// ============================================================

function motorDC(): Receita {
  const corpoX = 0.46   // comprimento do estator
  const raioCorpo = 0.17
  return {
    id: 'motor_dc',
    partes: [
      // --- estator (corpo com aletas vem separado) ---
      { t: 'rbox', size: [corpoX, 0.30, 0.30], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.03 },

      // --- aletas de refrigeração (10 placas finas) ---
      { t: 'aletas', count: 10, eixo: 'x', comp: 0.44, altura: 0.34, pos: [0, 0, 0], mat: 'aluminio' },

      // --- tampas dianteira/traseira (end bells) ---
      { t: 'cil', raio: raioCorpo + 0.01, comp: 0.05, pos: [corpoX / 2 + 0.02, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },
      { t: 'cil', raio: raioCorpo + 0.01, comp: 0.05, pos: [-corpoX / 2 - 0.02, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },

      // --- pés (base de fixação) ---
      { t: 'rbox', size: [0.34, 0.06, 0.22], pos: [0.08, -0.17, 0], mat: 'acoPintado', radius: 0.012 },
      { t: 'rbox', size: [0.34, 0.06, 0.22], pos: [-0.08, -0.17, 0], mat: 'acoPintado', radius: 0.012 },
      { t: 'paraf', count: 2, raio: 0.12, comp: 0.02, pos: [0.08, -0.195, 0], mat: 'latao' },
      { t: 'paraf', count: 2, raio: 0.12, comp: 0.02, pos: [-0.08, -0.195, 0], mat: 'latao' },

      // --- eixo de saída (polido) + chave ---
      { t: 'cil', raio: 0.014, comp: 0.18, pos: [corpoX / 2 + 0.08, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      { t: 'rbox', size: [0.05, 0.006, 0.006], pos: [corpoX / 2 + 0.05, 0.014, 0], mat: 'acoEscovado' },

      // --- caixa de ligação (tampa com parafusos) ---
      { t: 'rbox', size: [0.16, 0.11, 0.15], pos: [0, 0.21, 0], mat: 'acoPintado', radius: 0.015 },
      { t: 'rbox', size: [0.13, 0.01, 0.12], pos: [0, 0.265, 0], mat: 'acoEscovado', radius: 0.008 },
      { t: 'paraf', count: 4, raio: 0.05, comp: 0.008, pos: [0, 0.268, 0], mat: 'latao' },

      // --- plaquinha com texto ---
      { t: 'decal', texto: 'DC 24V', largura: 0.10, pos: [0, 0.02, 0.153], rot: [0, 0, 0] },

      // --- ventilador traseiro (grade) ---
      { t: 'cil', raio: 0.07, comp: 0.012, pos: [-corpoX / 2 - 0.04, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico' },
    ],
  }
}

// ============================================================
// SENSOR FOTELÉTRICO — pequeno, preciso, com cabo
// ============================================================

function sensorFotoeletrico(): Receita {
  const cx = 0.10  // meio corpo
  return {
    id: 'sensor_photoelectric',
    partes: [
      // --- corpo principal ---
      { t: 'rbox', size: [0.20, 0.055, 0.055], pos: [0, 0, 0], mat: 'plastico', radius: 0.008 },

      // --- faixa de aperto (porca de fixação) ---
      { t: 'cil', raio: 0.038, comp: 0.014, pos: [cx, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'latao' },

      // --- cabeça com lente (frente) ---
      { t: 'rbox', size: [0.06, 0.06, 0.06], pos: [0.13, 0, 0], mat: 'plastico', radius: 0.008 },
      // lente (vidro) + anel escuro
      { t: 'cil', raio: 0.026, comp: 0.006, pos: [0.162, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'vidro' },
      { t: 'cil', raio: 0.03, comp: 0.008, pos: [0.158, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
      // emissor (segunda lente)
      { t: 'cil', raio: 0.012, comp: 0.005, pos: [0.158, 0.028, 0], rot: [0, 0, Math.PI / 2], mat: 'vidro', cor: '#E53935' },

      // --- LED de status (esfera emissiva) ---
      { t: 'rbox', size: [0.012, 0.012, 0.012], pos: [0.05, 0.032, 0], mat: 'plastico', cor: '#26A69A' },

      // --- cabo saindo da traseira, com curva e conector ---
      { t: 'cabo', raio: 0.011, mat: 'borracha', pontos: [
        [-0.10, -0.02, 0],
        [-0.20, -0.05, 0.02],
        [-0.30, -0.03, 0.05],
        [-0.38, 0.02, 0.03],
      ] },
      { t: 'cil', raio: 0.016, comp: 0.05, pos: [-0.41, 0.04, 0.03], rot: [0, 0, 1.35], mat: 'plastico' },

      // --- plaquinha ---
      { t: 'decal', texto: 'PNP', largura: 0.05, pos: [0, 0.03, 0.029], rot: [0, 0, 0] },

      // --- suporte (bracket leve, só o pé) ---
      { t: 'rbox', size: [0.05, 0.02, 0.05], pos: [cx, -0.028, 0], mat: 'acoEscovado', radius: 0.004 },
    ],
  }
}

// ============================================================
// BASE PLANA — 4×3 furos, 1m de espaçamento (paramétrica)
// ============================================================

function basePlana(cols = 4, rows = 3, spacing = 1.0, espessura = 0.01): Receita {
  const largura = (cols - 1) * spacing + 0.3
  const profundidade = (rows - 1) * spacing + 0.3
  const partes: any[] = [
    // --- chapa ---
    { t: 'rbox', size: [largura, espessura, profundidade], pos: [0, 0, 0], mat: 'acoEscovado', radius: 0.006 },
    // borda de reforço
    { t: 'rbox', size: [largura + 0.04, 0.005, profundidade + 0.04], pos: [0, -0.007, 0], mat: 'acoPintado', radius: 0.004 },
  ]
  // furos (círculos escuros = rebaixo visível)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * spacing
      const z = (r - (rows - 1) / 2) * spacing
      partes.push({ t: 'cil', raio: 0.045, comp: 0.004, pos: [x, espessura / 2 + 0.002, z], mat: 'plastico', cor: '#0B0E13' })
      partes.push({ t: 'cil', raio: 0.028, comp: 0.006, pos: [x, espessura / 2 + 0.003, z], mat: 'acoEscovado' })
    }
  }
  return { id: 'infra_base_plate', partes }
}

// ============================================================
// CATÁLOGO
// ============================================================

export const RECEITAS: Record<string, Receita> = {
  motor_dc: motorDC(),
  sensor_photoelectric: sensorFotoeletrico(),
  infra_base_plate: basePlana(),
}

/** Receitas paramétricas: recalculadas a partir das propriedades do dispositivo */
export function receitaPara(typeId: string, properties: Record<string, any> = {}): Receita | null {
  if (typeId === 'infra_base_plate') {
    return basePlana(
      Number(properties.cols ?? 4),
      Number(properties.rows ?? 3),
      Number(properties.spacing_m ?? 1.0),
      Number(properties.thickness_mm ?? 10) / 1000,
    )
  }
  return RECEITAS[typeId] ?? null
}

/** Conta partes+primitivas de uma receita (para relatório de orçamento) */
export function orcamentoReceita(r: Receita): { partes: number; estimativaTris: number } {
  let tris = 0
  for (const p of r.partes) {
    switch (p.t) {
      case 'rbox': tris += 200; break
      case 'cil': tris += 14 * 2 * 6; break
      case 'aletas': tris += p.count * 12; break
      case 'paraf': tris += p.count * 12; break
      case 'torno': tris += p.perfil.length * 16; break
      case 'cabo': tris += 24 * 6 * 2; break
      case 'decal': tris += 2; break
      default: tris += 12
    }
  }
  return { partes: r.partes.length, estimativaTris: tris }
}
