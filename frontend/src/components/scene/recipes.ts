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
// CATÁLOGO
// ============================================================

export const RECEITAS: Record<string, Receita> = {
  motor_dc: motorDC(),
  motor_ac: motorAC(),
  motor_stepper: motorStepper(),
  motor_servo: motorServo(),
  sensor_photoelectric: sensorFotoeletrico(),
  sensor_photoelectric_receptor: receptorFotoeletrico(),
  sensor_inductive: sensorIndutivo(),
  sensor_limit_switch: chaveFimDeCurso(),
  sensor_temperature: sensorTemperatura(),
  sensor_pressure: sensorPressao(),
  sensor_encoder: encoder(),
  cylinder_pneumatic: cilindroPneumatico(),
  valve_pneumatic_5_2: valvula52(),
  camera_ip: camera(),
  clp_generic: clp(),
  vfd_generic: vfd(),
  infra_base_plate: basePlana(),
  infra_din_rail: dinRail(),
  infra_i_beam: vigaI(),
  infra_pillar: pilar(),
  infra_profile_alu: perfilAluminio(),
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
