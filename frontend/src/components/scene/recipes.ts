// recipes — receitas declarativas dos dispositivos (Conjunto 1: âncoras de estilo)
//
// Formato: cada dispositivo é uma lista de partes. O renderizador genérico
// (ModelKit.ModeloReceita) transforma a receita em malha. Dispositivo novo = dado.
//
// Convenção: origem no centro do dispositivo. +Y para cima, +Z frente.
// Escala em METROS.

import type { Receita, Parte } from './ModelKit'

/**
 * ESCALA DOS MODELOS — os dispositivos ficam um pouco maiores para que os
 * bornes se afastem entre si (menos cruzamento de fio) e as peças tenham
 * presença na cena. Aplica-se a partes E a bornes, de forma que o borne
 * continue exatamente sobre a carcaça.
 */
const ESCALA = 1.32

/** escala uma parte (posições, tamanhos, raios) */
function escalar(p: Parte): Parte {
  const s = (n: number) => n * ESCALA
  const v = (a: [number, number, number]): [number, number, number] => [s(a[0]), s(a[1]), s(a[2])]
  switch (p.t) {
    case 'rbox':  return { ...p, size: v(p.size) as any, pos: p.pos ? v(p.pos) : p.pos }
    case 'cil':   return { ...p, raio: s(p.raio ?? 0), comp: s(p.comp ?? 0), pos: p.pos ? v(p.pos) : p.pos }
    case 'aletas':return { ...p, comp: s(p.comp), altura: s(p.altura), pos: p.pos ? v(p.pos) : p.pos }
    case 'paraf': return { ...p, raio: s(p.raio), comp: s(p.comp), pos: p.pos ? v(p.pos) : p.pos }
    case 'torno': return { ...p, perfil: p.perfil.map(([x, y]) => [s(x), s(y)] as [number, number]),
                            pos: p.pos ? v(p.pos) : p.pos }
    case 'cabo':  return { ...p, raio: p.raio != null ? s(p.raio) : p.raio, pontos: p.pontos.map(v) as any }
    case 'decal': return { ...p, largura: s(p.largura), pos: p.pos ? v(p.pos) : p.pos }
    default: return p
  }
}

/**
 * BORNES NA CARCAÇA — posição real de cada porta no corpo do dispositivo.
 * Unidades em METROS, na escala de autoria (antes do fator ESCALA).
 * O borne nasce fisicamente sobre estes pontos (ver ModeloReceita) e o
 * backend recebe as mesmas coordenadas no spawn, então o fio começa no borne.
 */
const PORTAS: Record<string, Record<string, [number, number, number]>> = {
  motor_ac: {
    l1: [-0.070, 0.257, 0.083], l2: [-0.035, 0.257, 0.083], l3: [0, 0.257, 0.083],
    start: [0.035, 0.257, 0.083], stop: [0.070, 0.257, 0.083],
  },
  motor_stepper: {
    'a+': [-0.128, 0.115, 0.045], 'a-': [-0.128, 0.115, 0.015],
    'b+': [-0.128, 0.115, -0.015], 'b-': [-0.128, 0.115, -0.045],
    step: [-0.128, 0.065, 0.020], dir: [-0.128, 0.065, -0.020],
    home: [0.090, 0, 0],
  },
  motor_servo: {
    pwr: [-0.120, -0.075, 0.020], cmd: [-0.120, -0.075, -0.020],
    fb: [-0.060, 0.090, 0], ready: [0.000, 0.088, 0],
  },
  sensor_photoelectric: {
    pwr: [-0.132, 0.014, 0.006], test: [-0.132, 0.014, -0.006], out: [-0.132, -0.010, 0],
  },
  sensor_photoelectric_receptor: {
    pwr: [-0.132, 0.014, 0.006], out: [-0.132, -0.010, 0], align_cmd: [-0.132, 0.014, -0.006],
  },
  sensor_inductive: { pwr: [-0.092, 0.009, 0], out: [-0.092, -0.009, 0] },
  sensor_limit_switch: { nc: [-0.062, -0.008, 0.022], no: [-0.062, -0.008, -0.022] },
  sensor_temperature: { pwr: [-0.128, 0.009, 0], out: [-0.128, -0.009, 0] },
  sensor_pressure: { pwr: [0, 0, -0.056], out: [0, -0.02, -0.056] },
  sensor_encoder: {
    pwr: [-0.072, 0.022, 0.012], ch_a: [-0.072, 0.022, -0.012],
    ch_b: [-0.072, -0.012, 0.012], ch_z: [-0.072, -0.012, -0.012],
  },
  cylinder_pneumatic: {
    port_a: [-0.130, 0.086, 0.015], port_b: [0.130, 0.086, 0.015],
    valve_a: [-0.130, 0.086, -0.015], valve_b: [0.130, 0.086, -0.015],
    sensor_front: [0.146, 0, 0], sensor_back: [-0.146, 0, 0],
  },
  valve_pneumatic_5_2: {
    p: [-0.090, -0.058, 0], a: [0, -0.058, 0], b: [0.090, -0.058, 0],
    ea: [-0.126, 0, 0], eb: [0.126, 0, 0],
    coil_a: [-0.060, 0.112, 0], coil_b: [0.060, 0.112, 0],
  },
  camera_ip: {
    poe: [-0.082, 0.010, 0], eth0: [-0.082, -0.010, 0],
    detect: [-0.03, 0.042, 0.022], count: [0, 0.042, 0.022],
    pos_x: [0.03, 0.042, 0.022], pos_y: [0.03, 0.042, -0.022],
  },
  clp_generic: { eth0: [0, 0, -0.076] },
  vfd_generic: {
    l1: [-0.070, -0.215, 0.046], l2: [0, -0.215, 0.046], l3: [0.070, -0.215, 0.046],
    u: [-0.070, -0.215, -0.046], v: [0, -0.215, -0.046], w: [0.070, -0.215, -0.046],
    di_start: [0.108, 0.030, 0.106], di_stop: [0.108, 0.008, 0.106],
    di_fwd: [0.108, -0.014, 0.106], di_rev: [0.108, -0.036, 0.106],
    di_reset: [0.108, -0.058, 0.106], di_fault: [0.108, -0.080, 0.106],
    ai_speed: [0.108, -0.102, 0.106],
    do_run: [-0.108, 0.030, 0.106], do_fault: [-0.108, 0.008, 0.106],
    do_ready: [-0.108, -0.014, 0.106], ao_freq: [-0.108, -0.036, 0.106],
    rs485: [0, -0.150, -0.106],
  },
}

