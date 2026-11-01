"""
Ports — Sistema de portas de conexão

Todo dispositivo expõe portas. Portas são pontos de conexão por onde
sinais (elétrica, fluídos, dados) entram e saem.

Domínios de porta:
- electrical: fios, alimentação, sinais elétricos
- pneumatic: ar comprimido
- hydraulic: fluídos incompressíveis
- data: dados (ModBus, OPC UA, etc.)
- signal: sinais analógicos/digitais genéricos
"""
from dataclasses import dataclass, field
from typing import Any, Optional, Dict
from enum import Enum


class PortDirection(str, Enum):
    INPUT = "input"
    OUTPUT = "output"
    BIDIRECTIONAL = "bidirectional"


class PortDomain(str, Enum):
    ELECTRICAL = "electrical"
    PNEUMATIC = "pneumatic"
    HYDRAULIC = "hydraulic"
    DATA = "data"
    SIGNAL = "signal"
    MECHANICAL = "mechanical"   # eixos, torque, RPM (trem de força)
    FLUID = "fluid"             # vazão de fluido (água, óleo, granulado)
    OPTICAL = "optical"         # dado óptico (câmera → detecções)


class PortDataType(str, Enum):
    DIGITAL = "digital"      # 0/1, True/False
    ANALOG = "analog"        # float com range
    FLOW = "flow"           # m³/s (fluídos)
    PRESSURE = "pressure"   # Pa (fluídos)
    PACKET = "packet"       # dados estruturados


@dataclass
class Port:
    """Porta de conexão de um dispositivo."""
    id: str
    name: str
    direction: PortDirection = PortDirection.BIDIRECTIONAL
    domain: PortDomain = PortDomain.SIGNAL
    data_type: PortDataType = PortDataType.DIGITAL
    unit: str = ""
    range: Optional[tuple] = None       # ex: (0, 10) para analógico
    value: Any = None
    connected_to: Optional[str] = None  # ID da porta remota
    metadata: Dict[str, Any] = field(default_factory=dict)
    device_id: Optional[str] = None    # dispositivo dono da porta
    qualified_id: Optional[str] = None # {device_id}_{id} — único globalmente

    def read(self) -> Any:
        """Lê valor atual da porta."""
        return self.value

    def write(self, value: Any):
        """Escreve valor na porta."""
        if self.range and isinstance(value, (int, float)) and self.data_type == PortDataType.ANALOG:
            value = max(self.range[0], min(self.range[1], value))
        self.value = value

    def is_connected(self) -> bool:
        """Verifica se a porta está conectada."""
        return self.connected_to is not None

    def accept_domain(self, domain: PortDomain) -> bool:
        """Verifica se aceita conexão de um domínio."""
        return self.domain == domain or self.domain == PortDomain.SIGNAL

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "qualified_id": self.qualified_id,
            "device_id": self.device_id,
            "name": self.name,
            "direction": self.direction.value,
            "domain": self.domain.value,
            "data_type": self.data_type.value,
            "unit": self.unit,
            "range": self.range,
            "value": self.value,
            "connected_to": self.connected_to,
            "metadata": self.metadata,
        }

    @classmethod
    def digital_input(cls, port_id: str, name: str) -> "Port":
        return cls(port_id, name, PortDirection.INPUT, PortDomain.SIGNAL, PortDataType.DIGITAL)

    @classmethod
    def digital_output(cls, port_id: str, name: str) -> "Port":
        return cls(port_id, name, PortDirection.OUTPUT, PortDomain.SIGNAL, PortDataType.DIGITAL)

    @classmethod
    def analog_input(cls, port_id: str, name: str, rng: tuple = (0, 10), unit: str = "V") -> "Port":
        return cls(port_id, name, PortDirection.INPUT, PortDomain.SIGNAL, PortDataType.ANALOG, unit, rng)

    @classmethod
    def analog_output(cls, port_id: str, name: str, rng: tuple = (0, 10), unit: str = "V") -> "Port":
        return cls(port_id, name, PortDirection.OUTPUT, PortDomain.SIGNAL, PortDataType.ANALOG, unit, rng)

    @classmethod
    def pneumatic(cls, port_id: str, name: str, direction: PortDirection = PortDirection.BIDIRECTIONAL) -> "Port":
        return cls(port_id, name, direction, PortDomain.PNEUMATIC, PortDataType.PRESSURE, "bar", (0, 16))

    @classmethod
    def hydraulic(cls, port_id: str, name: str, direction: PortDirection = PortDirection.BIDIRECTIONAL) -> "Port":
        return cls(port_id, name, direction, PortDomain.HYDRAULIC, PortDataType.PRESSURE, "bar", (0, 350))

    @classmethod
    def power(cls, port_id: str, name: str = "24V", direction: PortDirection = PortDirection.INPUT) -> "Port":
        return cls(port_id, name, direction, PortDomain.ELECTRICAL, PortDataType.ANALOG, "V", (0, 30))

    @classmethod
    def data(cls, port_id: str, name: str, direction: PortDirection = PortDirection.BIDIRECTIONAL) -> "Port":
        return cls(port_id, name, direction, PortDomain.DATA, PortDataType.PACKET)

    @classmethod
    def mechanical_in(cls, port_id: str, name: str = "Eixo (entrada)") -> "Port":
        """Porta mecânica de entrada — carrega {rpm, torque_nm, direction}."""
        return cls(port_id, name, PortDirection.INPUT, PortDomain.MECHANICAL, PortDataType.PACKET, "rpm")

    @classmethod
    def mechanical_out(cls, port_id: str, name: str = "Eixo (saída)") -> "Port":
        return cls(port_id, name, PortDirection.OUTPUT, PortDomain.MECHANICAL, PortDataType.PACKET, "rpm")

    @classmethod
    def fluid_in(cls, port_id: str, name: str = "Fluido (entrada)") -> "Port":
        return cls(port_id, name, PortDirection.INPUT, PortDomain.FLUID, PortDataType.FLOW, "m³/h")

    @classmethod
    def fluid_out(cls, port_id: str, name: str = "Fluido (saída)") -> "Port":
        return cls(port_id, name, PortDirection.OUTPUT, PortDomain.FLUID, PortDataType.FLOW, "m³/h")

    @classmethod
    def optical(cls, port_id: str, name: str = "Vídeo") -> "Port":
        return cls(port_id, name, PortDirection.BIDIRECTIONAL, PortDomain.OPTICAL, PortDataType.PACKET)
