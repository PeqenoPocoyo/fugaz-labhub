# Auditoria do catálogo de componentes

> Gerado por `tests/audit_catalog.py` — base para modelar todos os componentes.


## CLPs (1)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `clp_generic` | CLP | 1 | 1 | ✅ | 1 | ✅ receita |

## Sensores (12)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `sensor_photoelectric` | Sensor Fotoelétrico | 3 | 3 | ✅ | 1 | ✅ receita |
| `sensor_photoelectric_receptor` | Receptor Fotoelétrico | 3 | 3 | ✅ | 1 | ✅ receita |
| `sensor_inductive` | Sensor Indutivo | 2 | 2 | ✅ | 1 | ✅ receita |
| `sensor_capacitive` | Sensor Capacitivo | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_limit_switch` | Chave Fim de Curso | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_emergency_button` | Botão de Emergência | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_temperature` | Sensor de Temperatura | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_pressure` | Sensor de Pressão | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_level` | Sensor de Nível | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_load_cell` | Célula de Carga | 2 | 2 | ❌ | 1 | ✅ receita |
| `sensor_encoder` | Encoder | 4 | 4 | ❌ | 1 | ✅ receita |
| `flow_vortex` | Medidor de Vazão Vortex | 5 | 5 | ✅ | 1 | ❌ bloco |

## Atuadores (13)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `motor_dc` | Motor DC | 4 | 4 | ✅ | 1 | ✅ receita |
| `motor_ac` | Motor AC | 5 | 5 | ✅ | 1 | ✅ receita |
| `motor_stepper` | Motor Stepper | 7 | 7 | ✅ | 1 | ✅ receita |
| `motor_servo` | Motor Servo | 4 | 4 | ✅ | 1 | ✅ receita |
| `cylinder_pneumatic` | Cilindro Pneumático | 6 | 6 | ✅ | 1 | ✅ receita |
| `valve_pneumatic_5_2` | Válvula 5/2 | 7 | 7 | ❌ | 1 | ✅ receita |
| `cylinder_hydraulic` | Cilindro Hidráulico | 6 | 6 | ❌ | 1 | ✅ receita |
| `actuator_linear` | Atuador Linear | 6 | 6 | ❌ | 1 | ✅ receita |
| `conveyor_belt` | Esteira de Correia | 11 | 11 | ✅ | 1 | ❌ bloco |
| `conveyor_roller` | Esteira de Rolos | 8 | 8 | ✅ | 1 | ❌ bloco |
| `pump_centrifugal` | Motobomba Centrífuga | 5 | 5 | ✅ | 1 | ❌ bloco |
| `pump_dosing` | Bomba Dosadora | 5 | 5 | ✅ | 1 | ✅ receita |
| `valve_control` | Válvula de Controle | 4 | 4 | ❌ | 1 | ❌ bloco |

## Drives (2)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `vfd_generic` | Inversor de Frequência | 18 | 18 | ✅ | 1 | ✅ receita |
| `soft_starter` | Soft Starter | 7 | 7 | ❌ | 1 | ✅ receita |

## Transmissões (6)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `trans_gears` | Par de Engrenagens | 2 | 2 | ❌ | 1 | ❌ bloco |
| `trans_belt` | Correia + Polias | 2 | 2 | ❌ | 1 | ❌ bloco |
| `trans_chain` | Corrente | 2 | 2 | ❌ | 1 | ❌ bloco |
| `trans_coupling` | Acoplamento | 2 | 2 | ❌ | 1 | ❌ bloco |
| `trans_screw` | Fuso | 2 | 2 | ❌ | 1 | ❌ bloco |
| `trans_linear_actuator` | Atuador Linear Elétrico | 6 | 6 | ✅ | 1 | ❌ bloco |

## Visão (5)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `vision_tape` | Fita Colorida | 0 | 0 | ✅ | 0 | — passivo |
| `vision_marker` | Marcador de ID | 0 | 0 | ✅ | 0 | — passivo |
| `vision_target` | Alvo de Calibração | 0 | 0 | ✅ | 0 | — passivo |
| `vision_corner` | Canto de Referência | 0 | 0 | ✅ | 0 | — passivo |
| `camera_ip` | Câmera Industrial | 6 | 6 | — | 1 | ✅ receita |

## Infraestrutura (10)

| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |
|---|---|---|---|---|---|---|
| `infra_base_plate` | Base Plana | 0 | 0 | — | 0 | ✅ receita |
| `infra_i_beam` | Viga I | 0 | 0 | — | 0 | ✅ receita |
| `infra_pillar` | Pilar | 0 | 0 | — | 0 | ✅ receita |
| `infra_profile_alu` | Perfilado de Alumínio | 0 | 0 | — | 0 | ✅ receita |
| `infra_din_rail` | Trilho DIN 35mm | 0 | 0 | — | 0 | ✅ receita |
| `infra_conduit` | Eletroduto | 0 | 0 | — | 0 | — passivo |
| `infra_cable_tray` | Calha de Cabos | 0 | 0 | — | 0 | — passivo |
| `duct` | Duto Escalável | 2 | 2 | ✅ | 1 | ❌ bloco |
| `flange` | Flange | 2 | 2 | ✅ | 1 | ✅ receita |
| `tank` | Tanque | 4 | 4 | ✅ | 1 | ❌ bloco |

## Resumo

- **Tipos no catálogo:** 49
- **Com modelo (receita):** 30
- **Sem portas (passivos):** 11
- **Sem ponto de fixação (não-infra):** 18
- **Sem comportamento por tick:** 11
