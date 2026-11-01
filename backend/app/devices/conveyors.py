"""
Conveyors — Esteiras transportadoras escaláveis

Escaláveis em grade (cells_x × cells_y): a área da esteira é
cells_x × cells_y módulos de `module_mm`.

Velocidade da correia derivada do eixo:
    v = RPM × π × D_rolo / 60   (m/s)
O RPM pode vir de:
 - comando analógico (mode "manual")
 - eixo mecânico conectado (mode "rpm")  ← motor/VFD direto
 - trem de força ligado ao mundo (mode "linked")
"""
from typing import Any, Dict, List, Optional
import math
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger


def _num(props: dict, key: str, default: float) -> float:
    v = props.get(key, default)
    if isinstance(v, dict):
        return float(v.get("value", default))
    try:
        return float(v)
    except (TypeError, ValueError):
        return float(default)


def _belt_speed_from_rpm(rpm: float, roller_d_mm: float) -> float:
    """Velocidade linear da correia (m/s) a partir do RPM do eixo do rolo."""
    return abs(rpm) * math.pi * (roller_d_mm / 1000.0) / 60.0


def _apply_objects(props: dict, speed_mm_s: float, length_mm: float, dt: float):
    """Move os objetos na correia e aplica sensores."""
    objects = props.get("objects_on_belt", [])
    for obj in objects:
        obj["position_mm"] += speed_mm_s * dt
    objects = [o for o in objects if 0 <= o["position_mm"] <= length_mm]
    props["objects_on_belt"] = objects
    entry = any(o["position_mm"] < 100 for o in objects)
    exit_ = any(o["position_mm"] > length_mm - 100 for o in objects)
    jam = len(objects) >= 5
    return entry, exit_, jam


def create_conveyor_belt() -> Device:
    """Esteira de correia — escalável (cells_x × cells_y), velocidade por RPM."""
    dev = Device(
        type_id="conveyor_belt",
        name="Esteira Transportadora",
        category=DeviceCategory.ACTUATOR,
        properties={
            # --- Escala em grade ---
            "cells_x": 5,            # módulos no comprimento (ex: puxar p/ 52)
            "cells_y": 1,            # módulos na largura (ex: puxar p/ 4)
            "module_mm": 200,        # tamanho do módulo
            # --- Acionamento ---
            "roller_diameter_mm": 80,
            "drive_mode": "auto",    # "auto" (eixo→senão comando) | "rpm" | "manual"
            "speed_m_s": 0.0,        # calculado
            "max_speed_m_s": 2.0,
            "direction": 1,          # 1=frente, -1=trás
            "shaft_rpm": 0.0,        # rpm no eixo do rolo
            "running": False,
            "roller_angle": 0.0,
            "max_load_kg": 50,
            "objects_on_belt": [],
            "throughput_per_min": 0.0,
        },
        ports=[
            # Alimentação do motor
            Port.power("motor", "Motor 24V"),
            # Comando
            Port.digital_input("run", "Ligar"),
            Port.digital_input("stop", "Parar"),
            Port.digital_input("fwd", "Frente"),
            Port.digital_input("rev", "Ré"),
            Port.analog_input("speed_cmd", "Velocidade 0-10V", (0, 10), "V"),
            # Eixo mecânico (entrada de RPM)
            Port.mechanical_in("shaft", "Eixo motor"),
            # Sensores integrados
            Port.digital_output("sensor_entry", "Sensor Entrada"),
            Port.digital_output("sensor_exit", "Sensor Saída"),
            Port.digital_output("sensor_jam", "Sensor Bloqueio"),
            # Dados
            Port.data("encoder_out", "Encoder"),
        ],
        metadata={"icon": "conveyor", "description": "Esteira escalável (X×Y), velocidade por RPM"},
    )

    def update(dev: Device, dt: float):
        p = dev.properties
        run = dev.read_port("run")
        stop = dev.read_port("stop")
        fwd = dev.read_port("fwd")
        rev = dev.read_port("rev")
        speed_cmd = dev.read_port("speed_cmd") or 0.0
        mode = p.get("drive_mode", "rpm")

        if rev:
            p["direction"] = -1
        elif fwd:
            p["direction"] = 1

        if stop:
            p["running"] = False
        elif run:
            p["running"] = True

        # --- RPM do eixo ---
        from app.devices.transmission import read_shaft
        shaft = read_shaft(dev, "shaft")
        max_v = _num(p, "max_speed_m_s", 2.0)
        d_roll = _num(p, "roller_diameter_mm", 80)
        # RPM equivalente à velocidade nominal (usado no fallback manual)
        rpm_manual = (max_v * 60 * 1000 / (math.pi * d_roll)) if d_roll else 0.0

        if mode == "manual":
            rpm = (speed_cmd / 10.0) * rpm_manual
        elif mode == "rpm":
            rpm = shaft["rpm"]
        else:  # "auto": segue o eixo se houver acionamento; senão comando
            if abs(shaft["rpm"]) > 0.01:
                rpm = shaft["rpm"]
            else:
                # comando analógico → fração da nominal; sem comando → nominal
                rpm = ((speed_cmd / 10.0) * rpm_manual) if speed_cmd and speed_cmd > 0 else rpm_manual

        if abs(rpm) > 0.01 and shaft.get("direction") and shaft["direction"] < 0:
            p["direction"] = -1
        elif fwd:
            p["direction"] = 1
        elif rev:
            p["direction"] = -1

        if not p.get("running", False):
            rpm = 0.0
        p["shaft_rpm"] = round(rpm, 2)

        # --- Velocidade da correia ---
        d_roll = _num(p, "roller_diameter_mm", 80)
        v = _belt_speed_from_rpm(rpm, d_roll)
        v_max = _num(p, "max_speed_m_s", 2.0)
        v = min(v, v_max)
        direction = p.get("direction", 1)
        p["speed_m_s"] = round(v, 4)

        # --- Dimensões derivadas ---
        module_mm = _num(p, "module_mm", 200)
        length_mm = _num(p, "cells_x", 5) * module_mm
        width_mm = _num(p, "cells_y", 1) * module_mm
        p["length_mm"] = length_mm
        p["width_mm"] = width_mm

        # --- Objetos na correia ---
        speed_mm_s = v * direction * 1000.0
        entry, exit_, jam = _apply_objects(p, speed_mm_s, length_mm, dt)

        # Animação do rolo (proporcional ao RPM real)
        p["roller_angle"] = (p.get("roller_angle", 0.0) + rpm * 360 * dt) % 360

        # Throughput estimado (objetos/min): 1 objeto a cada 300mm
        p["throughput_per_min"] = round(v * 60 * (1000 / 300.0), 1) if v > 0 else 0.0

        dev.write_port("sensor_entry", entry)
        dev.write_port("sensor_exit", exit_)
        dev.write_port("sensor_jam", jam)
        dev.write_port("shaft", {"rpm": 0, "torque_nm": 0})
        dev.state["active"] = p.get("running", False)

    def resize(cells_x: int = None, cells_y: int = None):
        """Redimensiona a esteira em grade (drag X×Y)."""
        if cells_x is not None:
            dev.properties["cells_x"] = max(1, min(200, int(cells_x)))
        if cells_y is not None:
            dev.properties["cells_y"] = max(1, min(40, int(cells_y)))

    def add_object(obj_id: str, mass_kg: float = 1.0):
        p = dev.properties
        p.setdefault("objects_on_belt", []).append(
            {"id": obj_id, "position_mm": 0, "mass": mass_kg})

    def remove_object(obj_id: str):
        p = dev.properties
        p["objects_on_belt"] = [o for o in p.get("objects_on_belt", []) if o["id"] != obj_id]

    dev.add_behaviour(Behaviour(name="conveyor_control", trigger=Trigger.ON_TICK, action=update))
    dev.resize = resize
    dev.add_object_to_belt = add_object
    dev.remove_object_from_belt = remove_object
    return dev


