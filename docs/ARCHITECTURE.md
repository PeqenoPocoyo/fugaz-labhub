# Arquitetura do FUGAZ LABHUB

## 1. Visão Geral do Sistema

O Fugaz LABHUB é uma aplicação **full-stack híbrida** composta por:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Three.js)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ 2.5D     │ │ Circuit  │ │ Device   │ │ Protocol     │  │
│  │ Renderer │ │ Editor   │ │ Library  │ │ Config UI    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       │            │            │              │           │
│  ┌────┴────────────┴────────────┴──────────────┴───────┐   │
│  │              Zustand State Store                    │   │
│  └────────────────────┬───────────────────────────────┘   │
│                       │ WebSocket                         │
├───────────────────────┼─────────────────────────────────────┤
│                       │                                     │
│  ┌────────────────────┴───────────────────────────────┐   │
│  │              BACKEND (FastAPI + Python)              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐  │   │
│  │  │ Physics  │ │ Protocol │ │ Vision   │ │ Sim  │  │   │
│  │  │ Engine   │ │ Manager  │ │ (OpenCV) │ │ Core │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘  │   │
│  │       │            │            │          │       │   │
│  │  ┌────┴────────────┴────────────┴──────────┴───┐   │   │
│  │  │           Device Registry                    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────┴───────────────────────────────┐   │
│  │           Industrial Network (Ethernet/Serial)      │   │
│  │  ModBus TCP/IP │ ProfiNet │ OPC UA │ USB │ RTU    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. Módulos do Sistema

### 2.1 Frontend

#### 2.1.1 Engine 2.5D (Three.js)
- **Camera**: Isométrica ortográfica com rotação/zoom
- **Renderers**: 
  - `CircuitRenderer` — fios, componentes, conexões
  - `SceneRenderer` — infraestrutura, layout, objetos
  - `OverlayRenderer` — camadas de informação (tags, valores)
- **Layers**: Múltiplas camadas com z-index e opacidade
- **Interaction**: Drag & drop, seleção, rotação, conexão

#### 2.1.2 Componentes UI
- `DevicePalette` — paleta de dispositivos arrastáveis
- `PropertyPanel` — propriedades do dispositivo selecionado
- `LayerManager` — gerenciamento de camadas
- `ProtocolConfig` — configuração de protocolos
- `SceneToolbar` — ferramentas de edição
- `StatusBar` — status da simulação e conexões

#### 2.1.3 Estado (Zustand)
- `useSceneStore` — estado da cena (objetos, conexões)
- `useDeviceStore` — biblioteca de dispositivos
- `useProtocolStore` — configuração de protocolos
- `useSimulationStore` — estado da simulação
- `useLayerStore` — camadas de visualização

### 2.2 Backend

#### 2.2.1 Motor de Simulação (`core/`)
- `SimulationEngine` — loop principal de simulação
- `TimeManager` — gerenciamento de tempo (real/simulado)
- `EventBus` — eventos entre módulos
- `StateSerializer` — serialização/deserialização de estado

#### 2.2.2 Física (`physics/`)
- `ElectricalEngine` — análise de circuitos (nodal, mesh)
- `PneumaticEngine` — fluidos compressíveis
- `HydraulicEngine` — fluidos incompressíveis
- `MechanicalEngine` — cinemática, dinâmica
- `ThermalEngine` — transferência de calor

#### 2.2.3 Dispositivos (`devices/`)
- `DeviceRegistry` — registro de todos os dispositivos
- `DeviceFactory` — criação de instâncias
- `DeviceModel` — modelo base de dispositivo
- `DeviceConfig` — configuração de fábrica

#### 2.2.4 Protocolos (`protocols/`)
- `ProtocolManager` — gerenciador de protocolos
- `ModBusTCP` — cliente/servidor ModBus TCP
- `ProfiNet` — comunicação ProfiNet
- `OPCUA` — cliente/servidor OPC UA
- `OPCDA` — cliente OPC DA (via COM)
- `SerialUSB` — comunicação serial/USB

#### 2.2.5 Visão (`vision/`)
- `VisionEngine` — processamento de imagem
- `ObjectDetector` — detecção de objetos (OpenCV)
- `CameraManager` — gerenciamento de câmeras
- `TrackingEngine` — rastreamento de objetos

### 2.3 Comunicação

#### WebSocket (Tempo Real)
```
ws://host:port/ws/simulation  — estado da simulação
ws://host:port/ws/protocol    — eventos de protocolo
ws://host:port/ws/vision      — frames de visão
```

