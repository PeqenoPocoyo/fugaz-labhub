# Sistema de Posicionamento e Fixação — Fugaz LABHUB

> Base para modelar componentes, desenhar seus pontos de fixação, e montar infraestrutura com efeito magnético.

---

## 1. POR QUE ISSO EXISTE

Hoje o spawn posiciona em grade (enable). Mas quando os modelos 3D reais chegarem:
- Um motor terá uma **flange de base** e um **eixo** — pontos físicos de encaixe
- Uma esteira terá **pés** e um **eixo de entrada**
- Um CLP terá um **trilho DIN** (montagem em painel)

O encaixe não é "colocar em coordenada X". É **"o ponto de fixação P do dispositivo coincide com o slot M da infraestrutura"**.

---

## 2. MODELO DE DADOS

### 2.1 FixationPoint (ponto de fixação do dispositivo)
```python
FixationPoint {
    id: str                  # "flange_base", "eixo", "trilho_din", "pe_1"
    local_offset: (x,y,z)    # offset relativo à origem do dispositivo
    normal: (x,y,z)          # direção da superfície de montagem
    domain: str              # "mechanical" | "electrical" | "pneumatic" | "hydraulic"
    radius: float            # raio de captura do ímã
}
```

### 2.2 MountSlot (slot de montagem da infraestrutura)
```python
MountSlot {
    id: str                  # "slot_0", "slot_1"...
    position: (x,y,z)        # posição MUNDIAL (na infra)
    normal: (x,y,z)          # direção da superfície
    accepts: [domains]       # domínios aceitos
    occupied_by: str|None    # device_id que ocupou
}
```

### 2.3 Grid de posicionamento
```python
Grid {
    spacing: float           # 1.0 (metro), 0.1 (decímetro)
    origin: (x,y,z)
    snap_enabled: bool       # snap fino ao grid
    visible: bool            # render do grid
}
```

---

## 3. RESOLUÇÃO MAGNÉTICA (Magnetic Snap)

```
Ao mover dispositivo D com ponto de fixação P ativo:

1. Calcular posição mundial de P: worldPos = D.pos + P.local_offset
2. Para cada MountSlot M livre (mais próximo primeiro):
   - distância = |worldPos - M.position|
   - se distância < (P.radius + M.radius): CANDIDATO
3. Melhor candidato → SNAP:
   - Novo D.pos = M.position - P.local_offset  (rotacionado)
   - Nova D.rotation = alinha P.normal a M.normal
   - M.occupied_by = D.id
4. Feedback visual: anel verde no slot, dispositivo "inclina" em direção
```

**Resultado:** montagem tipo CAD — peças encaixam com precisão, sem coordenação manual.

---

## 4. BIBLIOTECA DE INFRAESTRUTURA

### 4.1 Estrutura (suporte)
| Elemento | MountSlots | Uso |
|----------|-----------|-----|
| Base plana | grade N×M | motores, bombas, CLPs |
| Viga I | slots lineares | suspensão, longo vão |
| Pilar | slots verticais | elevação |
| Perfilado alumínio (8020) | slots nas ranhuras | tudo (modular) |
| Trilho DIN | slots lineares | CLPs, relés, bornes |

### 4.2 Eletrodutos e Calhas (condução)
| Elemento | Conduz | Propriedades |
|----------|--------|--------------|
| Eletroduto (conduit) | cabos elétricos | diâmetro, material, comprimento |
| Calha (cable tray) | feixes de cabos | largura, altura, carga máx |
| Leito para cabos | cabos de potência | largura, separadores |
| Duto flexível | cabos em movimento | raio de curvatura |

### 4.3 Relação com os fios vivos
Quando um cabo (fio) é roteado, ele pode:
- **Livre**: curva bezier direta entre portas (atual)
- **Em eletroduto**: segue o caminho do duto (waypoints)
- **Em calha**: correm paralelos no leito

Isso permite visualizar **eletrodutos e calhas com os cabos dentro** — riqueza visual real.

---

## 5. FLUXO DE MONTAGEM (UX)

1. Arrastar **Base plana** para a bancada
2. Arrastar **Motor DC** → próximo à base, o **anel magnético** aparece no slot livre
3. Soltar → motor **encaixa** na flange (posição/rotação exatas)
4. Arrastar **CLP** → encaixa no **Trilho DIN**
5. Conectar cabo do CLP ao motor → cabo **entra no eletroduto** visualmente

---

## 6. IMPLEMENTAÇÃO (fases)

- [x] `World.next_slot_position()` — posicionamento em grade (enable)
- [ ] `FixationPoint` + `MountSlot` (modelos)
- [ ] `MagneticSystem` — resolvedor de snap
- [ ] Dispositivos ganham `fixation_points` (motor: flange+eixo; CLP: trilho DIN)
- [ ] Biblioteca de infra: base, viga, pilar, trilho DIN, eletroduto, calha
- [ ] Endpoints: `/api/fixation/snap`, `/api/infra/spawn`
- [ ] UI: anéis magnéticos, preview de encaixe, highlight de slots livres

---

## 7. ESCALABILIDADE PARA MODELOS 3D

Quando os modelos chegarem, cada malha (mesh) terá marcadores nomeados:
```
motor.mesh → #flange_base (FixationPoint)
motor.mesh → #eixo (FixationPoint)
base.mesh  → #slot_A0, #slot_A1... (MountSlot)
```
OAttachment system é **geometry-agnostic**: funciona com cubos hoje e malhas reais amanhã.

---

*Última atualização: 30/10/2026*