/** aplica escala + converte bornes para a escala do mundo */
function pronta(r: Receita): Receita {
  const fonte = r.portas ?? PORTAS[r.id] ?? {}
  const portas: Record<string, [number, number, number]> = {}
  for (const [k, p] of Object.entries(fonte)) {
    portas[k] = [p[0] * ESCALA, p[1] * ESCALA, p[2] * ESCALA]
  }
  return { id: r.id, partes: r.partes.map(escalar), portas }
}

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
    // bornes na face da caixa de ligação (carcaça — não flutuando)
    portas: {
      'v+':  [-0.06, 0.235, 0.078],
      'v-':  [-0.02, 0.235, 0.078],
      'pwm': [0.02, 0.235, 0.078],
      'dir': [0.06, 0.235, 0.078],
    },
  }
}

// ============================================================
// SENSOR FOTELÉTRICO — emissor de feixe (barreira)
//
// Sem cabo no modelo: o caminho da fiação é do usuário. Fica só o
// alívio de tração + o conector na saída, que é onde o fio começa.
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

      // --- LED de status ---
      { t: 'rbox', size: [0.012, 0.012, 0.012], pos: [0.05, 0.032, 0], mat: 'plastico', cor: '#26A69A' },

      // --- saída do cabo: conector + alívio de tração (o fio começa aqui) ---
      { t: 'cil', raio: 0.016, comp: 0.03, pos: [-0.115, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#1C222B' },
      { t: 'cil', raio: 0.012, comp: 0.02, pos: [-0.14, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },

      // --- plaquinha ---
      { t: 'decal', texto: 'EMISSOR', largura: 0.05, pos: [0, 0.03, 0.029], rot: [0, 0, 0] },

      // --- suporte (bracket leve, só o pé) ---
      { t: 'rbox', size: [0.05, 0.02, 0.05], pos: [cx, -0.028, 0], mat: 'acoEscovado', radius: 0.004 },
    ],
  }
}

// ============================================================
// RECEPTOR FOTOELÉTRICO — a outra ponta da barreira
// ============================================================

