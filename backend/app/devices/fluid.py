"""
Fluid — Base de elementos de fluidos

Elementos para manipular fluidos (líquidos, gases, granulado):
- pump_centrifugal  motobomba centrífuga (leis de afinidade: Q ∝ ω, H ∝ ω²)
- pump_dosing       bomba dosadora (volume por curso × cursos)
- flow_vortex       medidor de vazão por vórtex (frequência de Kármán)
- valve_control      válvula de controle (vazão por coeficiente Cv)
- duct              duto escalável (diâmetro × segmentos, com flanges)
- flange            flange de conexão de dutos
- tank              tanque reservatório (nível, enchimento/drenagem)

A propagação é v1 (orientada): a bomba é a fonte de vazão, os
elementos a jusante leem a vazão e aplicam suas leis. Uma rede
completa com resolvedor de malhas entra na fase de dinâmica de fluidos.
"""
from typing import Any, Dict, List, Optional
import math
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger
from app.devices.fixation import FixationPoint, FixDomain


def _num(props: dict, key: str, default: float) -> float:
    v = props.get(key, default)
    if isinstance(v, dict):
        v = v.get("value", default)
    try:
        return float(v)
    except (TypeError, ValueError):
        return float(default)


def _read_flow(dev: Device, port_id: str = "fluid_in") -> float:
    """Lê vazão (m³/h) de uma porta de fluido."""
    v = dev.read_port(port_id)
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, dict):
        return float(v.get("flow_m3h", 0.0))
    return 0.0


def _read_rpm(dev: Device) -> float:
    from app.devices.transmission import read_shaft
    return read_shaft(dev, "shaft")["rpm"]


# ============================================================
# MOTOBOMBA CENTRÍFUGA
# ============================================================