def create_roller_conveyor() -> Device:
    """Esteira de rolos — escalável, gravidade ou motorizada."""
    dev = Device(
        type_id="conveyor_roller",
        name="Esteira de Rolos",
        category=DeviceCategory.ACTUATOR,
        properties={
            "cells_x": 6, "cells_y": 1, "module_mm": 250,
            "roller_diameter_mm": 50,
            "drive_mode": "rpm",
            "speed_m_s": 0.0,
            "shaft_rpm": 0.0,
            "direction": 1,
            "running": False,
            "roller_rotation_deg": 0.0,
        },
        ports=[
            Port.power("motor", "Motor"),
            Port.digital_input("run", "Ligar"),
            Port.digital_input("stop", "Parar"),
            Port.digital_input("fwd", "Frente"),
            Port.digital_input("rev", "Ré"),
            Port.mechanical_in("shaft", "Eixo motor"),
            Port.digital_output("sensor_entry", "Sensor Entrada"),
            Port.digital_output("sensor_exit", "Sensor Saída"),
        ],
        metadata={"icon": "roller_conveyor", "description": "Esteira de rolos escalável"},
    )

    def update(dev: Device, dt: float):
        p = dev.properties
        run, stop = dev.read_port("run"), dev.read_port("stop")
        fwd, rev = dev.read_port("fwd"), dev.read_port("rev")
        if rev:
            p["direction"] = -1
        elif fwd:
            p["direction"] = 1
        if stop:
            p["running"] = False
        elif run:
            p["running"] = True

        from app.devices.transmission import read_shaft
        rpm = read_shaft(dev, "shaft")["rpm"] if p.get("drive_mode") == "rpm" else 300
        if not p.get("running"):
            rpm = 0.0
        p["shaft_rpm"] = round(rpm, 2)
        d = _num(p, "roller_diameter_mm", 50)
        p["speed_m_s"] = round(_belt_speed_from_rpm(rpm, d), 4)
        module_mm = _num(p, "module_mm", 250)
        p["length_mm"] = _num(p, "cells_x", 6) * module_mm
        p["width_mm"] = _num(p, "cells_y", 1) * module_mm
        p["roller_rotation_deg"] = (p.get("roller_rotation_deg", 0.0) + rpm * 360 * dt) % 360
        dev.state["active"] = p.get("running", False)

    def resize(cells_x: int = None, cells_y: int = None):
        if cells_x is not None:
            dev.properties["cells_x"] = max(1, min(200, int(cells_x)))
        if cells_y is not None:
            dev.properties["cells_y"] = max(1, min(40, int(cells_y)))

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    dev.resize = resize
    return dev


CONVEYOR_FACTORY = {
    "conveyor_belt": create_conveyor_belt,
    "conveyor_roller": create_roller_conveyor,
}
