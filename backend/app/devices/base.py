"""
Device Base — Modelo base de dispositivos

Todo dispositivo no mundo é um nó com:
- transform (posição, rotação, escala)
- ports (portas de conexão)
- properties (parâmetros configuráveis)
- state (estado runtime)
- behaviours (lógicas reativas)
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable, Awaitable
from enum import Enum
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.core.ids import ids


class DeviceCategory(str, Enum):
    PLC = "plc"
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    DRIVE = "drive"
    MICROCONTROLLER = "microcontroller"
    STRUCTURE = "structure"
    MASS = "mass"
    VISION = "vision"
    POWER = "power"
    HMI = "hmi"
    TRANSMISSION = "transmission"
    FIXATION = "fixation"


class Trigger(str, Enum):
    ON_TICK = "on_tick"          # a cada passo de simulação
    ON_START = "on_start"        # ao iniciar simulação
    ON_STOP = "on_stop"          # ao parar simulação
    ON_SIGNAL = "on_signal"      # quando um sinal muda
    ON_EVENT = "on_event"        # quando um evento ocorre


@dataclass
class Behaviour:
    """Lógica reativa de um dispositivo."""
    name: str
    trigger: Trigger = Trigger.ON_TICK
    condition: Optional[Callable[["Device"], bool]] = None
    action: Optional[Callable[["Device", float], None]] = None
    enabled: bool = True

    def should_run(self, device: "Device") -> bool:
        if not self.enabled:
            return False
        if self.condition is None:
            return True
        return self.condition(device)

    def run(self, device: "Device", dt: float):
        if self.action:
            self.action(device, dt)


@dataclass
class Transform:
    """Transformação espacial."""
    position: tuple = (0.0, 0.0, 0.0)
    rotation: tuple = (0.0, 0.0, 0.0)  # graus
    scale: tuple = (1.0, 1.0, 1.0)

    def to_dict(self) -> dict:
        return {"position": self.position, "rotation": self.rotation, "scale": self.scale}


class Device:
    """Modelo base de dispositivo."""

    def __init__(
        self,
        type_id: str,
        name: str = "",
        category: DeviceCategory = DeviceCategory.SENSOR,
        properties: dict = None,
        ports: List[Port] = None,
        behaviours: List[Behaviour] = None,
        metadata: dict = None,
    ):
        self.id = ids.tagged(type_id.split("_")[0])
        self.type_id = type_id
        self.name = name or type_id
        self.category = category
        self.transform = Transform()
        self.ports: Dict[str, Port] = {}
        for p in (ports or []):
            self.add_port(p)
        # Âncora 3D de cada porta (offset LOCAL relativo à origem do dispositivo).
        # Fonte única de verdade: o modelo 3D e a fiação usam a mesma posição.
        self.port_anchors: Dict[str, tuple] = {}
        self.properties: Dict[str, Any] = properties or {}
        self.state: Dict[str, Any] = {"active": False, "powered": False, "error": False, "error_msg": ""}
        self.behaviours: List[Behaviour] = behaviours or []
        self.metadata: Dict[str, Any] = metadata or {}
        self.layer: str = "devices"

        # ---- Fixação e infraestrutura ----
        from app.devices.fixation import fixations_for
        self.fixations = fixations_for(type_id)   # pontos de montagem deste dispositivo
        self.slots: List[Any] = []                # vagas (só infraestrutura)
        self.conduit_path: Any = None             # trajeto de duto/calha (só condução)

    def place(self, position: tuple):
        """
        Posiciona o dispositivo e arrasta seus elementos dependentes
        (slots de montagem e trajeto de duto/calha) junto — slots são
        definidos em coordenadas relativas ao dispositivo.
        """
        px, py, pz = position
        self.transform.position = (px, py, pz)
        for slot in getattr(self, "slots", []):
            lx, ly, lz = slot.local_offset
            slot.position = (px + lx, py + ly, pz + lz)
        cp = getattr(self, "conduit_path", None)
        if cp and getattr(self, "_conduit_local", None):
            self.conduit_path = [
                (px + l[0], py + l[1], pz + l[2]) for l in self._conduit_local
            ]

    # ---------- Âncoras das portas ----------

    def layout_portas(self, raio: float = 0.35):
        """
        Distribui as portas ao redor do dispositivo quando o tipo não
        declara âncoras explícitas. Convenção: entradas p/ trás (-X),
        saídas p/ frente (+X), alimentação em cima (+Y), dados atrás (-Z).
        """
        if self.port_anchors:
            return
        grupos = {"input": [], "output": [], "power": [], "bidirectional": []}
        for pid, port in self.ports.items():
            grupo = port.direction.value if port.direction.value in grupos else "bidirectional"
            grupos[grupo].append(pid)

        def espalhar(ids: List[str], eixo: str, sinal: float, base: tuple):
            for i, pid in enumerate(ids):
                t = (i + 0.5) / max(1, len(ids))
                x, y, z = base
                if eixo == "x":
                    y = (t - 0.5) * raio
                elif eixo == "y":
                    x = (t - 0.5) * raio
                else:
                    x = (t - 0.5) * raio
                self.port_anchors[pid] = (
                    x + sinal * raio if eixo == "x" else x,
                    y + sinal * 0.45 if eixo == "y" else y,
                    z + sinal * raio if eixo == "z" else z,
                )

        espalhar(grupos["input"], "x", -1, (0, 0, 0))
        espalhar(grupos["output"], "x", +1, (0, 0, 0))
        espalhar(grupos["power"], "y", +1, (0, 0, 0))
        espalhar(grupos["bidirectional"], "z", -1, (0, -0.1, 0))

    # ---------- Portas ----------

    def add_port(self, port: Port):
        """Adiciona uma porta ao dispositivo (com ID qualificado único)."""
        port.device_id = self.id
        port.qualified_id = f"{self.id}_{port.id}"
        self.ports[port.id] = port

    def refresh_qualified_ids(self):
        """Atualiza IDs qualificados (usar se self.id mudou)."""
        for port in self.ports.values():
            port.device_id = self.id
            port.qualified_id = f"{self.id}_{port.id}"

    def get_port(self, port_id: str) -> Optional[Port]:
        """Obtém porta por ID."""
        return self.ports.get(port_id)

    def read_port(self, port_id: str) -> Any:
        """Lê valor de uma porta."""
        port = self.ports.get(port_id)
        return port.value if port else None

    def write_port(self, port_id: str, value: Any):
        """Escreve valor em uma porta."""
        port = self.ports.get(port_id)
        if port:
            port.write(value)

    # ---------- Propriedades ----------

    def get_property(self, key: str, default: Any = None) -> Any:
        """Obtém propriedade."""
        return self.properties.get(key, default)

    def set_property(self, key: str, value: Any):
        """Define propriedade."""
        self.properties[key] = value

    # ---------- Estado ----------

    def power_on(self):
        self.state["powered"] = True
        self.state["active"] = True

    def power_off(self):
        self.state["powered"] = False
        self.state["active"] = False

    def set_error(self, msg: str):
        self.state["error"] = True
        self.state["error_msg"] = msg

    def clear_error(self):
        self.state["error"] = False
        self.state["error_msg"] = ""

    # ---------- Behaviours ----------

    def add_behaviour(self, behaviour: Behaviour):
        self.behaviours.append(behaviour)

    def update(self, dt: float):
        """Executa behaviours a cada tick."""
        for behaviour in self.behaviours:
            if behaviour.trigger == Trigger.ON_TICK and behaviour.should_run(self):
                behaviour.run(self, dt)

    def on_start(self):
        """Chamado ao iniciar simulação."""
        self.power_on()
        for b in self.behaviours:
            if b.trigger == Trigger.ON_START and b.should_run(self):
                b.run(self, 0.0)

    def on_stop(self):
        """Chamado ao parar simulação."""
        for b in self.behaviours:
            if b.trigger == Trigger.ON_STOP and b.should_run(self):
                b.run(self, 0.0)
        self.power_off()

    # ---------- Serialização ----------

    def to_dict(self) -> dict:
        # garante âncoras das portas (auto-layout se o tipo não declarou)
        if self.ports and not self.port_anchors:
            self.layout_portas()
        return {
            "id": self.id,
            "type_id": self.type_id,
            "name": self.name,
            "category": self.category.value,
            "transform": self.transform.to_dict(),
            "ports": {k: v.to_dict() for k, v in self.ports.items()},
            "properties": self.properties,
            "state": self.state,
            "layer": self.layer,
            "metadata": self.metadata,
            # Fixação / infraestrutura
            "fixations": [f.to_dict() for f in self.fixations],
            "slots": [s.to_dict() for s in self.slots],
            "conduit_path": [list(p) for p in self.conduit_path] if self.conduit_path else None,
            # Âncora 3D de cada porta (offset local ao dispositivo)
            "port_anchors": {k: list(v) for k, v in self.port_anchors.items()},
        }

    def __repr__(self):
        return f"<Device {self.id}: {self.name} ({self.category.value})>"
