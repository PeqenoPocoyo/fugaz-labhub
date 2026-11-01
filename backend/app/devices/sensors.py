"""
Sensors — Sensores e medidores genéricos funcionais

Todos com comportamentos reais e portas configuráveis.
Sem marca específica — biblioteca genérica.
"""
from typing import Any, Optional
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger


# ============================================================
# SENSORES DIGITAIS
# ============================================================

def create_photoelectric_sensor(device_id: str = None) -> Device:
    """Sensor fotoelétrico (barreira óptica) com detecção configurável."""
    dev = Device(
        type_id="sensor_photoelectric",
        name="Sensor Fotoelétrico",
        category=DeviceCategory.SENSOR,
        properties={
            "range_mm": {"value": 500, "unit": "mm", "configurable": True},
            "response_ms": {"value": 0.5, "unit": "ms"},
            "detection_mode": "barrier",  # barrier, diffuse, retroreflective
            "threshold": 0.5,
        },
        ports=[
            Port.power("pwr", "24V"),
            Port.digital_input("test", "Teste"),
            Port.digital_output("out", "Saída"),
        ],
        metadata={"icon": "photoelectric", "description": "Sensor óptico para detecção de objetos"},
    )
    dev.properties["object_detected"] = False
    dev.properties["distance_mm"] = 1000

    def detect(dev: Device, dt: float):
        # Simula detecção: se distância < range, objeto detectado
        dist = dev.properties.get("distance_mm", 1000)
        rng = dev.properties.get("range_mm", {}).get("value", 500)
        detected = dist <= rng
        dev.properties["object_detected"] = detected
        dev.write_port("out", detected)

    dev.add_behaviour(Behaviour(name="detect", trigger=Trigger.ON_TICK, action=detect))
    return dev


def create_inductive_sensor() -> Device:
    """Sensor indutivo (detecta metal)."""
    dev = Device(
        type_id="sensor_inductive",
        name="Sensor Indutivo",
        category=DeviceCategory.SENSOR,
        properties={
            "range_mm": {"value": 4, "unit": "mm", "configurable": True},
            "material": "metal",  # metal, non-metal
            "target_present": False,
        },
        ports=[
            Port.power("pwr", "24V"),
            Port.digital_output("out", "Saída"),
        ],
        metadata={"icon": "inductive", "description": "Detecta objetos metálicos"},
    )

    def detect(dev: Device, dt: float):
        present = dev.properties.get("target_present", False)
        dev.write_port("out", present)

    dev.add_behaviour(Behaviour(name="detect", trigger=Trigger.ON_TICK, action=detect))
    return dev


def create_capacitive_sensor() -> Device:
    """Sensor capacitivo (detecta qualquer material)."""
    dev = Device(
        type_id="sensor_capacitive",
        name="Sensor Capacitivo",
        category=DeviceCategory.SENSOR,
        properties={
            "range_mm": {"value": 10, "unit": "mm", "configurable": True},
            "sensitivity": 0.5,
            "target_present": False,
        },
        ports=[
            Port.power("pwr", "24V"),
            Port.digital_output("out", "Saída"),
        ],
        metadata={"icon": "capacitive", "description": "Detecta qualquer material"},
    )

    def detect(dev: Device, dt: float):
        present = dev.properties.get("target_present", False)
        dev.write_port("out", present)

    dev.add_behaviour(Behaviour(name="detect", trigger=Trigger.ON_TICK, action=detect))
    return dev


def create_limit_switch() -> Device:
    """Chave fim de curso mecânica."""
    dev = Device(
        type_id="sensor_limit_switch",
        name="Chave Fim de Curso",
        category=DeviceCategory.SENSOR,
        properties={"actuated": False},
        ports=[
            Port.digital_output("nc", "Normalmente Fechado"),
            Port.digital_output("no", "Normalmente Aberto"),
        ],
        metadata={"icon": "limit_switch", "description": "Chave mecânica de posição"},
    )

    def update(dev: Device, dt: float):
        actuated = dev.properties.get("actuated", False)
        dev.write_port("nc", not actuated)
        dev.write_port("no", actuated)

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_emergency_button() -> Device:
    """Botão de emergência (cogumelo, NA + NF)."""
    dev = Device(
        type_id="sensor_emergency_button",
        name="Botão de Emergência",
        category=DeviceCategory.SENSOR,
        properties={"pressed": False, "latching": True},
        ports=[
            Port.digital_output("nc", "NF (Segurança)"),
            Port.digital_output("no", "NA"),
        ],
        metadata={"icon": "emergency", "description": "Parada de emergência"},
    )

    def update(dev: Device, dt: float):
        pressed = dev.properties.get("pressed", False)
        dev.write_port("nc", not pressed)
        dev.write_port("no", pressed)

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# SENSORES ANALÓGICOS
# ============================================================

