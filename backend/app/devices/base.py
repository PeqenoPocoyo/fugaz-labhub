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
        }

    def __repr__(self):
        return f"<Device {self.id}: {self.name} ({self.category.value})>"
