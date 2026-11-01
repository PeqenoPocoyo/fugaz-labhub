# FUGAZ LABHUB — Arquitetura V2

> Reconstrução total do backend. Foco em simulação integrada, física otimizada e tudo conectado.

---

## 1. Princípios

1. **Tudo é um Nó** — dispositivos, massas, conexões, câmeras são nós em um grafo.
2. **Sinais fluem** — elétrica, fluidos, dados trafegam por portas conectadas.
3. **Física unificada** — uma interface comum para todos os domínios.
4. **Simulação determinística** — clock controlado, snapshots, replay.
5. **Otimizado** — rodar em Galaxy Book Go (4GB RAM, Snapdragon 7c Gen 2).
6. **Tudo integrável** — qualquer dispositivo conversa com qualquer outro via portas.

---

## 2. Estrutura de Pastas

```
backend/
├── app/
│   ├── main.py              # FastAPI app
│   ├── core/                # Núcleo do sistema
│   │   ├── settings.py      # Configurações
│   │   ├── event_bus.py     # Bus de eventos
│   │   ├── registry.py      # Registry universal de tipos
│   │   └── ids.py           # Geração de IDs
│   ├── sim/                 # Motor de simulação
│   │   ├── engine.py        # Loop principal
│   │   ├── world.py         # Mundo (grafo de nós)
│   │   ├── clock.py         # Relógio de simulação
│   │   └── snapshot.py      # Snapshots serializáveis
│   ├── physics/             # Física unificada
│   │   ├── base.py          # Interface PhysicsDomain
│   │   ├── electrical.py    # Elétrica (Ohm, Kirchhoff, nodal)
│   │   ├── fluid.py         # Fluidos (pneumática + hidráulica)
│   │   ├── mechanical.py    # Mecânica (cinemática, colisão)
│   │   ├── thermal.py       # Térmica (calor, estado)
│   │   ├── mass.py          # Massas (sólidos, líquidos, gases)
│   │   └── signal.py        # Sinais (ADC/DAC, filtros, PID)
│   ├── devices/             # Dispositivos
│   │   ├── base.py          # Device base + Port
│   │   ├── registry.py      # Registro de dispositivos
│   │   └── catalog/         # Catálogo JSON
│   ├── io/                  # Entrada/Saída e conexões
│   │   ├── graph.py         # Grafo de conexões
│   │   ├── ports.py         # Sistema de portas
│   │   └── bus.py           # Barramento de sinais
│   ├── vision/              # Visão computacional
│   │   ├── engine.py        # OpenCV engine
│   │   ├── detectors.py     # Detectores
│   │   └── camera.py        # Dispositivo câmera
│   ├── protocols/           # Protocolos industriais
│   │   ├── base.py          # Interface Protocol
│   │   ├── manager.py       # Gerenciador
│   │   ├── modbus.py        # ModBus TCP/RTU
│   │   ├── opcua.py         # OPC UA
│   │   └── serial.py        # Serial/USB
│   └── api/                 # REST + WebSocket
│       ├── world.py         # Endpoints do mundo
│       ├── devices.py       # Endpoints de dispositivos
│       ├── sim.py           # Endpoints de simulação
│       ├── vision.py        # Endpoints de visão
│       ├── protocols.py     # Endpoints de protocolos
│       └── ws.py            # WebSocket bidirecional
```

---

## 3. Modelo de Dados

### 3.1 Nó (Node)
Todo objeto no mundo é um nó:
```python
Node {
    id: str
    type: str              # ex: "plc_siemens_s7_1200", "esteira", "sensor"
    category: str          # ex: "plc", "actuator", "sensor", "structure", "mass"
    transform: Transform   # posição, rotação, escala
    ports: [Port]          # portas de conexão
    properties: dict       # propriedades configuráveis
    state: dict            # estado atual (runtime)
    physics: dict          # domínios de física aplicáveis
}
```

### 3.2 Porta (Port)
```python
Port {
    id: str
    direction: str         # "input", "output", "bidirectional"
    domain: str            # "electrical", "pneumatic", "hydraulic", "data", "signal"
    data_type: str         # "digital", "analog", "flow", "pressure"
    value: Any             # valor atual
    connected_to: str      # ID da porta conectada
}
```

