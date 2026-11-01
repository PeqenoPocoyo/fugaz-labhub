# FUGAZ LABHUB

> Simulador/laboratório industrial 3D — composição de cenas, protocolos industriais e simulação em tempo real.

O LABHUB é uma bancada virtual onde dispositivos industriais **reais** (CLPs, sensores, atuadores, drives, esteiras, bombas) são montados com encaixe magnético, conectados por domínios físicos (elétrica, pneumática, hidráulica, mecânica, dados) e simulados a 60 Hz — com integração a **ModBus TCP/RTU**, **OPC UA** e **TIA Portal / MasterTool / Allen Bradley / FATEK** pelos CLPs.

---

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Python 3.11+, FastAPI, Pydantic, WebSocket, loguru, OpenCV |
| Frontend | React 18, TypeScript, Three.js (react-three-fiber + drei), Zustand, Tailwind CSS, Vite |
| Simulação | Motor próprio de passo fixo (60 Hz), grafo de conexões, trens de força |
| Protocolos | ModBus TCP/RTU, OPC UA (degradação graciosa se ausentes) |

---

## Quick start

### 1. Backend (porta 8000)

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Abrir <http://localhost:5173>.

### 3. Testes

```bash
python -m pytest tests/ -q
```

---

## O que existe hoje

**48 tipos de dispositivo** em 8 categorias:

- **Sensores** (10) — fotelétrico, indutivo, temperatura, pressão, célula de carga, encoder…
- **Atuadores** (8) — motores DC/AC/stepper/servo, cilindros, válvulas
- **Drives** (2) — VFD parametrizável (rampas, polos, falhas), soft starter
- **CLPs** — rack modular com módulos DI/DO/AI/AO/RTD/COM, mapa de memória, scan cycle, roteamento e servidores ModBus/OPC UA
- **Esteiras escaláveis** — grade `cells_x × cells_y` (ex.: 52×4), velocidade derivada do RPM do eixo (`v = RPM·π·D/60`)
- **Transmissões** (6) — engrenagens, correia+polias, corrente, acoplamento, fuso, atuador linear
- **Visão computacional** — fitas coloridas, marcadores de ID, alvo de calibração, canto de referência, câmera de **vista fixa** com projeção de detecções (bbox normalizada)
- **Fluidos** — motobomba (leis de afinidade), bomba dosadora, medidor vortex (von Kármán), válvula de controle (Cv), duto escalável com flanges, tanque com nível
- **Infraestrutura** — base plana, viga I, pilar, perfilado de alumínio, trilho DIN, eletroduto, calha de cabos

**Sistemas centrais:**

- **Encaixe magnético** — `FixationPoint` + `MountSlot` + `MagneticSystem`: peças encaixam com posição/rotação exatas (estilo CAD)
- **Trem de força** — motor → transmissões → carga, resolvido a cada tick (`ω_out = ω_in / razão`)
- **Grafo de conexões** — propagação por domínio com perdas (resistência, queda de pressão)
- **Protocolos** — memória do CLP exposta a software externo

---

## API

| Endpoint | Descrição |
|---|---|
| `GET /api/world/` | Estado completo do mundo |
| `POST /api/devices/spawn` | Criar dispositivo por `type_id` |
| `POST /api/world/connect` | Conectar portas por ID qualificado |
| `POST /api/devices/snap` | Encaixe magnético em slot livre |
| `POST /api/world/drivetrain` | Ligar motor → transmissões → carga |
| `POST /api/devices/{id}/resize` | Redimensionar esteira (X×Y) ou duto (segmentos) |
| `GET /api/vision/references/{camera_id}` | Detecções projetadas na vista fixa |
| `WS /ws/sim` | Streaming de snapshots em tempo real |

Documentação interativa: <http://localhost:8000/docs>

---

## Estrutura

```
FUGAZ LABHUB/
├── backend/
│   └── app/
│       ├── devices/      # 48 tipos: sensores, atuadores, drives, CLP,
│       │                 # transmissões, visão, fluidos, infraestrutura
│       ├── sim/          # engine (60Hz), world, clock, drivetrains
│       ├── io/           # ports (6 domínios), graph de conexões
│       ├── api/          # REST + WebSocket
│       ├── protocols/    # ModBus TCP/RTU, OPC UA
│       └── vision/       # engine + câmera OpenCV
├── frontend/
│   └── src/
│       ├── components/   # scene (malhas), drawers, diagnostics, command
│       ├── hooks/        # useWorldSync (poll 400ms), useSimulation (WS)
│       └── store/        # sceneStore (zustand)
├── tests/                # test_v2 (núcleo) + test_v3 (transmissão/visão/fluidos)
└── docs/                 # arquitetura, CLP, posicionamento, UX
```

---

## Roadmoap

- [ ] Malhas 3D reais substituindo os blocos (marcadores nomeados por ponto de fixação)
- [ ] Motor de física para massas (sólidos, líquidos, gases, granéis)
- [ ] Dinâmica de fluidos completa (hidrodinâmica, termodinâmica)

---

## Licença

Projeto privado — © Pequeno Pocoyo.