function receptorFotoeletrico(): Receita {
  const cx = 0.10
  return {
    id: 'sensor_photoelectric_receptor',
    partes: [
      { t: 'rbox', size: [0.20, 0.055, 0.055], pos: [0, 0, 0], mat: 'plastico', radius: 0.008 },
      { t: 'cil', raio: 0.038, comp: 0.014, pos: [cx, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'latao' },
      // cabeça receptora (janela larga, sem lente de emissor)
      { t: 'rbox', size: [0.06, 0.06, 0.06], pos: [0.13, 0, 0], mat: 'plastico', radius: 0.008 },
      { t: 'cil', raio: 0.03, comp: 0.008, pos: [0.158, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
      { t: 'cil', raio: 0.026, comp: 0.006, pos: [0.162, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'vidro' },
      // LED de status
      { t: 'rbox', size: [0.012, 0.012, 0.012], pos: [0.05, 0.032, 0], mat: 'plastico', cor: '#FFA726' },
      // saída do cabo: conector + alívio de tração
      { t: 'cil', raio: 0.016, comp: 0.03, pos: [-0.115, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#1C222B' },
      { t: 'cil', raio: 0.012, comp: 0.02, pos: [-0.14, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      { t: 'decal', texto: 'RECEPTOR', largura: 0.055, pos: [0, 0.03, 0.029], rot: [0, 0, 0] },
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
// LOTE 2 — painel, motores, sensores, pneumáticos, câmera, infra
// ============================================================

function clp(): Receita {
  return {
    id: 'clp_generic',
    partes: [
      // corpo do rack (montado em trilho DIN, visto de frente)
      { t: 'rbox', size: [0.40, 0.22, 0.14], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.008 },
      // frente com porta de display
      { t: 'rbox', size: [0.385, 0.205, 0.008], pos: [0, 0, 0.071], mat: 'acoEscovado', radius: 0.004 },
      { t: 'decal', texto: 'CLP', largura: 0.10, pos: [-0.13, 0.075, 0.076] },
      // LEDs de status
      { t: 'cil', raio: 0.006, comp: 0.006, pos: [0.15, 0.075, 0.079], mat: 'plastico', cor: '#3FB950' },
      { t: 'cil', raio: 0.006, comp: 0.006, pos: [0.17, 0.075, 0.079], mat: 'plastico', cor: '#F85149' },
      // modulo I/O apararente (encaixe lateral)
      { t: 'rbox', size: [0.10, 0.20, 0.004], pos: [0.20, -0.005, 0.07], mat: 'plastico', radius: 0.002 },
      // bornes na base (bornes verdes de sinal)
      { t: 'rbox', size: [0.34, 0.03, 0.10], pos: [0, -0.125, 0.045], mat: 'plastico', radius: 0.002 },
      // clip do trilho DIN atrás
      { t: 'rbox', size: [0.36, 0.03, 0.01], pos: [0, -0.10, -0.075], mat: 'aluminio', radius: 0.002 },
      // etiqueta de slot no topo
      { t: 'rbox', size: [0.12, 0.01, 0.12], pos: [0, 0.115, 0], mat: 'acoEscovado', radius: 0.002 },
    ],
  }
}

function vfd(): Receita {
  return {
    id: 'vfd_generic',
    partes: [
      // corpo (montagem em painel, dissipador atrás)
      { t: 'rbox', size: [0.26, 0.36, 0.20], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.01 },
      // frente
      { t: 'rbox', size: [0.245, 0.345, 0.006], pos: [0, 0, 0.101], mat: 'acoEscovado', radius: 0.004 },
      // display
      { t: 'decal', texto: '0.0 Hz', largura: 0.09, pos: [0, 0.11, 0.104] },
      // teclado (3 botões)
      { t: 'cil', raio: 0.018, comp: 0.008, pos: [-0.055, -0.02, 0.104], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#263041' },
      { t: 'cil', raio: 0.018, comp: 0.008, pos: [0, -0.02, 0.104], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#263041' },
      { t: 'cil', raio: 0.018, comp: 0.008, pos: [0.055, -0.02, 0.104], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#263041' },
      // LEDs
      { t: 'cil', raio: 0.005, comp: 0.006, pos: [-0.09, -0.13, 0.104], mat: 'plastico', cor: '#3FB950' },
      { t: 'cil', raio: 0.005, comp: 0.006, pos: [-0.07, -0.13, 0.104], mat: 'plastico', cor: '#D29922' },
      // aletas do dissipador (atrás)
      { t: 'aletas', count: 12, eixo: 'y', comp: 0.30, altura: 0.18, pos: [0, 0, -0.11], mat: 'aluminio' },
      // bornes de potência embaixo
      { t: 'rbox', size: [0.22, 0.045, 0.09], pos: [0, -0.20, 0], mat: 'plastico', radius: 0.003 },
      { t: 'paraf', count: 3, raio: 0.07, comp: 0.01, pos: [0, -0.222, 0], mat: 'latao' },
      // alças de fixação no painel
      { t: 'rbox', size: [0.03, 0.36, 0.03], pos: [0.135, 0, 0.09], mat: 'acoEscovado', radius: 0.003 },
      { t: 'rbox', size: [0.03, 0.36, 0.03], pos: [-0.135, 0, 0.09], mat: 'acoEscovado', radius: 0.003 },
    ],
  }
}

function motorAC(): Receita {
  return {
    id: 'motor_ac',
    partes: [
      { t: 'rbox', size: [0.48, 0.32, 0.32], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.03 },
      { t: 'aletas', count: 11, eixo: 'x', comp: 0.46, altura: 0.36, pos: [0, 0, 0], mat: 'aluminio' },
      // tampas quadradas (motor AC)
      { t: 'rbox', size: [0.05, 0.34, 0.34], pos: [0.25, 0, 0], mat: 'acoPintado', radius: 0.02 },
      { t: 'rbox', size: [0.05, 0.34, 0.34], pos: [-0.25, 0, 0], mat: 'acoPintado', radius: 0.02 },
      // pés
      { t: 'rbox', size: [0.34, 0.06, 0.24], pos: [0.08, -0.19, 0], mat: 'acoPintado', radius: 0.012 },
      { t: 'rbox', size: [0.34, 0.06, 0.24], pos: [-0.08, -0.19, 0], mat: 'acoPintado', radius: 0.012 },
      { t: 'paraf', count: 2, raio: 0.12, comp: 0.02, pos: [0.08, -0.215, 0], mat: 'latao' },
      { t: 'paraf', count: 2, raio: 0.12, comp: 0.02, pos: [-0.08, -0.215, 0], mat: 'latao' },
      // eixo
      { t: 'cil', raio: 0.016, comp: 0.20, pos: [0.29, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // caixa de ligação no topo
      { t: 'rbox', size: [0.17, 0.12, 0.16], pos: [0, 0.23, 0], mat: 'acoPintado', radius: 0.015 },
      { t: 'rbox', size: [0.14, 0.01, 0.13], pos: [0, 0.288, 0], mat: 'acoEscovado', radius: 0.008 },
      { t: 'paraf', count: 4, raio: 0.055, comp: 0.008, pos: [0, 0.291, 0], mat: 'latao' },
      // ventilador traseiro
      { t: 'cil', raio: 0.08, comp: 0.012, pos: [-0.29, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico' },
      { t: 'decal', texto: 'AC 380V', largura: 0.10, pos: [0, 0.02, 0.163], rot: [0, 0, 0] },
    ],
  }
}

function motorStepper(): Receita {
  // corpo quadrado NEMA, eixo central, flange de montagem
  const lado = 0.30
  return {
    id: 'motor_stepper',
    partes: [
      { t: 'rbox', size: [0.16, lado, lado], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.012 },
      // flange NEMA
      { t: 'rbox', size: [0.014, lado + 0.04, lado + 0.04], pos: [0.085, 0, 0], mat: 'aluminio', radius: 0.003 },
      { t: 'paraf', count: 4, raio: lado * 0.42, comp: 0.016, pos: [0.095, 0, 0], mat: 'latao' },
      // tampa traseira
      { t: 'rbox', size: [0.03, lado, lado], pos: [-0.09, 0, 0], mat: 'acoPintado', radius: 0.012 },
      // eixo central
      { t: 'cil', raio: 0.012, comp: 0.16, pos: [0.17, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // conector na traseira
      { t: 'rbox', size: [0.02, 0.07, 0.12], pos: [-0.115, 0.05, 0], mat: 'plastico', radius: 0.002 },
      { t: 'decal', texto: 'STEP', largura: 0.06, pos: [0, 0.08, 0.081], rot: [0, 0, 0] },
    ],
  }
}

function motorServo(): Receita {
  return {
    id: 'motor_servo',
    partes: [
      // corpo preciso (menor, azul-acinzentado)
      { t: 'cil', raio: 0.085, comp: 0.22, pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado', cor: '#2F3B4C' },
      // bulbo do encoder (identidade do servo)
      { t: 'cil', raio: 0.055, comp: 0.05, pos: [-0.12, 0.06, 0], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#1C222B' },
      // flange dianteira
      { t: 'cil', raio: 0.10, comp: 0.012, pos: [0.115, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'aluminio' },
      { t: 'paraf', count: 4, raio: 0.078, comp: 0.014, pos: [0.12, 0, 0], mat: 'latao' },
      // eixo
      { t: 'cil', raio: 0.011, comp: 0.14, pos: [0.20, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // conector
      { t: 'cil', raio: 0.035, comp: 0.02, pos: [-0.11, -0.07, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico' },
    ],
  }
}

function sensorIndutivo(): Receita {
  return {
    id: 'sensor_inductive',
    partes: [
      // corpo roscado M12
      { t: 'cil', raio: 0.021, comp: 0.09, pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'aluminio' },
      // rosca (anéis visíveis)
      { t: 'cil', raio: 0.023, comp: 0.004, pos: [0.03, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      { t: 'cil', raio: 0.023, comp: 0.004, pos: [-0.01, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      // porca de fixação
      { t: 'cil', raio: 0.03, comp: 0.01, pos: [0.045, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'latao' },
      // face de detecção
      { t: 'cil', raio: 0.019, comp: 0.006, pos: [0.052, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
      //an+ prensa-cabo atrás
      { t: 'cil', raio: 0.014, comp: 0.03, pos: [-0.058, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      { t: 'cil', raio: 0.010, comp: 0.02, pos: [-0.08, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      // LED
      { t: 'cil', raio: 0.004, comp: 0.004, pos: [0, 0.022, 0], mat: 'plastico', cor: '#D29922' },
      { t: 'decal', texto: 'M12', largura: 0.02, pos: [0, 0.024, 0], rot: [0, 0, 0], fontePx: 16 },
    ],
  }
}

function chaveFimDeCurso(): Receita {
  return {
    id: 'sensor_limit_switch',
    partes: [
      // corpo
      { t: 'rbox', size: [0.07, 0.045, 0.045], pos: [-0.02, 0, 0], mat: 'plastico', radius: 0.005 },
      // alavanca com rolo
      { t: 'rbox', size: [0.10, 0.012, 0.018], pos: [0.055, 0.015, 0], rot: [0, 0, -0.25], mat: 'acoEscovado', radius: 0.003 },
      { t: 'cil', raio: 0.012, comp: 0.016, pos: [0.11, 0.03, 0], rot: [Math.PI / 2, 0, 0.25], mat: 'aluminio' },
      // bornes
      { t: 'cil', raio: 0.005, comp: 0.04, pos: [-0.045, -0.008, 0.018], rot: [Math.PI / 2, 0, 0], mat: 'latao' },
      { t: 'cil', raio: 0.005, comp: 0.04, pos: [-0.045, -0.008, -0.018], rot: [Math.PI / 2, 0, 0], mat: 'latao' },
      { t: 'decal', texto: 'LS', largura: 0.025, pos: [-0.02, 0.026, 0.024], rot: [0, 0, 0], fontePx: 14 },
    ],
  }
}

function sensorTemperatura(): Receita {
  return {
    id: 'sensor_temperature',
    partes: [
      // cabeça com display
      { t: 'cil', raio: 0.045, comp: 0.09, pos: [-0.05, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },
      { t: 'decal', texto: '24.0', largura: 0.055, pos: [-0.05, 0.045, 0], rot: [0, Math.PI / 2, 0] },
      // ponteira (bulbo) — vai no processo
      { t: 'cil', raio: 0.012, comp: 0.16, pos: [0.11, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      { t: 'cil', raio: 0.016, comp: 0.05, pos: [0.06, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      // prensa-cabo atrás
      { t: 'cil', raio: 0.012, comp: 0.025, pos: [-0.115, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
    ],
  }
}

function sensorPressao(): Receita {
  // manômetro com mostrador e ponteiro
  return {
    id: 'sensor_pressure',
    partes: [
      // caixa do mostrador (perfil em torno)
      { t: 'torno', perfil: [[0.001, -0.05], [0.055, -0.05], [0.06, -0.02], [0.06, 0.02], [0.055, 0.05], [0.001, 0.05]],
        pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoEscovado' },
      // mostrador claro
      { t: 'cil', raio: 0.05, comp: 0.004, pos: [0, 0.055, 0], rot: [Math.PI / 2, 0, 0], mat: 'vidro' },
      // ponteiro
      { t: 'rbox', size: [0.001, 0.038, 0.005], pos: [0, 0.058, 0], rot: [Math.PI / 2, 0, 0.6], mat: 'plastico', cor: '#F85149' },
      // eixo
      { t: 'cil', raio: 0.006, comp: 0.01, pos: [0, 0.055, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPolido' },
      // conexão ao processo embaixo
      { t: 'cil', raio: 0.012, comp: 0.07, pos: [0, -0.075, 0], mat: 'latao' },
      { t: 'cil', raio: 0.02, comp: 0.012, pos: [0, -0.105, 0], mat: 'latao' },
    ],
  }
}

function encoder(): Receita {
  return {
    id: 'sensor_encoder',
    partes: [
      // corpo
      { t: 'cil', raio: 0.05, comp: 0.09, pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado', cor: '#2F3B4C' },
      // flange de montagem
      { t: 'cil', raio: 0.062, comp: 0.01, pos: [0.04, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'aluminio' },
      { t: 'paraf', count: 3, raio: 0.048, comp: 0.01, pos: [0.048, 0, 0], mat: 'latao' },
      // eixo oco (recebe o eixo do motor)
      { t: 'cil', raio: 0.014, comp: 0.10, pos: [0.085, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // conector na traseira
      { t: 'cil', raio: 0.032, comp: 0.018, pos: [-0.06, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico' },
      { t: 'decal', texto: 'ENC', largura: 0.05, pos: [0, 0.05, 0], rot: [Math.PI / 2, 0, 0], fontePx: 14 },
    ],
  }
}

function cilindroPneumatico(): Receita {
  return {
    id: 'cylinder_pneumatic',
    partes: [
      // camisa (torno)
      { t: 'torno', perfil: [[0.001, -0.13], [0.05, -0.13], [0.055, -0.11], [0.055, 0.11], [0.05, 0.13], [0.001, 0.13]],
        pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'aluminio' },
      // tampas
      { t: 'torno', perfil: [[0.001, -0.06], [0.058, -0.06], [0.062, -0.04], [0.062, 0.04], [0.058, 0.06], [0.001, 0.06]],
        pos: [-0.13, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPintado' },
      { t: 'torno', perfil: [[0.001, -0.06], [0.058, -0.06], [0.062, -0.04], [0.062, 0.04], [0.058, 0.06], [0.001, 0.06]],
        pos: [0.13, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPintado' },
      // haste
      { t: 'cil', raio: 0.016, comp: 0.24, pos: [0.26, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // conexões de ar
      { t: 'cil', raio: 0.010, comp: 0.04, pos: [-0.13, 0.06, 0], mat: 'latao' },
      { t: 'cil', raio: 0.010, comp: 0.04, pos: [0.13, 0.06, 0], mat: 'latao' },
      { t: 'paraf', count: 4, raio: 0.045, comp: 0.008, pos: [-0.135, 0, 0], mat: 'latao' },
      { t: 'decal', texto: '63/16', largura: 0.07, pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0], fontePx: 14 },
    ],
  }
}

function valvula52(): Receita {
  return {
    id: 'valve_pneumatic_5_2',
    partes: [
      // bloco da válvula
      { t: 'rbox', size: [0.22, 0.07, 0.07], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.006 },
      // 2 solenoides
      { t: 'cil', raio: 0.026, comp: 0.06, pos: [-0.06, 0.06, 0], mat: 'plastico', cor: '#1C222B' },
      { t: 'cil', raio: 0.026, comp: 0.06, pos: [0.06, 0.06, 0], mat: 'plastico', cor: '#1C222B' },
      // conectores dos solenoides
      { t: 'cil', raio: 0.008, comp: 0.02, pos: [-0.06, 0.098, 0], mat: 'borracha' },
      { t: 'cil', raio: 0.008, comp: 0.02, pos: [0.06, 0.098, 0], mat: 'borracha' },
      // override manual (botões vermelhos)
      { t: 'cil', raio: 0.008, comp: 0.012, pos: [-0.06, 0.048, 0.02], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#F85149' },
      { t: 'cil', raio: 0.008, comp: 0.012, pos: [0.06, 0.048, 0.02], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#F85149' },
      // 5 saídas de ar embaixo
      { t: 'paraf', count: 5, raio: 0.075, comp: 0.02, pos: [0, -0.05, 0], mat: 'latao' },
      // exaustão nas laterais
      { t: 'cil', raio: 0.014, comp: 0.02, pos: [-0.115, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
      { t: 'cil', raio: 0.014, comp: 0.02, pos: [0.115, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
    ],
  }
}

function camera(): Receita {
  return {
    id: 'camera_ip',
    partes: [
      // corpo
      { t: 'rbox', size: [0.11, 0.075, 0.075], pos: [0, 0, 0], mat: 'plastico', radius: 0.006 },
      // barril da lente
      { t: 'cil', raio: 0.026, comp: 0.05, pos: [0.06, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#1C222B' },
      // anel de foco
      { t: 'cil', raio: 0.030, comp: 0.012, pos: [0.086, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      // lente (vidro)
      { t: 'cil', raio: 0.021, comp: 0.004, pos: [0.093, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'vidro', cor: '#0B0E13' },
      // suporte (bracket)
      { t: 'rbox', size: [0.06, 0.05, 0.09], pos: [-0.04, -0.055, 0], mat: 'acoEscovado', radius: 0.004 },
      // LED + ethernet atrás
      { t: 'cil', raio: 0.005, comp: 0.005, pos: [-0.01, 0.032, 0], mat: 'plastico', cor: '#3FB950' },
      { t: 'cil', raio: 0.012, comp: 0.03, pos: [-0.065, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
    ],
  }
}

function dinRail(comprimento = 1.0): Receita {
  const partes: any[] = []
  for (let i = 0; i < 6; i++) {
    const x = (i / 5 - 0.5) * comprimento
    partes.push({ t: 'rbox', size: [comprimento / 6 * 0.92, 0.007, 0.035], pos: [x, -0.008, 0], mat: 'aluminio', radius: 0.002 })
  }
  partes.push({ t: 'rbox', size: [comprimento, 0.015, 0.006], pos: [0, 0, -0.018], mat: 'aluminio', radius: 0.001 })
  partes.push({ t: 'rbox', size: [comprimento, 0.022, 0.004], pos: [0, 0.008, 0.014], mat: 'aluminio', radius: 0.001 })
  return { id: 'infra_din_rail', partes }
}

function vigaI(comprimento = 4.0): Receita {
  return {
    id: 'infra_i_beam',
    partes: [
      { t: 'rbox', size: [comprimento, 0.02, 0.06], pos: [0, 0.05, 0], mat: 'acoEscovado', radius: 0.004 },
      { t: 'rbox', size: [comprimento, 0.10, 0.012], pos: [0, 0, -0.024], mat: 'acoEscovado', radius: 0.002 },
      { t: 'rbox', size: [comprimento, 0.10, 0.012], pos: [0, 0, 0.024], mat: 'acoEscovado', radius: 0.002 },
    ],
  }
}

function pilar(altura = 2.5): Receita {
  return {
    id: 'infra_pillar',
    partes: [
      { t: 'rbox', size: [0.10, altura, 0.10], pos: [0, altura / 2, 0], mat: 'acoEscovado', radius: 0.006 },
      // base e topo
      { t: 'rbox', size: [0.24, 0.012, 0.24], pos: [0, 0.006, 0], mat: 'acoPintado', radius: 0.004 },
      { t: 'rbox', size: [0.18, 0.01, 0.18], pos: [0, altura - 0.005, 0], mat: 'acoPintado', radius: 0.004 },
      { t: 'paraf', count: 4, raio: 0.09, comp: 0.008, pos: [0, 0.016, 0], mat: 'latao' },
    ],
  }
}

function perfilAluminio(comprimento = 1.0): Receita {
  return {
    id: 'infra_profile_alu',
    partes: [
      { t: 'rbox', size: [comprimento, 0.04, 0.04], pos: [0, 0, 0], mat: 'aluminio', radius: 0.004 },
      // ranhuras (linhas escuras nas 4 faces)
      { t: 'rbox', size: [comprimento, 0.006, 0.004], pos: [0, 0.020, 0.012], mat: 'plastico', cor: '#0B0E13', radius: 0.001 },
      { t: 'rbox', size: [comprimento, 0.006, 0.004], pos: [0, 0.020, -0.012], mat: 'plastico', cor: '#0B0E13', radius: 0.001 },
      { t: 'rbox', size: [comprimento, 0.004, 0.006], pos: [0, 0.019, 0], rot: [0, 0, 0], mat: 'plastico', cor: '#0B0E13', radius: 0.001 },
      { t: 'rbox', size: [comprimento, 0.006, 0.004], pos: [0, -0.020, 0.012], mat: 'plastico', cor: '#0B0E13', radius: 0.001 },
      { t: 'rbox', size: [comprimento, 0.006, 0.004], pos: [0, -0.020, -0.012], mat: 'plastico', cor: '#0B0E13', radius: 0.001 },
    ],
  }
}

// ============================================================
// LOTE 3 — fecha o catálogo modelável
// ============================================================

function sensorCapacitivo(): Receita {
  return {
    id: 'sensor_capacitive',
    partes: [
      // corpo rosqueado (mais gordo que o indutivo)
      { t: 'cil', raio: 0.034, comp: 0.10, pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      { t: 'cil', raio: 0.036, comp: 0.005, pos: [0.028, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'aluminio' },
      { t: 'cil', raio: 0.036, comp: 0.005, pos: [-0.012, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'aluminio' },
      { t: 'cil', raio: 0.044, comp: 0.012, pos: [0.046, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'latao' },
      { t: 'cil', raio: 0.031, comp: 0.006, pos: [0.056, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
      { t: 'cil', raio: 0.015, comp: 0.032, pos: [-0.064, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      { t: 'cil', raio: 0.010, comp: 0.022, pos: [-0.088, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      { t: 'cil', raio: 0.005, comp: 0.005, pos: [0, 0.034, 0], mat: 'plastico', cor: '#42A5F5' },
      { t: 'decal', texto: 'M18', largura: 0.018, pos: [0, 0.038, 0], rot: [0, 0, 0], fontePx: 14 },
    ],
    portas: { pwr: [-0.099, 0.010, 0], out: [-0.099, -0.010, 0] },
  }
}

function botaoEmergencia(): Receita {
  return {
    id: 'sensor_emergency_button',
    partes: [
      // base de montagem (painel)
      { t: 'cil', raio: 0.048, comp: 0.02, pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPintado' },
      // colarinho amarelo (identidade do cogumelo)
      { t: 'cil', raio: 0.056, comp: 0.03, pos: [0, 0.024, 0], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#F2C200' },
      // botão vermelho
      { t: 'cil', raio: 0.048, comp: 0.04, pos: [0, 0.056, 0], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#D32F2F' },
      // bornes atrás
      { t: 'cil', raio: 0.006, comp: 0.05, pos: [0, 0.01, 0.045], rot: [Math.PI / 2, 0, 0], mat: 'latao' },
      { t: 'cil', raio: 0.006, comp: 0.05, pos: [0, 0.01, -0.045], rot: [Math.PI / 2, 0, 0], mat: 'latao' },
      { t: 'decal', texto: 'STOP', largura: 0.05, pos: [0, -0.021, 0.056], rot: [0, 0, 0], fontePx: 14 },
    ],
    portas: { nc: [0, -0.005, -0.058], no: [0, -0.005, 0.058] },
  }
}

function sensorNivel(): Receita {
  return {
    id: 'sensor_level',
    partes: [
      // cabeça
      { t: 'rbox', size: [0.09, 0.10, 0.09], pos: [0, 0, 0], mat: 'plastico', radius: 0.008 },
      { t: 'decal', texto: 'LVL', largura: 0.045, pos: [0, 0.02, 0.046], rot: [0, 0, 0], fontePx: 14 },
      // sonda longa (vai no tanque)
      { t: 'cil', raio: 0.010, comp: 0.55, pos: [0, -0.345, 0], mat: 'acoPolido' },
      { t: 'cil', raio: 0.014, comp: 0.05, pos: [0, -0.062, 0], mat: 'acoEscovado' },
      // prensa-cabo
      { t: 'cil', raio: 0.011, comp: 0.03, pos: [-0.055, 0.005, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      { t: 'cil', raio: 0.008, comp: 0.022, pos: [-0.08, 0.005, 0], rot: [0, 0, Math.PI / 2], mat: 'borracha' },
      { t: 'cil', raio: 0.004, comp: 0.004, pos: [0.04, 0.045, 0.045], mat: 'plastico', cor: '#3FB950' },
    ],
    portas: { pwr: [-0.091, 0.012, 0], out: [-0.091, -0.008, 0] },
  }
}

function celulaDeCarga(): Receita {
  return {
    id: 'sensor_load_cell',
    partes: [
      // bloco de aço (base de carga)
      { t: 'rbox', size: [0.16, 0.05, 0.10], pos: [0, -0.03, 0], mat: 'acoEscovado', radius: 0.006 },
      // furos de fixação
      { t: 'cil', raio: 0.010, comp: 0.06, pos: [-0.06, -0.03, 0.035], rot: [0, 0, 0], mat: 'plastico', cor: '#0B0E13' },
      { t: 'cil', raio: 0.010, comp: 0.06, pos: [0.06, -0.03, 0.035], rot: [0, 0, 0], mat: 'plastico', cor: '#0B0E13' },
      // strain gauges (colados no bloco)
      { t: 'rbox', size: [0.03, 0.002, 0.05], pos: [-0.035, 0.001, 0], mat: 'plastico', cor: '#1B5E20', radius: 0.001 },
      { t: 'rbox', size: [0.03, 0.002, 0.05], pos: [0.035, 0.001, 0], mat: 'plastico', cor: '#1B5E20', radius: 0.001 },
      // cabo do sensor
      { t: 'cil', raio: 0.008, comp: 0.06, pos: [0, 0.02, 0], rot: [0, Math.PI / 2, 0], mat: 'borracha' },
      { t: 'decal', texto: '50kg', largura: 0.05, pos: [0, -0.004, 0.052], rot: [0, 0, 0], fontePx: 14 },
    ],
    portas: { exc: [0.035, 0.02, 0], out: [0, 0.02, 0] },
  }
}

function cilindroHidraulico(): Receita {
  return {
    id: 'cylinder_hidraulic',
    partes: [
      // camisa de aço (mais reforçada que a pneumática)
      { t: 'torno', perfil: [[0.001, -0.16], [0.062, -0.16], [0.068, -0.13], [0.068, 0.13], [0.062, 0.16], [0.001, 0.16]],
        pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoEscovado' },
      { t: 'torno', perfil: [[0.001, -0.07], [0.070, -0.07], [0.075, -0.05], [0.075, 0.05], [0.070, 0.07], [0.001, 0.07]],
        pos: [-0.16, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPintado' },
      { t: 'torno', perfil: [[0.001, -0.07], [0.070, -0.07], [0.075, -0.05], [0.075, 0.05], [0.070, 0.07], [0.001, 0.07]],
        pos: [0.16, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPintado' },
      // haste cromada
      { t: 'cil', raio: 0.022, comp: 0.30, pos: [0.31, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // conexões hidráulicas (maiores)
      { t: 'cil', raio: 0.014, comp: 0.05, pos: [-0.16, 0.075, 0], mat: 'latao' },
      { t: 'cil', raio: 0.014, comp: 0.05, pos: [0.16, 0.075, 0], mat: 'latao' },
      { t: 'paraf', count: 4, raio: 0.055, comp: 0.01, pos: [-0.165, 0, 0], mat: 'latao' },
      { t: 'decal', texto: '80/20', largura: 0.08, pos: [0, 0.085, 0], rot: [Math.PI / 2, 0, 0], fontePx: 14 },
    ],
    portas: {
      port_a: [-0.16, 0.100, 0.015], port_b: [0.16, 0.100, 0.015],
      valve_a: [-0.16, 0.100, -0.015], valve_b: [0.16, 0.100, -0.015],
      sensor_front: [0.166, 0, 0], sensor_back: [-0.166, 0, 0],
    },
  }
}

function atuadorLinear(): Receita {
  return {
    id: 'actuator_linear',
    partes: [
      // corpo do atuador
      { t: 'cil', raio: 0.05, comp: 0.34, pos: [-0.10, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      // tampa traseira com conector
      { t: 'cil', raio: 0.055, comp: 0.02, pos: [-0.29, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },
      // haste
      { t: 'cil', raio: 0.014, comp: 0.26, pos: [0.16, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPolido' },
      // terminal dianteiro (olhal)
      { t: 'cil', raio: 0.026, comp: 0.008, pos: [0.30, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      { t: 'cil', raio: 0.008, comp: 0.008, pos: [0.30, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#0B0E13' },
      // caixa de comando no topo
      { t: 'rbox', size: [0.12, 0.06, 0.08], pos: [-0.10, 0.055, 0], mat: 'acoPintado', radius: 0.006 },
      { t: 'decal', texto: 'LA', largura: 0.04, pos: [-0.10, 0.085, 0], rot: [Math.PI / 2, 0, 0], fontePx: 12 },
    ],
    portas: {
      'v+': [-0.29, 0.02, 0.02], 'v-': [-0.29, 0.02, -0.02],
      extend: [-0.10, 0.090, 0.02], retract: [-0.10, 0.090, -0.02],
      position_cmd: [0.02, 0.090, 0.01],
    },
  }
}

function bombaDosadora(): Receita {
  return {
    id: 'pump_dosing',
    partes: [
      // cabeça de dosagem (onde se vê o diafragma)
      { t: 'cil', raio: 0.055, comp: 0.07, pos: [0.045, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },
      // corpo do diafragma
      { t: 'cil', raio: 0.07, comp: 0.05, pos: [-0.01, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      // motor elétrico atrás
      { t: 'cil', raio: 0.055, comp: 0.16, pos: [-0.13, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },
      // conexões de sucção/injeção
      { t: 'cil', raio: 0.012, comp: 0.06, pos: [0.05, 0.065, 0], rot: [0, Math.PI / 2, 0], mat: 'plastico', cor: '#26A69A' },
      { t: 'cil', raio: 0.012, comp: 0.06, pos: [0.05, -0.065, 0], rot: [0, Math.PI / 2, 0], mat: 'plastico', cor: '#26A69A' },
      // painel de controle
      { t: 'rbox', size: [0.06, 0.09, 0.03], pos: [-0.05, 0.075, 0], mat: 'plastico', radius: 0.004 },
      { t: 'decal', texto: 'mL/m', largura: 0.03, pos: [-0.05, 0.075, 0.016], rot: [0, 0, 0], fontePx: 12 },
    ],
    portas: {
      run: [-0.05, 0.122, 0.012], rate_cmd: [-0.05, 0.122, -0.012],
      fluid_in: [0.05, -0.097, 0], fluid_out: [0.05, 0.097, 0],
    },
  }
}

function softStarter(): Receita {
  return {
    id: 'soft_starter',
    partes: [
      // corpo (montado em painel como o VFD, mas sem display)
      { t: 'rbox', size: [0.22, 0.32, 0.18], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.01 },
      { t: 'rbox', size: [0.21, 0.31, 0.006], pos: [0, 0, 0.091], mat: 'acoEscovado', radius: 0.004 },
      { t: 'decal', texto: 'SOFT', largura: 0.07, pos: [0, 0.09, 0.094] },
      // potenciômetro de rampa
      { t: 'cil', raio: 0.022, comp: 0.014, pos: [0, -0.04, 0.096], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#1C222B' },
      // LEDs
      { t: 'cil', raio: 0.005, comp: 0.006, pos: [-0.06, -0.11, 0.096], mat: 'plastico', cor: '#3FB950' },
      { t: 'cil', raio: 0.005, comp: 0.006, pos: [-0.04, -0.11, 0.096], mat: 'plastico', cor: '#D29922' },
      // aletas atrás
      { t: 'aletas', count: 10, eixo: 'y', comp: 0.26, altura: 0.15, pos: [0, 0, -0.10], mat: 'aluminio' },
      // bornes de potência + controle
      { t: 'rbox', size: [0.18, 0.04, 0.08], pos: [0, -0.18, 0], mat: 'plastico', radius: 0.003 },
      { t: 'paraf', count: 6, raio: 0.06, comp: 0.01, pos: [0, -0.201, 0], mat: 'latao' },
      { t: 'rbox', size: [0.03, 0.34, 0.03], pos: [0.115, 0, 0.08], mat: 'acoEscovado', radius: 0.003 },
      { t: 'rbox', size: [0.03, 0.34, 0.03], pos: [-0.115, 0, 0.08], mat: 'acoEscovado', radius: 0.003 },
    ],
    portas: {
      l1: [-0.055, -0.202, 0.030], l2: [0, -0.202, 0.030], l3: [0.055, -0.202, 0.030],
      start: [0, 0.020, 0.100], stop: [0, -0.010, 0.100],
      run: [-0.04, 0.14, 0.096], bypass: [0.03, 0.14, 0.096],
    },
  }
}

function flange(): Receita {
  return {
    id: 'flange',
    partes: [
      // disco dos dois lados
      { t: 'cil', raio: 0.075, comp: 0.012, pos: [-0.008, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      { t: 'cil', raio: 0.075, comp: 0.012, pos: [0.008, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoEscovado' },
      // tubo de passagem
      { t: 'cil', raio: 0.038, comp: 0.05, pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado' },
      // parafusos do círculo
      { t: 'paraf', count: 4, raio: 0.058, comp: 0.014, pos: [-0.014, 0, 0], mat: 'latao' },
      { t: 'paraf', count: 4, raio: 0.058, comp: 0.014, pos: [0.014, 0, 0], mat: 'latao' },
    ],
    portas: { fluid_a: [-0.026, 0, 0], fluid_b: [0.026, 0, 0] },
  }
}

// ============================================================
// PACOTE PNEUMÁTICO/HIDRÁULICO
// ============================================================

function compressor(): Receita {
  return {
    id: 'air_source',
    partes: [
      // reservatório horizontal
      { t: 'torno', perfil: [[0.001, -0.18], [0.14, -0.18], [0.16, -0.14], [0.16, 0.14], [0.14, 0.18], [0.001, 0.18]],
        pos: [-0.10, 0, 0], rot: [Math.PI / 2, 0, 0], mat: 'acoPintado', cor: '#2F3B4C' },
      // pés do reservatório
      { t: 'rbox', size: [0.05, 0.10, 0.16], pos: [-0.28, -0.13, 0], mat: 'acoEscovado', radius: 0.008 },
      { t: 'rbox', size: [0.05, 0.10, 0.16], pos: [0.08, -0.13, 0], mat: 'acoEscovado', radius: 0.008 },
      // cabeçote do compressor (motor + bomba)
      { t: 'rbox', size: [0.20, 0.18, 0.20], pos: [0.24, 0, 0], mat: 'acoPintado', radius: 0.015 },
      { t: 'aletas', count: 8, eixo: 'x', comp: 0.18, altura: 0.20, pos: [0.24, 0, 0], mat: 'aluminio' },
      // manômetro
      { t: 'cil', raio: 0.04, comp: 0.02, pos: [0.24, 0.10, 0.11], rot: [Math.PI / 2, 0, 0], mat: 'acoEscovado' },
      { t: 'decal', texto: 'bar', largura: 0.03, pos: [0.24, 0.10, 0.125], rot: [0, 0, 0], fontePx: 12 },
      // saída de ar com registro
      { t: 'cil', raio: 0.022, comp: 0.08, pos: [0.16, 0.12, 0], rot: [0, Math.PI / 2, 0], mat: 'latao' },
      { t: 'cil', raio: 0.032, comp: 0.02, pos: [0.21, 0.12, 0], rot: [0, Math.PI / 2, 0], mat: 'latao' },
      // botão liga/desliga
      { t: 'cil', raio: 0.018, comp: 0.012, pos: [0.24, -0.10, 0.11], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#3FB950' },
      // plaqueta
      { t: 'decal', texto: 'AIR', largura: 0.07, pos: [0.24, 0.02, 0.105] },
    ],
    portas: {
      out: [0.25, 0.12, 0],
      run: [0.24, -0.086, 0.115],
      pressure_ok: [0.24, -0.086, 0.09],
    },
  }
}

function frl(): Receita {
  return {
    id: 'frl',
    partes: [
      // corpo em linha (torneira + filtro + lubrificador)
      { t: 'cil', raio: 0.05, comp: 0.16, pos: [0, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'acoPintado', cor: '#1E88E5' },
      // tigela do filtro (transparente, com água)
      { t: 'cil', raio: 0.055, comp: 0.14, pos: [-0.06, -0.10, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#3A4553' },
      { t: 'cil', raio: 0.045, comp: 0.06, pos: [-0.06, -0.155, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#29B6F6' },
      // regulador com botão de ajuste
      { t: 'rbox', size: [0.07, 0.07, 0.07], pos: [0.07, 0.06, 0], mat: 'acoPintado', radius: 0.006 },
      { t: 'cil', raio: 0.022, comp: 0.05, pos: [0.07, 0.115, 0], mat: 'plastico', cor: '#C0392B' },
      // manômetro do regulador
      { t: 'cil', raio: 0.028, comp: 0.012, pos: [-0.02, 0.075, 0.04], rot: [Math.PI / 2, 0, 0], mat: 'acoEscovado' },
      // lubrificador (copinho com óleo)
      { t: 'cil', raio: 0.035, comp: 0.08, pos: [0.13, -0.08, 0], rot: [0, 0, Math.PI / 2], mat: 'plastico', cor: '#3A4553' },
      // entradas
      { t: 'cil', raio: 0.022, comp: 0.05, pos: [-0.10, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'latao' },
      { t: 'cil', raio: 0.022, comp: 0.05, pos: [0.17, 0, 0], rot: [0, 0, Math.PI / 2], mat: 'latao' },
      { t: 'decal', texto: 'FRL', largura: 0.05, pos: [0.02, 0.055, 0.052], rot: [0, 0, 0], fontePx: 12 },
    ],
    portas: { in: [-0.128, 0, 0], out: [0.198, 0, 0] },
  }
}

function valvulaSolenoide(): Receita {
  return {
    id: 'valve_solenoid_3_2',
    partes: [
      // bloco
      { t: 'rbox', size: [0.18, 0.06, 0.06], pos: [0, 0, 0], mat: 'acoPintado', radius: 0.005 },
      // bobina (cilindro azul escuro com conector)
      { t: 'cil', raio: 0.024, comp: 0.08, pos: [-0.05, 0.055, 0], mat: 'plastico', cor: '#1A237E' },
      { t: 'cil', raio: 0.030, comp: 0.012, pos: [-0.05, 0.095, 0], mat: 'acoEscovado' },
      { t: 'cil', raio: 0.008, comp: 0.02, pos: [-0.05, 0.115, 0], mat: 'borracha' },
      // override manual (chave amarela)
      { t: 'cil', raio: 0.010, comp: 0.014, pos: [-0.05, 0.03, 0.02], rot: [Math.PI / 2, 0, 0], mat: 'plastico', cor: '#F2C200' },
      // conexões: in, out, escape
      { t: 'cil', raio: 0.013, comp: 0.05, pos: [-0.10, -0.05, 0], rot: [0, Math.PI / 2, 0], mat: 'latao' },
      { t: 'cil', raio: 0.013, comp: 0.05, pos: [0, -0.05, 0], rot: [0, Math.PI / 2, 0], mat: 'latao' },
      { t: 'cil', raio: 0.013, comp: 0.05, pos: [0.10, -0.05, 0], rot: [0, Math.PI / 2, 0], mat: 'latao' },
      { t: 'cil', raio: 0.018, comp: 0.02, pos: [0.10, -0.085, 0], rot: [0, Math.PI / 2, 0], mat: 'plastico', cor: '#0B0E13' },
      { t: 'decal', texto: '3/2', largura: 0.04, pos: [0.02, 0.033, 0], rot: [Math.PI / 2, 0, 0], fontePx: 12 },
    ],
    portas: {
      coil: [-0.05, 0.128, 0],
      in: [-0.10, -0.082, 0],
      out: [0, -0.082, 0],
      exhaust: [0.10, -0.098, 0],
    },
  }
}

// ============================================================
// CATÁLOGO
// ============================================================

export const RECEITAS: Record<string, Receita> = {
  motor_dc: pronta(motorDC()),
  motor_ac: pronta(motorAC()),
  motor_stepper: pronta(motorStepper()),
  motor_servo: pronta(motorServo()),
  sensor_photoelectric: pronta(sensorFotoeletrico()),
  sensor_photoelectric_receptor: pronta(receptorFotoeletrico()),
  sensor_inductive: pronta(sensorIndutivo()),
  sensor_limit_switch: pronta(chaveFimDeCurso()),
  sensor_temperature: pronta(sensorTemperatura()),
  sensor_pressure: pronta(sensorPressao()),
  sensor_encoder: pronta(encoder()),
  cylinder_pneumatic: pronta(cilindroPneumatico()),
  valve_pneumatic_5_2: pronta(valvula52()),
  camera_ip: pronta(camera()),
  clp_generic: pronta(clp()),
  vfd_generic: pronta(vfd()),
  infra_base_plate: pronta(basePlana()),
  infra_din_rail: pronta(dinRail()),
  infra_i_beam: pronta(vigaI()),
  infra_pillar: pronta(pilar()),
  infra_profile_alu: pronta(perfilAluminio()),
  sensor_capacitive: pronta(sensorCapacitivo()),
  sensor_emergency_button: pronta(botaoEmergencia()),
  sensor_level: pronta(sensorNivel()),
  sensor_load_cell: pronta(celulaDeCarga()),
  cylinder_hydraulic: pronta(cilindroHidraulico()),
  actuator_linear: pronta(atuadorLinear()),
  pump_dosing: pronta(bombaDosadora()),
  soft_starter: pronta(softStarter()),
  flange: pronta(flange()),
  air_source: pronta(compressor()),
  frl: pronta(frl()),
  valve_solenoid_3_2: pronta(valvulaSolenoide()),
}

/** bornes (já escalados) de um tipo — usados no spawn para o backend */
export function bornesDe(typeId: string): Record<string, [number, number, number]> {
  return RECEITAS[typeId]?.portas ?? {}
}

/** Receitas paramétricas: recalculadas a partir das propriedades do dispositivo */
export function receitaPara(typeId: string, properties: Record<string, any> = {}): Receita | null {
  if (typeId === 'infra_base_plate') {
    const r = basePlana(
      Number(properties.cols ?? 4),
      Number(properties.rows ?? 3),
      Number(properties.spacing_m ?? 1.0),
      Number(properties.thickness_mm ?? 10) / 1000,
    )
    return pronta(r)
  }
  if (typeId === 'infra_din_rail') return pronta(dinRail(Number(properties.length_m ?? 1.0)))
  if (typeId === 'infra_i_beam') return pronta(vigaI(Number(properties.length_m ?? 4.0)))
  if (typeId === 'infra_pillar') return pronta(pilar(Number(properties.height_m ?? 2.5)))
  if (typeId === 'infra_profile_alu') return pronta(perfilAluminio(Number(properties.length_m ?? 1.0)))
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
