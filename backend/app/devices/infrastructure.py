"""
Infrastructure — Biblioteca de elementos de infraestrutura

Elementos que dão SUPORTE e CONDUÇÃO:
- Estrutura: base plana, viga, pilar, perfilado, trilho DIN
- Condução: eletroduto (conduit), calha (cable tray), leito de cabos

Todos expõem MountSlots (vagas de fixação magnética) e, os de condução,
um trajeto (waypoints) por onde cabos podem correr.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from loguru import logger

from app.devices.base import Device, DeviceCategory
from app.devices.fixation import MountSlot, FixDomain
from app.core.ids import ids

Vec3 = Tuple[float, float, float]


# ============================================================
# ESTRUTURA (suporte)
# ============================================================

def create_base_plate() -> Device:
    """Base plana com grade de furos de fixação (vaga magnética)."""
    dev = Device(
        type_id="infra_base_plate",
        name="Base Plana",
        category=DeviceCategory.STRUCTURE,
        properties={
            "cols": 4, "rows": 3, "spacing_m": 1.0,
            "material": "aço", "thickness_mm": 10,
        },
        ports=[],
        metadata={"icon": "base_plate", "description": "Base com grade de fixação"},
    )
    dev.layer = "infrastructure"
    dev.slots = _grid_slots(dev.id, 4, 3, 1.0, origin=(0, 0, 0))
    dev.conduit_path = None
    return dev


def create_i_beam() -> Device:
    """Viga I linear com slots ao longo."""
    dev = Device(
        type_id="infra_i_beam",
        name="Viga I",
        category=DeviceCategory.STRUCTURE,
        properties={
            "length_m": 4.0, "height_mm": 100, "slots_per_m": 2,
            "material": "aço",
        },
        ports=[],
        metadata={"icon": "i_beam", "description": "Viga estrutural I"},
    )
    dev.layer = "infrastructure"
    dev.slots = _line_slots(dev.id, 4.0, 2, origin=(0, 0, 0), axis="x")
    dev.conduit_path = None
    return dev


def create_pillar() -> Device:
    """Pilar vertical com slots em altura."""
    dev = Device(
        type_id="infra_pillar",
        name="Pilar",
        category=DeviceCategory.STRUCTURE,
        properties={"height_m": 2.5, "section_mm": 80, "slots": 5, "material": "aço"},
        ports=[],
        metadata={"icon": "pillar", "description": "Pilar de sustentação"},
    )
    dev.layer = "infrastructure"
    dev.slots = _line_slots(dev.id, 2.5, 5, origin=(0, 0, 0), axis="y")
    dev.conduit_path = None
    return dev


def create_aluminum_profile() -> Device:
    """Perfilado de alumínio modular (tipo 8020) — slots nas ranhuras."""
    dev = Device(
        type_id="infra_profile_alu",
        name="Perfilado Alumínio",
        category=DeviceCategory.STRUCTURE,
        properties={"length_m": 1.0, "section_mm": 40, "slot_pitch_m": 0.125, "material": "alumínio"},
        ports=[],
        metadata={"icon": "profile", "description": "Perfilado modular 40mm"},
    )
    dev.layer = "infrastructure"
    dev.slots = _line_slots(dev.id, 1.0, 8, origin=(0, 0, 0), axis="x")
    dev.conduit_path = None
    return dev


def create_din_rail() -> Device:
    """Trilho DIN 35mm — para CLPs, relés, bornes (fixação elétrica)."""
    dev = Device(
        type_id="infra_din_rail",
        name="Trilho DIN 35mm",
        category=DeviceCategory.STRUCTURE,
        properties={"length_m": 1.0, "positions": 10, "width_mm": 35},
        ports=[],
        metadata={"icon": "din_rail", "description": "Trilho DIN para painel elétrico"},
    )
    dev.layer = "infrastructure"
    dev.slots = _line_slots(dev.id, 1.0, 10, origin=(0, 0, 0), axis="x", accepts=[FixDomain.ELECTRICAL])
    dev.conduit_path = None
    return dev


# ============================================================
# CONDUÇÃO (eletrodutos, calhas)
# ============================================================

def create_conduit() -> Device:
    """Eletroduto (conduit) — conduz cabos elétricos por um trajeto."""
    dev = Device(
        type_id="infra_conduit",
        name="Eletroduto",
        category=DeviceCategory.STRUCTURE,
        properties={
            "diameter_mm": 25, "length_m": 2.0, "material": "PVC",
            "fill_ratio_max": 0.4,
        },
        ports=[
            # Portas de passagem de cabos (elétrica) em cada extremidade
        ],
        metadata={"icon": "conduit", "description": "Eletroduto para cabos"},
    )
    dev.layer = "infrastructure"
    dev.slots = []
    # Trajeto do duto: waypoints que os cabos seguem
    dev.conduit_path = _conduit_waypoints(2.0, origin=(0, 0, 0), axis="x")
    return dev


def create_cable_tray() -> Device:
    """Calha (cable tray) — conduz feixes de cabos."""
    dev = Device(
        type_id="infra_cable_tray",
        name="Calha de Cabos",
        category=DeviceCategory.STRUCTURE,
        properties={
            "width_mm": 200, "height_mm": 50, "length_m": 2.0,
            "max_load_kg": 30, "material": "aço galvanizado",
        },
        ports=[],
        metadata={"icon": "cable_tray", "description": "Calha para feixes de cabos"},
    )
    dev.layer = "infrastructure"
    dev.slots = []
    dev.conduit_path = _conduit_waypoints(2.0, origin=(0, 0, 0), axis="x", y=0.3)
    return dev


# ============================================================
# GERADORES DE SLOTS E TRAJETOS
# ============================================================

def _grid_slots(owner_id: str, cols: int, rows: int, spacing: float,
                origin: Vec3 = (0, 0, 0), accepts: List[str] = None) -> List[MountSlot]:
    """Grade de furos numa base plana."""
    accepts = accepts or [FixDomain.MECHANICAL]
    slots = []
    ox, oy, oz = origin
    for r in range(rows):
        for c in range(cols):
            x = ox + (c - (cols - 1) / 2) * spacing
            z = oz + (r - (rows - 1) / 2) * spacing
            slots.append(MountSlot(
                id=f"{owner_id}_slot_{len(slots):02d}",
                position=(x, oy, z),
                normal=(0, 1, 0),
                accepts=accepts,
                label=f"Furo {c},{r}",
            ))
    return slots


def _line_slots(owner_id: str, length_m: float, count: int, origin: Vec3 = (0, 0, 0),
                axis: str = "x", accepts: List[str] = None) -> List[MountSlot]:
    """Slots igualmente espaçados ao longo de um eixo."""
    accepts = accepts or [FixDomain.MECHANICAL]
    slots = []
    ox, oy, oz = origin
    for i in range(max(1, count)):
        t = i / max(1, count - 1) if count > 1 else 0.5
        d = (t - 0.5) * length_m
        if axis == "x":
            pos = (ox + d, oy, oz)
        elif axis == "y":
            pos = (ox, oy + d, oz)
        else:
            pos = (ox, oy, oz + d)
        slots.append(MountSlot(
            id=f"{owner_id}_slot_{len(slots):02d}",
            position=pos,
            normal=(0, 1, 0) if axis != "y" else (1, 0, 0),
            accepts=accepts,
            label=f"Posição {i + 1}",
        ))
    return slots


def _conduit_waypoints(length_m: float, origin: Vec3 = (0, 0, 0),
                       axis: str = "x", y: float = 0.0) -> List[Vec3]:
    """Trajeto (waypoints) por onde cabos correm dentro do duto/calha."""
    ox, oy, oz = origin
    step = length_m / 6
    pts = []
    for i in range(7):
        d = (i - 3) * step
        if axis == "x":
            pts.append((ox + d, oy + y, oz))
        else:
            pts.append((ox, oy + y, oz + d))
    return pts


# ============================================================
# CATÁLOGO
# ============================================================

INFRA_FACTORY = {
    "infra_base_plate": create_base_plate,
    "infra_i_beam": create_i_beam,
    "infra_pillar": create_pillar,
    "infra_profile_alu": create_aluminum_profile,
    "infra_din_rail": create_din_rail,
    "infra_conduit": create_conduit,
    "infra_cable_tray": create_cable_tray,
}