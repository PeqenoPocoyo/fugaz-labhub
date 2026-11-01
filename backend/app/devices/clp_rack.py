"""
CLP Rack — Simulação de CLP com ecossistema completo

Implementa:
- MemoryMap: área de memória (coils, registradores, etc.)
- Module: módulos inseríveis (CPU, DI, DO, AI, AO, COM)
- Rack: chassi com barramento (backplane)

O CLP não é programável, mas expõe a memória via servidores de protocolo
para que softwares externos (TIA Portal, MasterTool, etc.) se conectem.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from enum import Enum
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger
from app.core.ids import ids


# ============================================================
# MEMORY MAP
# ============================================================

class MemoryMap:
    """
    Área de memória do CLP — modelo híbrido IEC 61131-3 + ModBus.

    Áreas:
    - coils: saídas digitais / bits R/W (ModBus 0xxxx)
    - discrete_inputs: entradas digitais / bits R-only (ModBus 1xxxx)
    - holding_registers: registradores R/W 16-bit (ModBus 4xxxx)
    - input_registers: registradores R-only 16-bit (ModBus 3xxxx)
    - markers: memória interna (bits)
    """

    def __init__(self, size: int = 1000):
        self.size = size
        self.coils: List[bool] = [False] * size
        self.discrete_inputs: List[bool] = [False] * size
        self.holding_registers: List[int] = [0] * size
        self.input_registers: List[int] = [0] * size
        self.markers: List[bool] = [False] * size

    # Acesso coils (saídas digitais)
    def read_coil(self, addr: int) -> bool:
        return self.coils[addr] if 0 <= addr < self.size else False

    def write_coil(self, addr: int, value: bool):
        if 0 <= addr < self.size:
            self.coils[addr] = bool(value)

    # Acesso discrete inputs (entradas digitais)
    def read_discrete(self, addr: int) -> bool:
        return self.discrete_inputs[addr] if 0 <= addr < self.size else False

    def write_discrete(self, addr: int, value: bool):
        if 0 <= addr < self.size:
            self.discrete_inputs[addr] = bool(value)

    # Acesso holding registers (R/W)
    def read_holding(self, addr: int) -> int:
        return self.holding_registers[addr] if 0 <= addr < self.size else 0

    def write_holding(self, addr: int, value: int):
        if 0 <= addr < self.size:
            self.holding_registers[addr] = int(value) & 0xFFFF

    # Acesso input registers (R-only)
    def read_input_reg(self, addr: int) -> int:
        return self.input_registers[addr] if 0 <= addr < self.size else 0

    def write_input_reg(self, addr: int, value: int):
        if 0 <= addr < self.size:
            self.input_registers[addr] = int(value) & 0xFFFF

    # Markers (memória interna)
    def read_marker(self, addr: int) -> bool:
        return self.markers[addr] if 0 <= addr < self.size else False

    def write_marker(self, addr: int, value: bool):
        if 0 <= addr < self.size:
            self.markers[addr] = bool(value)

    def to_dict(self) -> dict:
        return {
            "size": self.size,
            "coils_nonzero": sum(1 for c in self.coils if c),
            "discrete_nonzero": sum(1 for d in self.discrete_inputs if d),
            "holding_nonzero": sum(1 for h in self.holding_registers if h != 0),
            "input_nonzero": sum(1 for i in self.input_registers if i != 0),
        }


# ============================================================
# MÓDULOS
# ============================================================

class ModuleType(str, Enum):
    CPU = "cpu"
    DI = "di"       # Digital Input
    DO = "do"       # Digital Output
    AI = "ai"       # Analog Input
    AO = "ao"       # Analog Output
    COM = "com"     # Comunicação
    RTD = "rtd"     # Entrada de temperatura
    EXPANSION = "expansion"


@dataclass
class ModuleSpec:
    """Especificação de um tipo de módulo."""
    type: ModuleType
    points: int                          # número de pontos/canais
    base_area: str                       # "coils", "discrete_inputs", "holding_registers", "input_registers"
    data_type: str = "digital"           # "digital" ou "analog"
    analog_range: tuple = (0, 10)        # range analógico
    unit: str = ""                       # unidade
    voltage: float = 24.0                # tensão de operação (V CC)
    sink_source: str = "source"          # "sink" ou "source" (PNP/NPN)


class Module:
    """Módulo instalado em um slot do rack."""

    def __init__(self, spec: ModuleSpec, slot: int, base_address: int):
        self.id = ids.tagged(f"mod_{spec.type.value}")
        self.spec = spec
        self.slot = slot
        self.base_address = base_address
        self.status = "ok"  # ok, fault, absent
        self.point_values: List[Any] = [0 if spec.data_type == "analog" else False] * spec.points

    def read_point(self, point: int) -> Any:
        if 0 <= point < len(self.point_values):
            return self.point_values[point]
        return None

    def write_point(self, point: int, value: Any):
        if 0 <= point < len(self.point_values):
            self.point_values[point] = value

    def sync_to_memory(self, memory: MemoryMap):
        """Sincroniza valores dos pontos para a memória do CLP."""
        area = self.spec.base_area
        for i, val in enumerate(self.point_values):
            addr = self.base_address + i
            if area == "coils":
                memory.write_coil(addr, val)
            elif area == "discrete_inputs":
                memory.write_discrete(addr, val)
            elif area == "holding_registers":
                memory.write_holding(addr, val)
            elif area == "input_registers":
                memory.write_input_reg(addr, val)

    def sync_from_memory(self, memory: MemoryMap):
        """Sincroniza valores da memória para os pontos."""
        area = self.spec.base_area
        for i in range(self.spec.points):
            addr = self.base_address + i
            if area == "coils":
                self.point_values[i] = memory.read_coil(addr)
            elif area == "discrete_inputs":
                self.point_values[i] = memory.read_discrete(addr)
            elif area == "holding_registers":
                self.point_values[i] = memory.read_holding(addr)
            elif area == "input_registers":
                self.point_values[i] = memory.read_input_reg(addr)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.spec.type.value,
            "points": self.spec.points,
            "base_area": self.spec.base_area,
            "slot": self.slot,
            "base_address": self.base_address,
            "data_type": self.spec.data_type,
            "status": self.status,
            "point_values": self.point_values,
        }


# ============================================================
# MÓDULOS PRÉ-DEFINIDOS
# ============================================================

MODULE_SPECS: Dict[str, ModuleSpec] = {
    "cpu_generic": ModuleSpec(ModuleType.CPU, 0, "markers", "digital"),
    "di_8_24v": ModuleSpec(ModuleType.DI, 8, "discrete_inputs", "digital", voltage=24.0, sink_source="source"),
    "di_16_24v": ModuleSpec(ModuleType.DI, 16, "discrete_inputs", "digital", voltage=24.0, sink_source="source"),
    "do_8_24v": ModuleSpec(ModuleType.DO, 8, "coils", "digital", voltage=24.0, sink_source="source"),
    "do_16_24v": ModuleSpec(ModuleType.DO, 16, "coils", "digital", voltage=24.0, sink_source="source"),
    "ai_8_0_10v": ModuleSpec(ModuleType.AI, 8, "input_registers", "analog", (0, 10), "V", 24.0),
    "ai_8_4_20ma": ModuleSpec(ModuleType.AI, 8, "input_registers", "analog", (4, 20), "mA", 24.0),
    "ao_4_0_10v": ModuleSpec(ModuleType.AO, 4, "holding_registers", "analog", (0, 10), "V", 24.0),
    "ao_4_4_20ma": ModuleSpec(ModuleType.AO, 4, "holding_registers", "analog", (4, 20), "mA", 24.0),
    "rtd_4": ModuleSpec(ModuleType.RTD, 4, "input_registers", "analog", (-50, 200), "°C", 24.0),
    "com_modbus_tcp": ModuleSpec(ModuleType.COM, 0, "markers", "digital"),
    "com_opcua": ModuleSpec(ModuleType.COM, 0, "markers", "digital"),
}


# ============================================================
# RACK
# ============================================================

class Rack:
    """Chassi que acomoda módulos e gerencia barramento."""

    def __init__(self, name: str = "Rack", slots: int = 8, memory_size: int = 1000):
        self.id = ids.tagged("rack")
        self.name = name
        self.slots = slots
        self.memory = MemoryMap(memory_size)
        self.modules: Dict[int, Module] = {}  # slot -> Module
        self.bus_voltage = 24.0
        self.bus_powered = True
        self.scan_time = 0.001  # 1ms
        self._next_address = 0

    def install(self, spec_key: str, slot: int) -> Optional[Module]:
        """Instala um módulo em um slot."""
        if slot in self.modules:
            logger.warning(f"Slot {slot} já ocupado")
            return None
        if slot >= self.slots:
            logger.error(f"Slot {slot} fora do range ({self.slots} slots)")
            return None
        spec = MODULE_SPECS.get(spec_key)
        if not spec:
            logger.error(f"Especificação de módulo não encontrada: {spec_key}")
            return None

        module = Module(spec, slot, self._next_address)
        self.modules[slot] = module
        self._next_address += spec.points
        logger.info(f"Módulo {spec_key} instalado no slot {slot} (base={module.base_address})")
        return module

    def remove(self, slot: int):
        """Remove módulo de um slot."""
        if slot in self.modules:
            del self.modules[slot]

    def get_module(self, slot: int) -> Optional[Module]:
        return self.modules.get(slot)

    def scan(self):
        """Ciclo de scan: sincroniza portas, módulos e memória."""
        # 1. Mundo → Portas de entrada → Pontos do módulo
        if hasattr(self, "_port_cache"):
            for port in self._port_cache.values():
                # Encontrar slot/ponto pelo ID
                # formato: rack_{rack_id}_s{slot}_p{point}
                try:
                    parts = port.id.split("_s")
                    slot_part = parts[1].split("_p")
                    slot = int(slot_part[0])
                    point = int(slot_part[1])
                except (IndexError, ValueError):
                    continue
                module = self.modules.get(slot)
                if not module:
                    continue
                # Entradas: porta recebe do mundo → ponto do módulo
                if module.spec.type in (ModuleType.DI, ModuleType.AI, ModuleType.RTD) and port.value is not None:
                    module.write_point(point, port.value)
                # Saídas: ponto do módulo → porta (mundo lê)
                elif module.spec.type in (ModuleType.DO, ModuleType.AO):
                    port.value = module.read_point(point)

        # 2. Pontos do módulo → Memória (entradas)
        for module in self.modules.values():
            if module.spec.type in (ModuleType.DI, ModuleType.AI, ModuleType.RTD):
                module.sync_to_memory(self.memory)

        # 3. Memória → Pontos do módulo (saídas)
        for module in self.modules.values():
            if module.spec.type in (ModuleType.DO, ModuleType.AO):
                module.sync_from_memory(self.memory)

    def get_port_for_point(self, slot: int, point: int) -> Port:
        """Retorna (criando se necessário) a porta para um ponto de I/O de um módulo."""
        module = self.modules.get(slot)
        if not module:
            raise ValueError(f"Módulo no slot {slot} não existe")

        port_id = f"rack_{self.id}_s{slot}_p{point}"

        # Cache de portas: criar apenas uma vez
        if not hasattr(self, "_port_cache"):
            self._port_cache: Dict[str, Port] = {}
        if port_id in self._port_cache:
            return self._port_cache[port_id]

        if module.spec.type in (ModuleType.DI, ModuleType.AI, ModuleType.RTD):
            port = Port(port_id, f"S{slot}.P{point}",
                       PortDirection.INPUT, PortDomain.SIGNAL,
                       PortDataType.ANALOG if module.spec.data_type == "analog" else PortDataType.DIGITAL,
                       module.spec.unit, module.spec.analog_range)
        else:
            port = Port(port_id, f"S{slot}.P{point}",
                       PortDirection.OUTPUT, PortDomain.SIGNAL,
                       PortDataType.ANALOG if module.spec.data_type == "analog" else PortDataType.DIGITAL,
                       module.spec.unit, module.spec.analog_range)

        self._port_cache[port_id] = port
        return port

    def all_ports(self) -> Dict[str, Port]:
        """Retorna todas as portas de I/O dos módulos instalados."""
        if not hasattr(self, "_port_cache"):
            self._port_cache = {}
        result = {}
        for slot, module in self.modules.items():
            for point in range(module.spec.points):
                port = self.get_port_for_point(slot, point)
                result[port.id] = port
        return result

    def status(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slots": self.slots,
            "bus_voltage": self.bus_voltage,
            "bus_powered": self.bus_powered,
            "modules": {s: m.to_dict() for s, m in self.modules.items()},
            "memory": self.memory.to_dict(),
        }

    def __repr__(self):
        return f"<Rack {self.name}: {len(self.modules)}/{self.slots} módulos>"


# ============================================================
# CLP COMPLETO (Device)
# ============================================================

class CLPDevice(Device):
    """Dispositivo CLP completo com rack, módulos e memória."""

    def __init__(self, type_id: str = "clp_generic", name: str = "CLP Genérico",
                 rack_slots: int = 8, memory_size: int = 1000):
        super().__init__(type_id, name, DeviceCategory.PLC)
        self.rack = Rack(name, rack_slots, memory_size)
        self.layer = "plc"
        self.routing: List[dict] = []  # rotas entrada→saída configuráveis

        # Comportamentos do CLP
        self.add_behaviour(Behaviour(
            name="rack_scan",
            trigger=Trigger.ON_TICK,
            action=self._do_scan
        ))

        # Adicionar porta de dados (para protocolos)
        self.add_port(Port.data("eth0", "Ethernet"))

    def _do_scan(self, device: "CLPDevice", dt: float):
        """Executa ciclo de scan do rack."""
        self.rack.scan()
        # Aplicar roteamento configurado (ligações entrada→saída)
        for route in self.routing:
            src = route.get("input")
            dst = route.get("output")
            invert = route.get("invert", False)
            if not src or not dst:
                continue
            val = self.read_input(src[0], src[1])
            if invert and isinstance(val, bool):
                val = not val
            self.write_output(dst[0], dst[1], val)

    def route(self, in_slot: int, in_point: int, out_slot: int, out_point: int, invert: bool = False):
        """Configura roteamento simples: copia entrada digital para saída."""
        self.routing.append({
            "input": (in_slot, in_point),
            "output": (out_slot, out_point),
            "invert": invert,
        })

    # ---------- API de alto nível ----------

    def install_module(self, spec_key: str, slot: int) -> Optional[Module]:
        module = self.rack.install(spec_key, slot)
        if module:
            # Registrar portas do módulo no dispositivo para o mundo encontrar
            for point in range(module.spec.points):
                port = self.rack.get_port_for_point(slot, point)
                self.add_port(port)
        return module

    def remove_module(self, slot: int):
        """Remove módulo e suas portas."""
        module = self.rack.get_module(slot)
        if module:
            for point in range(module.spec.points):
                port_id = f"rack_{self.rack.id}_s{slot}_p{point}"
                self.ports.pop(port_id, None)
                if hasattr(self.rack, "_port_cache"):
                    self.rack._port_cache.pop(port_id, None)
            self.rack.remove(slot)

    def read_input(self, slot: int, point: int) -> Any:
        """Lê valor de entrada (mundo → CLP)."""
        module = self.rack.get_module(slot)
        if module:
            return module.read_point(point)
        return None

    def write_input(self, slot: int, point: int, value: Any):
        """Escreve valor em entrada (mundo → CLP)."""
        module = self.rack.get_module(slot)
        if module:
            module.write_point(point, value)

    def read_output(self, slot: int, point: int) -> Any:
        """Lê valor de saída (CLP → mundo)."""
        module = self.rack.get_module(slot)
        if module:
            return module.read_point(point)
        return None

    def write_output(self, slot: int, point: int, value: Any):
        """Escreve valor em saída (CLP → mundo)."""
        module = self.rack.get_module(slot)
        if module:
            module.write_point(point, value)

    # ---------- Acesso à memória (para protocolos) ----------

    def get_memory(self) -> MemoryMap:
        return self.rack.memory

    def to_dict(self) -> dict:
        base = super().to_dict()
        base["rack"] = self.rack.status()
        base["routing"] = self.routing
        return base