def create_temperature_sensor() -> Device:
    """Sensor de temperatura (PT100 genérico, 0-200°C)."""
    dev = Device(
        type_id="sensor_temperature",
        name="Sensor de Temperatura",
        category=DeviceCategory.SENSOR,
        properties={
            "range_c": {"value": [-50, 200], "unit": "°C"},
            "type": "PT100",
            "current_temp_c": 25.0,
        },
        ports=[
            Port.power("pwr", "24V"),
            Port.analog_output("out", "Saída 0-10V", (0, 10), "V"),
        ],
        metadata={"icon": "temperature", "description": "Sensor térmico analógico"},
    )

    def update(dev: Device, dt: float):
        temp = dev.properties.get("current_temp_c", 25.0)
        rng = dev.properties.get("range_c", {}).get("value", [-50, 200])
        # Escalar temp para 0-10V
        min_t, max_t = rng
        voltage = ((temp - min_t) / (max_t - min_t)) * 10
        voltage = max(0, min(10, voltage))
        dev.write_port("out", voltage)

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_pressure_sensor() -> Device:
    """Sensor de pressão (0-16 bar)."""
    dev = Device(
        type_id="sensor_pressure",
        name="Sensor de Pressão",
        category=DeviceCategory.SENSOR,
        properties={
            "range_bar": {"value": [0, 16], "unit": "bar"},
            "current_pressure_bar": 0.0,
        },
        ports=[
            Port.power("pwr", "24V"),
            Port.analog_output("out", "Saída 4-20mA", (4, 20), "mA"),
        ],
        metadata={"icon": "pressure", "description": "Sensor de pressão analógico"},
    )

    def update(dev: Device, dt: float):
        p = dev.properties.get("current_pressure_bar", 0.0)
        rng = dev.properties.get("range_bar", {}).get("value", [0, 16])
        min_p, max_p = rng
        current = 4 + ((p - min_p) / (max_p - min_p)) * 16
        current = max(4, min(20, current))
        dev.write_port("out", current)

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_level_sensor() -> Device:
    """Sensor de nível (ultrassônico, 0-2m)."""
    dev = Device(
        type_id="sensor_level",
        name="Sensor de Nível",
        category=DeviceCategory.SENSOR,
        properties={
            "range_mm": {"value": [0, 2000], "unit": "mm"},
            "type": "ultrasonic",
            "current_level_mm": 0,
        },
        ports=[
            Port.power("pwr", "24V"),
            Port.analog_output("out", "Saída 0-10V", (0, 10), "V"),
        ],
        metadata={"icon": "level", "description": "Sensor de nível ultrassônico"},
    )

    def update(dev: Device, dt: float):
        level = dev.properties.get("current_level_mm", 0)
        rng = dev.properties.get("range_mm", {}).get("value", [0, 2000])
        min_l, max_l = rng
        voltage = ((level - min_l) / (max_l - min_l)) * 10
        voltage = max(0, min(10, voltage))
        dev.write_port("out", voltage)

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_load_cell() -> Device:
    """Célula de carga (0-50kg)."""
    dev = Device(
        type_id="sensor_load_cell",
        name="Célula de Carga",
        category=DeviceCategory.SENSOR,
        properties={
            "capacity_kg": {"value": 50, "unit": "kg"},
            "sensitivity_mv_v": 2.0,
            "current_weight_kg": 0.0,
        },
        ports=[
            Port.power("exc", "Excitação+"),
            Port.analog_output("out", "Saída mV/V", (0, 10), "mV"),
        ],
        metadata={"icon": "load_cell", "description": "Sensor de peso/força"},
    )

    def update(dev: Device, dt: float):
        weight = dev.properties.get("current_weight_kg", 0.0)
        cap = dev.properties.get("capacity_kg", {}).get("value", 50)
        # Escalar para 0-10mV/V
        signal = (weight / cap) * 10
        signal = max(0, min(10, signal))
        dev.write_port("out", signal)

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_encoder() -> Device:
    """Encoder rotativo (incremental)."""
    dev = Device(
        type_id="sensor_encoder",
        name="Encoder Rotativo",
        category=DeviceCategory.SENSOR,
        properties={
            "pulses_per_rev": 1000,
            "position_pulses": 0,
            "rpm": 0.0,
        },
        ports=[
            Port.power("pwr", "5V"),
            Port.digital_output("ch_a", "Canal A"),
            Port.digital_output("ch_b", "Canal B"),
            Port.digital_output("ch_z", "Canal Z"),
        ],
        metadata={"icon": "encoder", "description": "Encoder incremental rotativo"},
    )

    def update(dev: Device, dt: float):
        rpm = dev.properties.get("rpm", 0.0)
        # Simular pulso do canal A
        phase = (dev.properties.get("position_pulses", 0) % 100) / 100.0
        ch_a = 1 if phase < 0.5 else 0
        ch_b = 1 if phase < 0.25 or phase >= 0.75 else 0
        dev.write_port("ch_a", ch_a)
        dev.write_port("ch_b", ch_b)
        # Avançar posição
        if rpm > 0:
            increment = int(rpm / 60 * dev.properties.get("pulses_per_rev", 1000) * dt)
            dev.properties["position_pulses"] = dev.properties.get("position_pulses", 0) + increment

    dev.add_behaviour(Behaviour(name="update", trigger=Trigger.ON_TICK, action=update))
    return dev


SENSOR_FACTORY = {
    "sensor_photoelectric": create_photoelectric_sensor,
    "sensor_inductive": create_inductive_sensor,
    "sensor_capacitive": create_capacitive_sensor,
    "sensor_limit_switch": create_limit_switch,
    "sensor_emergency_button": create_emergency_button,
    "sensor_temperature": create_temperature_sensor,
    "sensor_pressure": create_pressure_sensor,
    "sensor_level": create_level_sensor,
    "sensor_load_cell": create_load_cell,
    "sensor_encoder": create_encoder,
}
