"""
Actuators — Atuadores genéricos funcionais

Motores DC, AC, stepper, servo, cilindros pneumáticos/hidráulicos,
atuadores lineares. Todos com funcionamento real e portas configuráveis.
"""
from typing import Any
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger


# ============================================================
# MOTORES ELÉTRICOS
# ============================================================

def create_dc_motor() -> Device:
    """Motor DC 12-24V com controle de velocidade por PWM."""
    dev = Device(
        type_id="motor_dc",
        name="Motor DC",
        category=DeviceCategory.ACTUATOR,
        properties={
            "voltage": {"value": 24, "unit": "V"},
            "nominal_rpm": {"value": 3000, "unit": "RPM"},
            "max_current_a": 2.0,
            "pwm_duty": 0.0,       # 0-1 (velocidade)
            "direction": 1,        # 1=frente, -1=trás
            "current_rpm": 0.0,
            "running": False,
            "inertia": 0.001,
        },
        ports=[
            Port.power("v+", "V+"),
            Port.power("v-", "V-"),
            Port.digital_input("pwm", "PWM"),
            Port.digital_input("dir", "Direção"),
        ],
        metadata={"icon": "motor_dc", "description": "Motor de corrente contínua"},
    )

    def update(dev: Device, dt: float):
        duty = dev.properties.get("pwm_duty", 0.0)
        direction = dev.properties.get("direction", 1)
        rpm = dev.properties.get("nominal_rpm", {}).get("value", 3000)
        current = dev.properties.get("current_rpm", 0.0)

        # Aceleração/desaceleração baseada em inércia
        target = rpm * duty * direction
        accel = (target - current) * 0.1  # fator de resposta
        new_rpm = current + accel
        dev.properties["current_rpm"] = new_rpm
        dev.properties["running"] = abs(new_rpm) > 1
        dev.state["active"] = dev.properties["running"]

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_ac_motor() -> Device:
    """Motor AC trifásico (gaiola de esquilo)."""
    dev = Device(
        type_id="motor_ac",
        name="Motor AC Trifásico",
        category=DeviceCategory.ACTUATOR,
        properties={
            "voltage": {"value": 380, "unit": "V"},
            "frequency_hz": {"value": 60, "unit": "Hz"},
            "nominal_rpm": {"value": 1750, "unit": "RPM"},
            "poles": 4,
            "started": False,
            "current_rpm": 0.0,
        },
        ports=[
            Port.power("l1", "L1"),
            Port.power("l2", "L2"),
            Port.power("l3", "L3"),
            Port.digital_input("start", "Partida"),
            Port.digital_input("stop", "Parada"),
        ],
        metadata={"icon": "motor_ac", "description": "Motor assíncrono trifásico"},
    )

    def update(dev: Device, dt: float):
        # Lógica simples: start liga, stop desliga
        start = dev.read_port("start")
        stop = dev.read_port("stop")
        if start and not stop and not dev.properties.get("started", False):
            dev.properties["started"] = True
        if stop:
            dev.properties["started"] = False

        rpm = dev.properties.get("nominal_rpm", {}).get("value", 1750)
        target = rpm if dev.properties.get("started", False) else 0.0
        current = dev.properties.get("current_rpm", 0.0)
        dev.properties["current_rpm"] = current + (target - current) * 0.05
        dev.state["active"] = dev.properties.get("started", False)

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_stepper_motor() -> Device:
    """Motor de passo bipolar."""
    dev = Device(
        type_id="motor_stepper",
        name="Motor de Passo",
        category=DeviceCategory.ACTUATOR,
        properties={
            "step_angle": {"value": 1.8, "unit": "°"},
            "steps_per_rev": 200,
            "voltage": {"value": 12, "unit": "V"},
            "current_a": 1.5,
            "holding_torque_nm": 0.4,
            "position_steps": 0,
            "speed_steps_s": 0,
            "running": False,
        },
        ports=[
            Port.power("a+", "A+"),
            Port.power("a-", "A-"),
            Port.power("b+", "B+"),
            Port.power("b-", "B-"),
            Port.digital_input("step", "Passo"),
            Port.digital_input("dir", "Direção"),
            Port.digital_output("home", "Home"),
        ],
        metadata={"icon": "motor_stepper", "description": "Motor de passo bipolar"},
    )

    def update(dev: Device, dt: float):
        step = dev.read_port("step")
        direction = dev.read_port("dir") or 1
        if step:
            increment = 1 if direction >= 0 else -1
            dev.properties["position_steps"] = dev.properties.get("position_steps", 0) + increment

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_servo_motor() -> Device:
    """Servo motor com realimentação de posição."""
    dev = Device(
        type_id="motor_servo",
        name="Servo Motor",
        category=DeviceCategory.ACTUATOR,
        properties={
            "nominal_rpm": {"value": 3000, "unit": "RPM"},
            "resolution_bits": 17,
            "position_deg": 0.0,
            "target_deg": 0.0,
            "torque_nm": 1.0,
            "running": False,
        },
        ports=[
            Port.power("pwr", "Alimentação"),
            Port.analog_input("cmd", "Comando 0-10V", (0, 10), "V"),
            Port.analog_output("fb", "Realimentação", (0, 10), "V"),
            Port.digital_output("ready", "Pronto"),
        ],
        metadata={"icon": "motor_servo", "description": "Servomotor com realimentação"},
    )

    def update(dev: Device, dt: float):
        cmd = dev.read_port("cmd") or 0.0
        target = (cmd / 10.0) * 360.0  # 0-10V → 0-360°
        dev.properties["target_deg"] = target
        current = dev.properties.get("position_deg", 0.0)
        # Movimento suave em direção ao alvo
        new = current + (target - current) * 0.1
        dev.properties["position_deg"] = new
        dev.properties["running"] = abs(target - new) > 0.5
        # Realimentação
        dev.write_port("fb", (new / 360.0) * 10)
        dev.write_port("ready", abs(target - new) <= 0.5)

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# ATUADORES PNEUMÁTICOS
# ============================================================