#### REST API
```
GET  /api/devices              — lista de dispositivos
GET  /api/devices/{id}         — detalhes do dispositivo
POST /api/scene                — salvar cena
GET  /api/scene/{id}           — carregar cena
POST /api/simulation/start     — iniciar simulação
POST /api/simulation/stop      — parar simulação
GET  /api/protocols            — protocolos disponíveis
POST /api/protocols/config     — configurar protocolo
```

### 2.4 Camadas de Visualização

| Camada | Descrição | Elementos |
|--------|-----------|-----------|
| **L0 - Infraestrutura** | Layout físico, estrutura | Paredes, pisos, esteiras, suportes |
| **L1 - Circuitos** | Conexões elétricas/pneumáticas | Fios, tubos, dutos |
| **L2 - Dispositivos** | Componentes individuais | Sensores, atuadores, CLPs |
| **L3 - Lógica** | Programação, tags, variáveis | Lógica ladder, blocos funcionais |
| **L4 - Dados** | Valores, status, alarmes | Tags, valores analógicos/digitais |
| **L5 - Visão** | Câmeras, detecção | Frames, bounding boxes |

### 2.5 Sistema de Dispositivos

Cada dispositivo é definido por um arquivo JSON/YAML com:

```json
{
  "id": "siemens_s7_1200",
  "name": "Siemens S7-1200 CPU",
  "category": "plc",
  "manufacturer": "Siemens",
  "model": "CPU 1214C DC/DC/DC",
  "image": "assets/devices/siemens_s7_1200.png",
  "dimensions": { "width": 100, "height": 150, "depth": 80 },
  "ports": [
    { "id": "di_0", "type": "digital_input", "label": "DI0" },
    { "id": "do_0", "type": "digital_output", "label": "DO0" },
    { "id": "ai_0", "type": "analog_input", "label": "AI0", "range": [0, 10] },
    { "id": "eth_0", "type": "ethernet", "label": "PROFINET" }
  ],
  "properties": {
    "voltage": { "value": 24, "unit": "V", "type": "dc" },
    "current": { "value": 2, "unit": "A" },
    "memory": { "value": 50, "unit": "KB" }
  },
  "factory_defaults": {
    "ip_address": "192.168.0.1",
    "subnet_mask": "255.255.255.0"
  },
  "protocols": ["profinet", "modbus_tcp"],
  "physics": {
    "electrical": { "resistance": 0, "capacitance": 0 }
  }
}
```

### 2.6 Física de Simulação

#### Elétrica
- **Lei de Ohm**: V = I × R
- **Lei de Kirchhoff**: ΣV = 0 (malhas), ΣI = 0 (nós)
- **Análise nodal**: resolução de sistemas lineares
- **Transientes**: RC, RL, RLC

#### Pneumática
- **Lei de Boyle-Mariotte**: P₁V₁ = P₂V₂
- **Fluxo compressível**: equação de continuidade
- **Força de cilindro**: F = P × A

#### Hidráulica
- **Equação de Bernoulli**: P + ½ρv² + ρgh = const
- **Lei de Pascal**: transmissão de pressão
- **Vazão**: Q = A × v

#### Mecânica
- **Cinemática**: posição, velocidade, aceleração
- **Dinâmica**: F = ma, τ = Iα
- **Colisão**: detecção e resposta

### 2.7 Visão Computacional

```python
# Pipeline de visão
Camera → Frame Capture → Preprocessing → Detection → Tracking → Output
```

- **Detecção de objetos**: YOLO, Haar cascades, contornos
- **Tracking**: SORT, DeepSORT
- **Calibração**: intrínseca/extrínseca
- **Integração**: frames → cena 2.5D

---

## 3. Escalabilidade

### 3.1 Adição de Dispositivos
1. Criar arquivo JSON em `backend/app/devices/catalog/`
2. Adicionar imagem em `frontend/public/assets/devices/`
3. Registrar no `DeviceRegistry`
4. O frontend carrega automaticamente via API

### 3.2 Adição de Protocolos
1. Criar módulo em `backend/app/protocols/`
2. Implementar interface `ProtocolBase`
3. Registrar no `ProtocolManager`
4. Adicionar UI de configuração

### 3.3 Adição de Física
1. Criar módulo em `backend/app/physics/`
2. Implementar interface `PhysicsEngine`
3. Registrar no `SimulationEngine`

---

## 4. Segurança

- **Autenticação**: JWT tokens
- **Autorização**: RBAC (Role-Based Access Control)
- **Rede**: TLS para comunicação externa
- **Validação**: Pydantic para todos os inputs
- **Rate limiting**: por IP e por usuário

---

## 5. Performance

- **Frontend**: 60 FPS com 1000+ objetos
- **Backend**: 1000 Hz de simulação
- **WebSocket**: < 10ms de latência
- **Protocolos**: polling configurável (1-1000ms)