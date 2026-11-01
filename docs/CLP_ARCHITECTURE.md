# CLP Simulado — Arquitetura de Ecosistema

> Como simular um CLP completo (CPU + barramento + módulos + expansões) e integrar com softwares externos (TIA Portal, MasterTool, Allen Bradley, FATEK, etc.).

---

## 1. Conceito: Rack (Chassi)

Um CLP simulado é um **rack** que acomoda módulos em slots. A CPU é o módulo central que gerencia o barramento (backplane) e expõe a memória.

```
┌─────────────────────────────────────────────┐
│  RACK (Chassi)                              │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┐    │
│  │ CPU │ DI  │ DO  │ AI  │ AO  │ COM │    │
│  │ S0  │ S1  │ S2  │ S3  │ S4  │ S5  │    │
│  └──┬──┴──┬──┴──┬──┴──┬──┴──┬──┴──┬──┘    │
│     └─────┴─────┴─────┴─────┴─────┘        │
│           BARRAMENTO (Backplane)            │
└─────────────────────────────────────────────┘
```

---

## 2. Modelo de Dados

### 2.1 Rack
```python
Rack {
    id: str
    name: str
    model: str              # ex: "generic_rack_8slot", "generic_rack_4slot"
    slots: int              # número de slots disponíveis
    modules: [Module]       # módulos instalados
    bus: Backplane          # barramento
    memory: MemoryMap       # área de memória
}
```

### 2.2 Módulo
```python
Module {
    id: str
    type: str               # "cpu", "di_16", "do_16", "ai_8", "ao_4", "com_modbus_tcp", etc.
    slot: int               # posição no rack
    points: int             # número de pontos (canais)
    base_address: int       # endereço base na memória
    map: dict               # mapeamento ponto -> endereço
    config: dict            # parâmetros (range, resolução, etc.)
    state: dict             # estado runtime
}
```

### 2.3 MemoryMap (Área de Memória)
Modelo genérico inspirado em IEC 61131-3 + ModBus:
```python
MemoryMap {
    coils: [bool]           # Saídas digitais / bits (ModBus 0xxxx)
    discrete_inputs: [bool] # Entradas digitais / bits (ModBus 1xxxx)
    holding_registers: [int] # Registradores R/W (ModBus 4xxxx)
    input_registers: [int]  # Registradores R-only (ModBus 3xxxx)
    markers: [bool]         # Memória interna (%M)
    timers: [...]           # Temporizadores
    counters: [...]         # Contadores
}
```

**Endereçamento por módulo:**
Cada módulo ocupa uma faixa em uma área:
- `DI 16` → `discrete_inputs[base : base+16]`
- `DO 16` → `coils[base : base+16]`
- `AI 8` → `input_registers[base : base+8]`
- `AO 4` → `holding_registers[base : base+4]`

---

## 3. Barramento (Backplane)

O barramento é o "espaço" onde sinais trafegam entre CPU e módulos:
- **Dados**: leitura/escrita de I/Os
- **Energia**: alimentação 24V CC distribuída aos módulos
- **Diagnóstico**: estado de cada módulo (OK, falha, ausente)

```python
Backplane {
    voltage: float = 24.0   # V CC
    powered: bool = True
    modules_status: {slot: "ok" | "fault" | "absent"}
    scan_time: float = 0.001  # tempo de scan (ms)
}
```

---

## 4. Servidor de Protocolo (Integração Externa)

O CLP simulado expõe **servidores de protocolo** que softwares externos consomem:

```
┌──────────────────┐         ┌──────────────────┐
│  TIA Portal      │         │  CLP Simulado    │
│  (Siemens)       │◄────────│  Servidor        │
│  como CLIENTE    │ ProfiNet│  ProfiNet/S7     │
└──────────────────┘         └────────┬─────────┘
                                      │
┌──────────────────┐                  │
│  MasterTool      │◄─────────────────┤
│  (Altus)         │   ModBus TCP     │
│  como CLIENTE    │                  │
└──────────────────┘                  │
                                      │
┌──────────────────┐                  │
│  RSLogix/Studio  │◄─────────────────┤
│  (Rockwell)      │  EtherNet/IP     │
│  como CLIENTE    │                  │
└──────────────────┘                  │
```

### 4.1 Servidores Implementados
| Protocolo | Porta | Cliente |
|-----------|-------|---------|
| ModBus TCP | 502 | MasterTool (Altus), genéricos |
| ModBus RTU | serial | FATEK, Delta |
| OPC UA | 4840 | SCADA, TIA Portal |
| OPC DA | DCOM | Sistemas legacy |
| S7/PROFINET | 102 | TIA Portal (Siemens) — opcional |
| EtherNet/IP | 44818 | Allen Bradley — opcional |