def create_pneumatic_cylinder() -> Device:
    """Cilindro pneumático de dupla ação."""
    dev = Device(
        type_id="cylinder_pneumatic",
        name="Cilindro Pneumático",
        category=DeviceCategory.ACTUATOR,
        properties={
            "bore_mm": {"value": 50, "unit": "mm"},
            "stroke_mm": {"value": 100, "unit": "mm"},
            "pressure_bar": 6.0,
            "extended": False,
            "position_mm": 0.0,
            "force_n": 0.0,
        },
        ports=[
            Port.pneumatic("port_a", "Porta A"),
            Port.pneumatic("port_b", "Porta B"),
            Port.digital_input("valve_a", "Válvula A"),
            Port.digital_input("valve_b", "Válvula B"),
            Port.digital_output("sensor_front", "Sensor Frontal"),
            Port.digital_output("sensor_back", "Sensor Traseiro"),
        ],
        metadata={"icon": "cylinder", "description": "Cilindro pneumático dupla ação"},
    )

    def update(dev: Device, dt: float):
        valve_a = dev.read_port("valve_a")
        valve_b = dev.read_port("valve_b")
        pressure = dev.properties.get("pressure_bar", 6.0)
        bore = dev.properties.get("bore_mm", {}).get("value", 50)
        stroke = dev.properties.get("stroke_mm", {}).get("value", 100)

        # Área do pistão (mm²)
        area = 3.14159 * (bore / 2) ** 2
        force = pressure * 1e5 / 1e6 * area / 1e6 * 1e6  # N (simplificado)
        dev.properties["force_n"] = pressure * area / 10

        pos = dev.properties.get("position_mm", 0.0)
        target = 0.0
        if valve_a and not valve_b:
            target = stroke
        elif valve_b and not valve_a:
            target = 0.0
        # Movimento
        speed = 100  # mm/s
        if pos < target:
            pos = min(target, pos + speed * dt)
        elif pos > target:
            pos = max(target, pos - speed * dt)
        dev.properties["position_mm"] = pos

        # Sensores de fim de curso
        dev.write_port("sensor_front", pos >= stroke - 1)
        dev.write_port("sensor_back", pos <= 1)
        dev.properties["extended"] = pos > stroke / 2

        # Portas pneumáticas
        dev.write_port("port_a", pressure if valve_a else 0)
        dev.write_port("port_b", pressure if valve_b else 0)

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_pneumatic_valve_5_2() -> Device:
    """Válvula direcional pneumática 5/2 vias."""
    dev = Device(
        type_id="valve_pneumatic_5_2",
        name="Válvula 5/2",
        category=DeviceCategory.ACTUATOR,
        properties={
            "voltage": {"value": 24, "unit": "V"},
            "flow_lpm": 700,
            "position": "center",  # center, a, b
        },
        ports=[
            Port.pneumatic("p", "Pressão (P)"),
            Port.pneumatic("a", "Saída A"),
            Port.pneumatic("b", "Saída B"),
            Port.pneumatic("ea", "Escape A"),
            Port.pneumatic("eb", "Escape B"),
            Port.power("coil_a", "Bobina A"),
            Port.power("coil_b", "Bobina B"),
        ],
        metadata={"icon": "valve", "description": "Válvula direcional 5/2 vias"},
    )

    def update(dev: Device, dt: float):
        coil_a = dev.read_port("coil_a")
        coil_b = dev.read_port("coil_b")
        pressure = 6.0  # pressão de alimentação

        if coil_a and not coil_b:
            dev.properties["position"] = "a"
            dev.write_port("a", pressure)
            dev.write_port("b", 0)
        elif coil_b and not coil_a:
            dev.properties["position"] = "b"
            dev.write_port("a", 0)
            dev.write_port("b", pressure)
        else:
            dev.properties["position"] = "center"
            dev.write_port("a", 0)
            dev.write_port("b", 0)
        dev.write_port("p", pressure)

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# ATUADORES HIDRÁULICOS
# ============================================================

