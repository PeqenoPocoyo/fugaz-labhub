"""
Transmission — Elementos de transmissão de movimento

Ligam a rotação de um eixo motor (motor/VFD) a uma carga (esteira,
atuador, bomba). Cada elemento tem uma relação de transmissão (ratio)
e uma eficiência, propagando {rpm, torque_nm, direction} pelo eixo.

Tipos:
- trans_gears      par de engrenagens (razão por dentes)
- trans_belt       correia + polias (razão por diâmetro)
- trans_chain      corrente + rodas dentadas (razão por dentes)
- trans_coupling   acoplamento (ráção 1:1)
- trans_screw      fuso/espi (rotação → linear)
- trans_linear     atuador linear elétrico (fuso + haste)

Convenção de ratio (redução):
    ω_out = ω_in / ratio      (ratio > 1 = redutor)
    τ_out = τ_in * ratio * η  (conservação de potência com perda)
"""
from typing import Any, Dict, List, Optional
import math
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger


# ============================================================
# HELPERS DE EIXO (shaft packets)
# ============================================================

def read_shaft(dev: Device, port_id: str = "shaft_in") -> Dict[str, Any]:
    """Lê pacote de eixo de uma porta mecânica. Aceita número ou dict."""
    raw = dev.read_port(port_id)
    if raw is None:
        return {"rpm": 0.0, "torque_nm": 0.0, "direction": 1}
    if isinstance(raw, (int, float)):
        return {"rpm": float(raw), "torque_nm": 0.0, "direction": 1 if raw >= 0 else -1}
    return {
        "rpm": float(raw.get("rpm", 0.0)),
        "torque_nm": float(raw.get("torque_nm", 0.0)),
        "direction": int(raw.get("direction", 1) or 1),
    }


def shaft_packet(rpm: float, torque_nm: float = 0.0, direction: int = 1) -> Dict[str, Any]:
    return {"rpm": rpm, "torque_nm": torque_nm, "direction": direction}


def _driven_by_drivetrain(dev: Device) -> bool:
    """
    True quando o resolvedor de trem de força já calculou esta transmissão
    neste tick — o behaviour próprio deve apenas consumir a flag e seguir
    os valores escritos pelo resolver (evita sobrescrever com eixo solto).
    """
    if dev.properties.get("_driven"):
        dev.properties["_driven"] = False
        return True
    return False


def _num(props: dict, key: str, default: float) -> float:
    v = props.get(key, default)
    if isinstance(v, dict):
        return float(v.get("value", default))
    return float(v)


def _val(props: dict, key: str, default: Any) -> Any:
    v = props.get(key, default)
    if isinstance(v, dict):
        return v.get("value", default)
    return v


# ============================================================
# ENGRENAGENS
# ============================================================