### 4.2 Estratégia
O CLP simulado tem um `ProtocolServer` por protocolo habilitado. Todos leem/escrevem na mesma `MemoryMap`. Assim:
- TIA Portal conecta via OPC UA → lê coils/registers
- MasterTool conecta via ModBus TCP → lê coils/registers
- FATEK conecta via ModBus RTU → lê coils/registers

**Resultado**: múltiplos softwares veem o MESMO CLP simultaneamente.

---

## 5. Mapeamento de Ecosistema

### 5.1 CLP Genérico (mínimo)
```
Rack "CLP Genérico A" (4 slots)
├─ Slot 0: CPU genérica (ModBus TCP + OPC UA)
├─ Slot 1: DI 8 (entradas digitais 24V)
├─ Slot 2: DO 8 (saídas digitais 24V)
└─ Slot 3: COM ModBus TCP (porta 502)
```

### 5.2 CLP Expandido (médio)
```
Rack "CLP Genérico B" (8 slots)
├─ Slot 0: CPU genérica
├─ Slot 1: DI 16
├─ Slot 2: DI 16
├─ Slot 3: DO 16
├─ Slot 4: DO 16
├─ Slot 5: AI 8 (0-10V, 4-20mA configurável)
├─ Slot 6: AO 4
└─ Slot 7: COM ModBus TCP + OPC UA
```

### 5.3 CLP Avançado (com expansão ativa)
```
Rack Principal (8 slots) + Rack Expansão (8 slots)
├─ Principal Slot 0: CPU
├─ Principal Slot 1-4: I/Os mistos
├─ Principal Slot 7: Módulo de expansão ativa
└─ Expansão Slot 0-7: mais I/Os via barramento remoto
```

---

## 6. Integração com Dispositivos de Campo

Dispositivos de campo (sensores, atuadores) conectam-se às portas dos módulos:

```
Sensor fotoelétrico ──wire──► DI Slot 1, ponto 0
Motor DC ◄──wire── DO Slot 3, ponto 2
Inversor de freq. ◄──analógico── AO Slot 6, ponto 0
```

O grafo de conexões resolve:
- Sensor escreve em `discrete_inputs[addr]`
- CPU lê e "processa" (scan)
- CPU escreve em `coils[addr]`
- Atuador lê sua porta conectada ao coil

---

## 7. Fluxo de Scan (Ciclo do CLP)

```
1. Ler todas as entradas (DI, AI) → memória
2. Executar lógica (comportamentos dos módulos + behaviours do usuário)
3. Escrever todas as saídas (DO, AO) ← memória
4. Atualizar servidores de protocolo (clientes externos leem)
5. Repetir a cada scan_time (ex: 1ms)
```

---

## 8. Behaviours de CLP

O CLP não é programável em ladder, mas suporta **behaviours** (lógicas simples):
- `passthrough` — copiar entrada para saída
- `invert` — inverter entrada digital
- `scale` — escalar analógico (ex: 0-10V → 0-100%)
- `compare` — comparar analógico com setpoint, gerar saída digital
- `timer` — atraso/relé temporizador
- `counter` — contar pulsos

Estes behaviours são configuráveis via API, não via programa do CLP.

---

## 9. Softwares Externos — O que esperar

### TIA Portal (Siemens)
- Conecta via **PROFINET** ou **OPC UA**
- Vê o CLP simulado como dispositivo S7
- Lê/escrita em DBs (Data Blocks)

### MasterTool 3.71/3.77/4.0 (Altus)
- Conecta via **ModBus TCP** ou **ModBus RTU**
- Vê registradores %R/%D
- Comunicação mestre/escravo

### Studio 5000 / RSLogix (Allen Bradley)
- Conecta via **EtherNet/IP**
- Vé tags Controller-scoped

### FATEK
- Conecta via **ModBus RTU**
- Vê registradores R/D

**Nota**: Para ProfiNet/EtherNet/IP nativos, pode ser necessário simular os protocolos ou usar gateways. ModBus TCP/OPC UA são os mais universais.

---

## 10. Roadmap

- [ ] `devices/clp_rack.py` — Rack + Backplane + MemoryMap
- [ ] `devices/modules.py` — CPU, DI, DO, AI, AO, COM, expansão
- [ ] `protocols/server.py` — Servidor ModBus TCP integrado
- [ ] `protocols/opcua_server.py` — Servidor OPC UA integrado
- [ ] Behaviours de CLP (passthrough, scale, timer, counter)
- [ ] Catálogo de racks pré-montados
- [ ] Documentação de integração por software

---

*Última atualização: 30/10/2026*