def create_hydraulic_cylinder() -> Device:
    """Cilindro hidráulico de dupla ação."""
    dev = Device(
        type_id="cylinder_hydraulic",
        name="Cilindro Hidráulico",
        category=DeviceCategory.ACTUATOR,
        properties={
            "bore_mm": {"value": 50, "unit": "mm"},
            "rod_mm": {"value": 25, "unit": "mm"},
            "stroke_mm": {"value": 200, "unit": "mm"},
            "max_pressure_bar": 250,
            "position_mm": 0.0,
            "extended": False,
        },
        ports=[
            Port.hydraulic("port_a", "Porta A"),
            Port.hydraulic("port_b", "Porta B"),
            Port.digital_input("valve_a", "Válvula A"),
            Port.digital_input("valve_b", "Válvula B"),
            Port.digital_output("sensor_front", "Sensor Frontal"),
            Port.digital_output("sensor_back", "Sensor Traseiro"),
        ],
        metadata={"icon": "cylinder_hyd", "description": "Cilindro hidráulico dupla ação"},
    )

    def update(dev: Device, dt: float):
        valve_a = dev.read_port("valve_a")
        valve_b = dev.read_port("valve_b")
        bore = dev.properties.get("bore_mm", {}).get("value", 50)
        rod = dev.properties.get("rod_mm", {}).get("value", 25)
        stroke = dev.properties.get("stroke_mm", {}).get("value", 200)
        pressure = 200.0  # bar

        pos = dev.properties.get("position_mm", 0.0)
        target = 0.0
        if valve_a and not valve_b:
            target = stroke
        elif valve_b and not valve_a:
            target = 0.0
        speed = 200  # mm/s
        if pos < target:
            pos = min(target, pos + speed * dt)
        elif pos > target:
            pos = max(target, pos - speed * dt)
        dev.properties["position_mm"] = pos

        dev.write_port("sensor_front", pos >= stroke - 1)
        dev.write_port("sensor_back", pos <= 1)
        dev.properties["extended"] = pos > stroke / 2
        dev.write_port("port_a", pressure if valve_a else 0)
        dev.write_port("port_b", pressure if valve_b else 0)

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# ATUADOR LINEAR
# ============================================================

def create_linear_actuator() -> Device:
    """Atuador linear elétrico (parafuso sem-fim)."""
    dev = Device(
        type_id="actuator_linear",
        name="Atuador Linear",
        category=DeviceCategory.ACTUATOR,
        properties={
            "stroke_mm": {"value": 200, "unit": "mm"},
            "speed_mm_s": {"value": 20, "unit": "mm/s"},
            "position_mm": 0.0,
            "moving": False,
            "direction": 1,
        },
        ports=[
            Port.power("v+", "V+"),
            Port.power("v-", "V-"),
            Port.digital_input("extend", "Avançar"),
            Port.digital_input("retract", "Recuar"),
            Port.analog_input("position_cmd", "Posição 0-10V", (0, 10), "V"),
            Port.analog_output("position_fb", "Posição Real", (0, 10), "V"),
        ],
        metadata={"icon": "linear", "description": "Atuador linear elétrico"},
    )

    def update(dev: Device, dt: float):
        extend = dev.read_port("extend")
        retract = dev.read_port("retract")
        speed = dev.properties.get("speed_mm_s", {}).get("value", 20)
        stroke = dev.properties.get("stroke_mm", {}).get("value", 200)
        pos = dev.properties.get("position_mm", 0.0)

        moving = False
        if extend and not retract:
            pos = min(stroke, pos + speed * dt)
            moving = True
        elif retract and not extend:
            pos = max(0, pos - speed * dt)
            moving = True

        dev.properties["position_mm"] = pos
        dev.properties["moving"] = moving
        dev.write_port("position_fb", (pos / stroke) * 10)
        dev.state["active"] = moving

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


ACTUATOR_FACTORY = {
    "motor_dc": create_dc_motor,
    "motor_ac": create_ac_motor,
    "motor_stepper": create_stepper_motor,
    "motor_servo": create_servo_motor,
    "cylinder_pneumatic": create_pneumatic_cylinder,
    "valve_pneumatic_5_2": create_pneumatic_valve_5_2,
    "cylinder_hydraulic": create_hydraulic_cylinder,
    "actuator_linear": create_linear_actuator,
}