def create_pump() -> Device:
    """Motobomba centrífuga — vazão/altura manométrica pelas leis de afinidade."""
    dev = Device(
        type_id="pump_centrifugal",
        name="Motobomba Centrífuga",
        category=DeviceCategory.ACTUATOR,
        properties={
            "nominal_rpm": 1450,
            "nominal_flow_m3h": 12.0,
            "nominal_head_m": 20.0,
            "efficiency": 0.72,
            # estado
            "rpm": 0.0,
            "flow_m3h": 0.0,
            "head_m": 0.0,
            "power_w": 0.0,
            "running": False,
        },
        ports=[
            Port.mechanical_in("shaft", "Eixo motor"),
            Port.fluid_in("fluid_in", "Sucção"),
            Port.fluid_out("fluid_out", "Recalque"),
            Port.analog_output("flow_out", "AO Vazão", (0, 50), "m³/h"),
            Port.digital_output("run_status", "Rodando"),
        ],
        metadata={"icon": "pump", "description": "Motobomba centrífuga (leis de afinidade)"},
    )
    dev.fixations = [FixationPoint("base", (0, -0.2, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.25, "Base")]

    def update(dev: Device, dt: float):
        p = dev.properties
        rpm = _read_rpm(dev)
        n0 = _num(p, "nominal_rpm", 1450) or 1
        q0 = _num(p, "nominal_flow_m3h", 12.0)
        h0 = _num(p, "nominal_head_m", 20.0)
        eff = _num(p, "efficiency", 0.72)
        ratio = rpm / n0
        q = q0 * ratio                     # leis de afinidade: Q ∝ ω
        h = h0 * ratio ** 2                # H ∝ ω²
        power = (q / 3600.0 * 1000.0 * 9.81 * h) / max(0.01, eff) if q > 0 else 0.0
        p.update({"rpm": round(rpm, 1), "flow_m3h": round(q, 3),
                  "head_m": round(h, 3), "power_w": round(power, 1),
                  "running": rpm > 1})
        dev.write_port("flow_out", q)
        dev.write_port("fluid_out", {"flow_m3h": q, "pressure_bar": max(0.1, h / 10.0), "medium": "water"})
        dev.write_port("run_status", rpm > 1)
        dev.state["active"] = rpm > 1

    dev.add_behaviour(Behaviour(name="pump_affinity", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# BOMBA DOSADORA
# ============================================================

def create_dosing_pump() -> Device:
    """Bomba dosadora — volume por curso × cursos por minuto."""
    dev = Device(
        type_id="pump_dosing",
        name="Bomba Dosadora",
        category=DeviceCategory.ACTUATOR,
        properties={
            "stroke_volume_ml": 5.0,
            "max_strokes_per_min": 120,
            "flow_ml_min": 0.0,
            "stroke_position": 0.0,   # 0..1 animação do diafragma
            "running": False,
        },
        ports=[
            Port.digital_input("run", "Ligar"),
            Port.analog_input("rate_cmd", "Dose 0-10V", (0, 10), "V"),
            Port.fluid_in("fluid_in", "Sucção"),
            Port.fluid_out("fluid_out", "Injeção"),
            Port.analog_output("flow_out", "AO Vazão", (0, 500), "mL/min"),
        ],
        metadata={"icon": "dosing_pump", "description": "Bomba dosadora volumétrica"},
    )
    dev.fixations = [FixationPoint("base", (0, -0.15, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.15, "Base")]

    def update(dev: Device, dt: float):
        p = dev.properties
        run = dev.read_port("run")
        cmd = dev.read_port("rate_cmd") or 0.0
        vol = _num(p, "stroke_volume_ml", 5.0)
        max_spm = _num(p, "max_strokes_per_min", 120)
        spm = (cmd / 10.0) * max_spm
        flow = vol * spm  # mL/min
        p["flow_ml_min"] = round(flow, 3)
        p["running"] = bool(run) and flow > 0
        # animação: cada curso é um ciclo
        pos = (p.get("stroke_position", 0.0) + (spm / 60.0) * dt) % 1.0
        p["stroke_position"] = round(pos, 4)
        dev.write_port("flow_out", flow)
        dev.write_port("fluid_out", {"flow_ml_min": flow,
                                     "flow_m3h": flow * 60 / 1e6,
                                     "pressure_bar": 2.0})
        dev.state["active"] = p["running"]

    dev.add_behaviour(Behaviour(name="dosing", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# MEDIDOR DE VAZÃO VORTEX
# ============================================================

def create_vortex_meter() -> Device:
    """
    Medidor de vazão por vórtex (von Kármán):
    f = St * v / d  →  v = f * d / St  →  Q = v * A
    """
    dev = Device(
        type_id="flow_vortex",
        name="Medidor de Vazão Vortex",
        category=DeviceCategory.SENSOR,
        properties={
            "pipe_diameter_mm": 50,
            "strouhal": 0.2,
            "flow_m3h": 0.0,
            "vortex_freq_hz": 0.0,     # simulado
            "total_m3": 0.0,
            "temperature_c": 20.0,
        },
        ports=[
            Port.fluid_in("fluid_in", "Entrada"),
            Port.fluid_out("fluid_out", "Saída"),
            Port.analog_output("flow_out", "AO Vazão", (0, 100), "m³/h"),
            Port.analog_output("total_out", "AO Totalizador", (0, 1e6), "m³"),
            Port.analog_input("temp_in", "Temperatura", (0, 150), "°C"),
        ],
        metadata={"icon": "vortex", "description": "Medidor de vazão por vórice (Kármán)"},
    )
    dev.fixations = [FixationPoint("flange_in", (-0.12, 0, 0), (-1, 0, 0), FixDomain.MECHANICAL, 0.12, "Flange entrada"),
                     FixationPoint("flange_out", (0.12, 0, 0), (1, 0, 0), FixDomain.MECHANICAL, 0.12, "Flange saída")]

    def update(dev: Device, dt: float):
        p = dev.properties
        q = _read_flow(dev, "fluid_in")
        d_mm = _num(p, "pipe_diameter_mm", 50)
        st = _num(p, "strouhal", 0.2)
        d_m = d_mm / 1000.0
        area = math.pi * (d_m / 2) ** 2
        # v = Q/A  (Q em m³/s)
        v = (q / 3600.0) / area if area else 0.0
        f = st * v / d_m if d_m else 0.0
        p["flow_m3h"] = round(q, 3)
        p["vortex_freq_hz"] = round(f, 2)
        p["total_m3"] = round(p.get("total_m3", 0.0) + (q / 3600.0) * dt, 4)
        t = dev.read_port("temp_in")
        if t is not None:
            p["temperature_c"] = float(t)
        dev.write_port("flow_out", q)
        dev.write_port("fluid_out", {"flow_m3h": q, "pressure_bar": 1.0})
        dev.write_port("total_out", p["total_m3"])
        dev.state["active"] = q > 0

    dev.add_behaviour(Behaviour(name="vortex_measure", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# VÁLVULA DE CONTROLE
# ============================================================

def create_valve() -> Device:
    """Válvula de controle — vazão pelo coeficiente Cv e abertura."""
    dev = Device(
        type_id="valve_control",
        name="Válvula de Controle",
        category=DeviceCategory.ACTUATOR,
        properties={
            "dn_mm": 50,
            "cv_full": 40.0,          # coeficiente de vazão 100% aberta
            "opening_pct": 0.0,
            "inlet_pressure_bar": 3.0,
            "outlet_pressure_bar": 1.0,
            "flow_m3h": 0.0,
            "fail_position": "closed",
        },
        ports=[
            Port.fluid_in("fluid_in", "Entrada"),
            Port.fluid_out("fluid_out", "Saída"),
            Port.analog_input("cmd", "Comando 0-10V", (0, 10), "V"),
            Port.analog_output("flow_out", "AO Vazão", (0, 100), "m³/h"),
        ],
        metadata={"icon": "valve", "description": "Válvula de controle proporcional (Cv)"},
    )

    def update(dev: Device, dt: float):
        p = dev.properties
        cmd = dev.read_port("cmd") or 0.0
        opening = max(0.0, min(100.0, (cmd / 10.0) * 100.0))
        p["opening_pct"] = round(opening, 1)
        q_in = _read_flow(dev, "fluid_in")
        cv = _num(p, "cv_full", 40.0) * (opening / 100.0)
        dp = max(0.0, _num(p, "inlet_pressure_bar", 3.0) - _num(p, "outlet_pressure_bar", 1.0))
        # Q = Cv * sqrt(ΔP) (água, unidades empíricas)
        q_valve = cv * math.sqrt(dp)
        q = min(q_in, q_valve) if q_in > 0 else q_valve
        p["flow_m3h"] = round(q, 3)
        dev.write_port("flow_out", q)
        dev.write_port("fluid_out", {"flow_m3h": q, "pressure_bar": _num(p, "outlet_pressure_bar", 1.0)})
        dev.state["active"] = opening > 0

    dev.add_behaviour(Behaviour(name="valve_control", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# DUTO ESCALÁVEL
# ============================================================

def create_duct() -> Device:
    """Duto escalável (diâmetro × segmentos) com flanges nas pontas."""
    dev = Device(
        type_id="duct",
        name="Duto",
        category=DeviceCategory.STRUCTURE,
        properties={
            "diameter_mm": 100,
            "segments": 4,          # escalável: puxar para mais segmentos
            "segment_length_m": 1.0,
            "insulated": False,
            "medium": "air",
            "flow_m3h": 0.0,
        },
        ports=[
            Port.fluid_in("fluid_in", "Entrada"),
            Port.fluid_out("fluid_out", "Saída"),
        ],
        metadata={"icon": "duct", "description": "Duto escalável com flanges"},
    )
    dev.layer = "infrastructure"
    dev.fixations = [FixationPoint("flange_a", (-0.5, 0, 0), (-1, 0, 0), FixDomain.MECHANICAL, 0.15, "Flange A"),
                     FixationPoint("flange_b", (0.5, 0, 0), (1, 0, 0), FixDomain.MECHANICAL, 0.15, "Flange B")]

    def update(dev: Device, dt: float):
        p = dev.properties
        q = _read_flow(dev, "fluid_in")
        p["flow_m3h"] = round(q, 3)
        p["length_m"] = round(_num(p, "segments", 4) * _num(p, "segment_length_m", 1.0), 2)
        dev.write_port("fluid_out", {"flow_m3h": q, "pressure_bar": max(0.05, 1.0 - 0.02 * _num(p, "segments", 4))})
        dev.state["active"] = q > 0

    def resize(segments: int = None, diameter_mm: int = None):
        if segments is not None:
            dev.properties["segments"] = max(1, min(60, int(segments)))
        if diameter_mm is not None:
            dev.properties["diameter_mm"] = max(20, min(1000, int(diameter_mm)))

    dev.add_behaviour(Behaviour(name="duct_flow", trigger=Trigger.ON_TICK, action=update))
    dev.resize = resize
    return dev


# ============================================================
# FLANGE
# ============================================================

def create_flange() -> Device:
    """Flange — conecta dutos entre si (ou a um equipamento)."""
    dev = Device(
        type_id="flange",
        name="Flange",
        category=DeviceCategory.STRUCTURE,
        properties={"dn_mm": 100, "standard": "ISO", "gasket": True},
        ports=[
            Port.fluid_in("fluid_a", "Lado A"),
            Port.fluid_out("fluid_b", "Lado B"),
        ],
        metadata={"icon": "flange", "description": "Flange de conexão ISO"},
    )
    dev.layer = "infrastructure"
    dev.fixations = [FixationPoint("furo", (0, 0, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.1, "Furo")]

    def update(dev: Device, dt: float):
        q = _read_flow(dev, "fluid_a")
        dev.write_port("fluid_b", {"flow_m3h": q, "pressure_bar": 1.0})

    dev.add_behaviour(Behaviour(name="flange_pass", trigger=Trigger.ON_TICK, action=update))
    return dev


# ============================================================
# TANQUE RESERVATÓRIO
# ============================================================

def create_tank() -> Device:
    """Tanque reservatório — nível sobe com enchimento, desce com drenagem."""
    dev = Device(
        type_id="tank",
        name="Tanque",
        category=DeviceCategory.STRUCTURE,
        properties={
            "capacity_l": 500.0,
            "level_l": 0.0,
            "level_pct": 0.0,
            "medium": "water",
            "inflow_m3h": 0.0,
            "outflow_m3h": 0.0,
        },
        ports=[
            Port.fluid_in("inlet", "Entrada"),
            Port.fluid_out("outlet", "Saída"),
            Port.analog_input("drain_cmd", "Drenagem 0-10V", (0, 10), "V"),
            Port.analog_output("level_out", "AO Nível", (0, 100), "%"),
        ],
        metadata={"icon": "tank", "description": "Tanque reservatório com nível"},
    )
    dev.layer = "infrastructure"
    dev.fixations = [FixationPoint("base", (0, -0.5, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.4, "Base")]

    def update(dev: Device, dt: float):
        p = dev.properties
        cap = _num(p, "capacity_l", 500.0)
        q_in = _read_flow(dev, "inlet")
        drain = dev.read_port("drain_cmd") or 0.0
        q_out = (drain / 10.0) * 50.0   # drenagem até 50 m³/h
        level = _num(p, "level_l", 0.0) + (q_in / 1000.0) * dt * 1000 - (q_out / 1000.0) * dt * 1000
        level = max(0.0, min(cap, level))
        p["level_l"] = round(level, 2)
        p["level_pct"] = round(100.0 * level / cap, 1)
        p["inflow_m3h"], p["outflow_m3h"] = round(q_in, 3), round(q_out, 3)
        dev.write_port("level_out", p["level_pct"])
        dev.write_port("outlet", {"flow_m3h": q_out, "pressure_bar": max(0.1, level / cap * 2.0)})
        dev.state["active"] = p["level_pct"] > 0

    dev.add_behaviour(Behaviour(name="tank_level", trigger=Trigger.ON_TICK, action=update))
    return dev


FLUID_FACTORY = {
    "pump_centrifugal": create_pump,
    "pump_dosing": create_dosing_pump,
    "flow_vortex": create_vortex_meter,
    "valve_control": create_valve,
    "duct": create_duct,
    "flange": create_flange,
    "tank": create_tank,
}