### 3.3 Conexão (Connection)
```python
Connection {
    id: str
    from_port: str
    to_port: str
    domain: str            # domínio do sinal
    properties: dict       # ex: resistência do fio, diâmetro do tubo
}
```

### 3.4 Domínio de Física
```python
PhysicsDomain {
    name: str              # "electrical", "fluid", etc.
    step(dt, nodes, connections) -> signals
    validate(config) -> errors
}
```

---

## 4. Fluxo de Simulação

```
1. Clock.tick() → dt
2. Para cada domínio de física:
   - Coletar nós relevantes
   - Resolver equações
   - Propagar sinais pelas conexões
3. Atualizar estados dos nós
4. Executar behaviours (lógicas de dispositivo)
5. Emitir eventos (mudanças de estado)
6. Broadcast snapshot via WebSocket
```

---

## 5. Sistema de Behaviours

Cada dispositivo pode ter behaviours (lógicas):
```python
Behaviour {
    name: str
    trigger: str           # "on_tick", "on_signal", "on_event"
    condition: callable    # quando executar
    action: callable       # o que fazer
}
```

Exemplo —Sensor fotoelétrico:
```python
Behaviour(
    name="detect_object",
    trigger="on_tick",
    condition=lambda n: n.ports["emitter"].value > threshold,
    action=lambda n: n.ports["output"].set(True)
)
```

---

## 6. Integração com Protocolos

Cada dispositivo com conectividade expõe tags:
```python
TagMap {
    internal: str          # nome interno
    external: str          # endereço no protocolo
    direction: str         # "read", "write", "read_write"
    data_type: str
}
```

---

## 7. Visão Computacional

Câmeras são nós especiais:
```python
Camera {
    source: str            # "webcam:0", "rtsp://...", "file:..."
    resolution: (w, h)
    detectors: [Detector]  # contornos, cor, barcode, etc.
    outputs: [Port]        # portas de saída (detecções)
}
```

Detecções alimentam portas digitais/analógicas que outros dispositivos leem.

---

## 8. API

### REST
```
GET    /api/world              # Estado do mundo
POST   /api/world/reset        # Resetar mundo
GET    /api/devices            # Catálogo de dispositivos
POST   /api/devices/spawn      # Adicionar dispositivo
DELETE /api/devices/{id}       # Remover dispositivo
GET    /api/devices/{id}       # Detalhes do dispositivo
PATCH  /api/devices/{id}       # Atualizar propriedades
GET    /api/connections        # Listar conexões
POST   /api/connections        # Criar conexão
DELETE /api/connections/{id}   # Remover conexão
POST   /api/sim/start          # Iniciar simulação
POST   /api/sim/stop           # Parar simulação
POST   /api/sim/step           # Step manual
GET    /api/sim/state          # Estado da simulação
GET    /api/vision/cameras     # Listar câmeras
POST   /api/vision/detect      # Executar detecção
GET    /api/protocols          # Protocolos disponíveis
POST   /api/protocols/connect  # Conectar protocolo
```

### WebSocket
```
ws://host/ws/sim       # Snapshots de simulação (alta frequência)
ws://host/ws/events    # Eventos (dispositivo adicionado, conexão, etc.)
```

---

## 9. Otimização para Hardware Modesto

- **Física em passo fixo** (60 Hz) com accumulator
- **LOD de simulação** — nós distantes atualizam menos
- **Snapshots delta** — enviar apenas mudanças via WebSocket
- **Lazy loading** de dispositivos do catálogo
- **NumPy vetorizado** para cálculos em massa
- **Sem dependências pesadas** — apenas FastAPI, NumPy, OpenCV

---

## 10. Roadmap de Implementação

### Fase 1 — Núcleo (atual)
- [ ] core: settings, event_bus, registry, ids
- [ ] sim: clock, engine, world, snapshot
- [ ] devices: base, registry
- [ ] io: ports, graph, bus

### Fase 2 — Física
- [ ] physics: base, electrical, fluid, mechanical, thermal, mass, signal

### Fase 3 — Dispositivos
- [ ] Catálogo JSON de dispositivos
- [ ] Behaviours

### Fase 4 — Integração
- [ ] protocols
- [ ] vision
- [ ] api + ws

### Fase 5 — Frontend Novo
- [ ] Cena 3D, editor, integração total