def create_gears() -> Device:
    """Par de engrenagens (razão por contagem de dentes)."""
    dev = Device(
        type_id="trans_gears",
        name="Par de Engrenagens",
        category=DeviceCategory.TRANSMISSION,
        properties={
            "teeth_in": 18,          # dentes do pinhão (entrada)
            "teeth_out": 54,         # dentes da coroa (saída)
            "ratio": None,           # calculado: teeth_out/teeth_in
            "efficiency": 0.96,
            # Estado
            "rpm_in": 0.0, "rpm_out": 0.0,
            "torque_out_nm": 0.0, "power_w": 0.0,
            "direction": 1,
        },
        ports=[
            Port.mechanical_in("shaft_in", "Eixo motor"),
            Port.mechanical_out("shaft_out", "Eixo carga"),
        ],
        metadata={"icon": "gears", "description": "Par de engrenagens (razão por dentes)"},
    )
    dev.fixations = []  # fixa por eixo, não por base

    def update(dev: Device, dt: float):
        if _driven_by_drivetrain(dev):
            return
        p = dev.properties
        z_in = float(_val(p, "teeth_in", 18))
        z_out = float(_val(p, "teeth_out", 54))
        ratio = (z_out / z_in) if z_in > 0 else 1.0
        eff = float(_val(p, "efficiency", 0.96))

        s = read_shaft(dev)
        rpm_in = s["rpm"]
        direction = s["direction"]
        # Engrenagens invertem o sentido a cada par
        rpm_out = (rpm_in / ratio) * (-1 if _val(p, "reverse", True) else 1) * direction
        torque_out = s["torque_nm"] * ratio * eff

        p["ratio"] = round(ratio, 3)
        p["rpm_in"] = rpm_in
        p["rpm_out"] = rpm_out
        p["torque_out_nm"] = round(torque_out, 3)
        p["power_w"] = round(abs(torque_out * rpm_out * math.pi / 30), 2)
        dev.write_port("shaft_out", shaft_packet(rpm_out, torque_out, -1 if _val(p, "reverse", True) else 1))

    dev.add_behaviour(Behaviour(name="gear_mesh", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# CORREIA + POLIAS
# ============================================================

def create_belt() -> Device:
    """Correia com polias (razão por diâmetro)."""
    dev = Device(
        type_id="trans_belt",
        name="Correia + Polias",
        category=DeviceCategory.TRANSMISSION,
        properties={
            "pulley_d_in_mm": 60,
            "pulley_d_out_mm": 180,
            "ratio": None,
            "efficiency": 0.94,
            "rpm_in": 0.0, "rpm_out": 0.0,
            "torque_out_nm": 0.0, "power_w": 0.0,
        },
        ports=[
            Port.mechanical_in("shaft_in", "Eixo motor"),
            Port.mechanical_out("shaft_out", "Eixo carga"),
        ],
        metadata={"icon": "belt", "description": "Transmissão por correia"},
    )
    dev.fixations = []

    def update(dev: Device, dt: float):
        if _driven_by_drivetrain(dev):
            return
        p = dev.properties
        d_in = float(_val(p, "pulley_d_in_mm", 60))
        d_out = float(_val(p, "pulley_d_out_mm", 180))
        ratio = (d_out / d_in) if d_in > 0 else 1.0
        eff = float(_val(p, "efficiency", 0.94))

        s = read_shaft(dev)
        rpm_out = s["rpm"] / ratio          # correia NÃO inverte sentido
        torque_out = s["torque_nm"] * ratio * eff
        p["ratio"] = round(ratio, 3)
        p["rpm_in"], p["rpm_out"] = s["rpm"], rpm_out
        p["torque_out_nm"] = round(torque_out, 3)
        p["power_w"] = round(abs(torque_out * rpm_out * math.pi / 30), 2)
        dev.write_port("shaft_out", shaft_packet(rpm_out, torque_out, s["direction"]))

    dev.add_behaviour(Behaviour(name="belt_drive", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# CORRENTE
# ============================================================

def create_chain() -> Device:
    """Corrente com rodas dentadas (sprockets)."""
    dev = Device(
        type_id="trans_chain",
        name="Corrente",
        category=DeviceCategory.TRANSMISSION,
        properties={
            "sprocket_in": 15,
            "sprocket_out": 45,
            "ratio": None,
            "efficiency": 0.95,
            "rpm_in": 0.0, "rpm_out": 0.0,
            "torque_out_nm": 0.0, "power_w": 0.0,
        },
        ports=[
            Port.mechanical_in("shaft_in", "Eixo motor"),
            Port.mechanical_out("shaft_out", "Eixo carga"),
        ],
        metadata={"icon": "chain", "description": "Transmissão por corrente"},
    )
    dev.fixations = []

    def update(dev: Device, dt: float):
        if _driven_by_drivetrain(dev):
            return
        p = dev.properties
        z_in = float(_val(p, "sprocket_in", 15))
        z_out = float(_val(p, "sprocket_out", 45))
        ratio = (z_out / z_in) if z_in > 0 else 1.0
        eff = float(_val(p, "efficiency", 0.95))
        s = read_shaft(dev)
        rpm_out = s["rpm"] / ratio
        torque_out = s["torque_nm"] * ratio * eff
        p["ratio"] = round(ratio, 3)
        p["rpm_in"], p["rpm_out"] = s["rpm"], rpm_out
        p["torque_out_nm"] = round(torque_out, 3)
        dev.write_port("shaft_out", shaft_packet(rpm_out, torque_out, s["direction"]))

    dev.add_behaviour(Behaviour(name="chain_drive", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# ACOPLAMENTO
# ============================================================

def create_coupling() -> Device:
    """Acoplamento (rácio 1:1, transmissão direta)."""
    dev = Device(
        type_id="trans_coupling",
        name="Acoplamento",
        category=DeviceCategory.TRANSMISSION,
        properties={
            "ratio": 1.0, "efficiency": 0.99,
            "elastic": True, "max_misalign_deg": 1.5,
            "rpm_in": 0.0, "rpm_out": 0.0,
            "torque_out_nm": 0.0,
        },
        ports=[
            Port.mechanical_in("shaft_in", "Eixo motor"),
            Port.mechanical_out("shaft_out", "Eixo carga"),
        ],
        metadata={"icon": "coupling", "description": "Acoplamento de eixos (1:1)"},
    )
    dev.fixations = []

    def update(dev: Device, dt: float):
        if _driven_by_drivetrain(dev):
            return
        p = dev.properties
        eff = float(_val(p, "efficiency", 0.99))
        s = read_shaft(dev)
        torque_out = s["torque_nm"] * eff
        p["rpm_in"], p["rpm_out"] = s["rpm"], s["rpm"]
        p["torque_out_nm"] = round(torque_out, 3)
        dev.write_port("shaft_out", shaft_packet(s["rpm"], torque_out, s["direction"]))

    dev.add_behaviour(Behaviour(name="coupling", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# FUSO / ATUADOR LINEAR ELÉTRICO
# ============================================================

def create_screw() -> Device:
    """Fuso (espi) — converte rotação em avanço linear."""
    dev = Device(
        type_id="trans_screw",
        name="Fuso (Esphi)",
        category=DeviceCategory.TRANSMISSION,
        properties={
            "lead_mm": 4.0,           # avanço por volta (mm)
            "diameter_mm": 16,
            "length_mm": 300,
            "efficiency": 0.85,
            # Estado
            "rpm_in": 0.0,
            "linear_speed_mm_s": 0.0,  # velocidade da porca/haste
            "position_mm": 0.0,        # posição acumulada
            "stroke_mm": 300,
        },
        ports=[
            Port.mechanical_in("shaft_in", "Eixo motor"),
            # Saída linear: pacote {position_mm, speed_mm_s}
            Port("linear_out", "Haste", PortDirection.OUTPUT, PortDomain.MECHANICAL,
                 PortDataType.PACKET, "mm/s"),
        ],
        metadata={"icon": "screw", "description": "Fuso de esferas/rolamento — rotação→linear"},
    )
    dev.fixations = []

    def update(dev: Device, dt: float):
        if _driven_by_drivetrain(dev):
            return
        p = dev.properties
        lead = float(_val(p, "lead_mm", 4.0))
        eff = float(_val(p, "efficiency", 0.85))
        s = read_shaft(dev)
        # v = n(rpm)/60 * lead * direção
        speed = (s["rpm"] * lead / 60.0) * s["direction"]
        pos = float(_val(p, "position_mm", 0.0)) + speed * dt
        stroke = float(_val(p, "stroke_mm", 300))
        pos = max(0.0, min(stroke, pos))
        p["rpm_in"] = s["rpm"]
        p["linear_speed_mm_s"] = round(speed, 4)
        p["position_mm"] = round(pos, 3)
        dev.write_port("linear_out", {"position_mm": pos, "speed_mm_s": speed, "efficiency": eff})

    dev.add_behaviour(Behaviour(name="screw_drive", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_linear_actuator() -> Device:
    """Atuador linear elétrico (fuso + motor integrado)."""
    dev = Device(
        type_id="trans_linear_actuator",
        name="Atuador Linear Elétrico",
        category=DeviceCategory.TRANSMISSION,
        properties={
            "stroke_mm": 400,
            "lead_mm": 5.0,
            "max_rpm": 3000,
            "position_mm": 0.0,
            "target_position_mm": 0.0,
            "linear_speed_mm_s": 0.0,
            "running": False,
            "extended_pct": 0.0,  # 0-100 para animação
        },
        ports=[
            Port.digital_input("extend", "Avançar"),
            Port.digital_input("retract", "Recuar"),
            Port.digital_input("stop", "Parar"),
            Port.analog_input("position_cmd", "Posição 0-10V", (0, 10), "V"),
            # Saída mecânica linear
            Port("linear_out", "Haste", PortDirection.OUTPUT, PortDomain.MECHANICAL,
                 PortDataType.PACKET, "mm/s"),
            Port.digital_output("at_end", "Fim de curso"),
        ],
        metadata={"icon": "linear_actuator", "description": "Atuador linear elétrico com haste"},
    )
    dev.fixations = [__import__("app.devices.fixation", fromlist=["FixationPoint"]).FixationPoint(
        "corpo", (0, 0, -0.15), (0, 0, -1), "mechanical", 0.2, "Corpo do atuador")]

    def update(dev: Device, dt: float):
        if _driven_by_drivetrain(dev):
            return
        p = dev.properties
        extend = dev.read_port("extend")
        retract = dev.read_port("retract")
        stop = dev.read_port("stop")
        cmd_v = dev.read_port("position_cmd") or 0.0

        stroke = float(_val(p, "stroke_mm", 400))
        lead = float(_val(p, "lead_mm", 5.0))
        max_rpm = float(_val(p, "max_rpm", 3000))
        speed_max = max_rpm * lead / 60.0  # mm/s

        pos = float(_val(p, "position_mm", 0.0))
        speed = 0.0
        if stop:
            p["running"] = False
        else:
            if extend and not retract:
                speed, p["running"] = speed_max, True
            elif retract and not extend:
                speed, p["running"] = -speed_max, True
            elif cmd_v and cmd_v > 0.05:
                target = (cmd_v / 10.0) * stroke
                err = target - pos
                if abs(err) > 0.5:
                    speed = math.copysign(speed_max, err)
                    p["running"] = True
                else:
                    p["running"] = False
        pos = max(0.0, min(stroke, pos + speed * dt))
        p["position_mm"] = round(pos, 3)
        p["linear_speed_mm_s"] = round(speed, 3)
        p["extended_pct"] = round(100.0 * pos / stroke, 1)
        dev.write_port("linear_out", {"position_mm": pos, "speed_mm_s": speed})
        dev.write_port("at_end", pos >= stroke - 0.5 or pos <= 0.5)

    dev.add_behaviour(Behaviour(name="actuator_control", trigger=Trigger.ON_TICK, action=update))
    return dev


def ratio_of(dev: Device) -> float:
    """
    Relação de transmissão de um dispositivo, calculada a partir das
    propriedades — funciona mesmo antes do primeiro tick (ratio=None).
    """
    p = dev.properties
    r = p.get("ratio")
    if r is not None:
        try:
            v = float(r)
            if v > 0:
                return v
        except (TypeError, ValueError):
            pass
    t = dev.type_id
    try:
        if t == "trans_gears":
            z1 = float(_val(p, "teeth_in", 18)); z2 = float(_val(p, "teeth_out", 54))
            return (z2 / z1) if z1 > 0 else 1.0
        if t == "trans_belt":
            d1 = float(_val(p, "pulley_d_in_mm", 60)); d2 = float(_val(p, "pulley_d_out_mm", 180))
            return (d2 / d1) if d1 > 0 else 1.0
        if t == "trans_chain":
            z1 = float(_val(p, "sprocket_in", 15)); z2 = float(_val(p, "sprocket_out", 45))
            return (z2 / z1) if z1 > 0 else 1.0
    except (TypeError, ValueError):
        pass
    return 1.0


TRANSMISSION_FACTORY = {
    "trans_gears": create_gears,
    "trans_belt": create_belt,
    "trans_chain": create_chain,
    "trans_coupling": create_coupling,
    "trans_screw": create_screw,
    "trans_linear_actuator": create_linear_actuator,
}
