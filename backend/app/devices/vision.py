"""
Vision — Elementos de referência para cenas de visão computacional

Peças que existem para serem *vistas* pela câmera:
- vision_tape   fita colorida (marca de chão/parede) — detecção por cor
- vision_marker marcador de ID (tipo ArUco simples) — detecção por contorno
- vision_target alvo de calibração (xadrez) — calibração de câmera

A câmera (camera_ip) tem VISTA FIXA: posição + yaw/pitch/fov definidos.
O detector de referências projeta o que está no campo de visão e
devolve bounding boxes normalizadas (0..1) para overlay na UI.
"""
from typing import Any, Dict, List, Optional
import math
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger
from app.devices.fixation import FixationPoint, FixDomain


# Cores de referência conhecidas pelo pipeline (HSV aproximado documentado)
TAPE_COLORS = {
    "amarela":  {"hex": "#F5C518", "hsv": [(20, 100, 100), (35, 255, 255)]},
    "vermelha": {"hex": "#E53935", "hsv": [(0, 100, 100), (10, 255, 255)]},
    "verde":    {"hex": "#43A047", "hsv": [(40, 100, 100), (80, 255, 255)]},
    "azul":     {"hex": "#1E88E5", "hsv": [(95, 100, 100), (125, 255, 255)]},
    "branca":   {"hex": "#ECEFF1", "hsv": [(0, 0, 180), (180, 40, 255)]},
    "preta":    {"hex": "#212121", "hsv": [(0, 0, 0), (180, 255, 45)]},
}


def create_tape() -> Device:
    """Fita colorida de referência (marca no chão/parede)."""
    dev = Device(
        type_id="vision_tape",
        name="Fita de Referência",
        category=DeviceCategory.VISION,
        properties={
            "color": "amarela",
            "color_hex": TAPE_COLORS["amarela"]["hex"],
            "length_cm": 50,
            "width_cm": 5,
            "plane": "floor",       # floor | wall | bench
            "orientation_deg": 0,   # rotação no plano
        },
        ports=[],
        metadata={"icon": "tape", "description": "Fita colorida — referência para detecção por cor"},
    )
    dev.layer = "vision"
    dev.fixations = [FixationPoint("adesivo", (0, 0, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Faixa adesiva")]
    return dev


def create_marker() -> Device:
    """Marcador de identificação (tipo ArUco simplificado)."""
    dev = Device(
        type_id="vision_marker",
        name="Marcador de ID",
        category=DeviceCategory.VISION,
        properties={
            "marker_id": 7,
            "size_mm": 100,
            "pattern": "aruco_4x4",
            "plane": "wall",
        },
        ports=[],
        metadata={"icon": "marker", "description": "Marcador com ID — detecção por contorno"},
    )
    dev.layer = "vision"
    dev.fixations = [FixationPoint("adesivo", (0, 0, 0), (0, 0, 1), FixDomain.MECHANICAL, 0.15, "Base adesiva")]
    return dev


def create_target() -> Device:
    """Alvo de calibração (xadrez) para calibrar a câmera."""
    dev = Device(
        type_id="vision_target",
        name="Alvo de Calibração",
        category=DeviceCategory.VISION,
        properties={
            "rows": 6, "cols": 9,
            "square_mm": 25,
            "plane": "wall",
        },
        ports=[],
        metadata={"icon": "target", "description": "Xadrez de calibração de câmera"},
    )
    dev.layer = "vision"
    dev.fixations = [FixationPoint("suporte", (0, 0, -0.05), (0, 0, -1), FixDomain.MECHANICAL, 0.3, "Suporte rígido")]
    return dev


def create_reference_corner() -> Device:
    """Canto de referência em L (origem de coordenadas da cena)."""
    dev = Device(
        type_id="vision_corner",
        name="Canto de Referência",
        category=DeviceCategory.VISION,
        properties={
            "arm_length_cm": 40,
            "color_a": "vermelha",
            "color_b": "verde",
        },
        ports=[],
        metadata={"icon": "corner", "description": "Canto em L — origem da cena"},
    )
    dev.layer = "vision"
    dev.fixations = [FixationPoint("base", (0, 0, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.25, "Base")]
    return dev


VISION_FACTORY = {
    "vision_tape": create_tape,
    "vision_marker": create_marker,
    "vision_target": create_target,
    "vision_corner": create_reference_corner,
}


# ============================================================
# DETECÇÃO DE REFERÊNCIAS (projeção pela vista da câmera)
# ============================================================

def _camera_basis(yaw_deg: float, pitch_deg: float):
    """Base ortonormal da câmera a partir de yaw/pitch (graus)."""
    yaw = math.radians(yaw_deg)
    pitch = math.radians(pitch_deg)
    forward = (
        math.sin(yaw) * math.cos(pitch),
        math.sin(pitch),
        math.cos(yaw) * math.cos(pitch),
    )
    right = (math.cos(yaw), 0.0, -math.sin(yaw))
    ux = right[1] * forward[2] - right[2] * forward[1]
    uy = right[2] * forward[0] - right[0] * forward[2]
    uz = right[0] * forward[1] - right[1] * forward[0]
    return forward, right, (ux, uy, uz)


def detect_references(camera: Device, nodes: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Projeta as referências de visão no campo de vista FIXO da câmera.
    Retorna detecções com bbox normalizada [x, y, w, h] em 0..1.
    """
    props = camera.properties
    cam_pos = list(camera.transform.position)
    yaw = float(props.get("yaw_deg", 0) or 0)
    pitch = float(props.get("pitch_deg", 0) or 0)
    vfov = float(props.get("fov_deg", 60) or 60)
    res = props.get("resolution", [640, 480]) or [640, 480]
    aspect = max(0.1, float(res[0]) / float(res[1]) if res and len(res) >= 2 else 1.333)

    tan_v = max(1e-6, math.tan(math.radians(vfov / 2.0)))
    tan_h = tan_v * aspect
    forward, right, up = _camera_basis(yaw, pitch)

    detections: List[Dict[str, Any]] = []

    for node in nodes.values():
        layer = getattr(node, "layer", "")
        type_id = getattr(node, "type_id", "")
        if not (layer == "vision" or type_id.startswith("vision_")):
            continue

        npos = list(node.transform.position)
        v = (npos[0] - cam_pos[0], npos[1] - cam_pos[1], npos[2] - cam_pos[2])
        dist = math.sqrt(sum(c * c for c in v)) or 0.001

        cz = sum(a * b for a, b in zip(v, forward))
        cx = sum(a * b for a, b in zip(v, right))
        cy = sum(a * b for a, b in zip(v, up))
        if cz <= 0.05:
            continue  # atrás da câmera

        ndc_x = (cx / cz) / tan_h
        ndc_y = (cy / cz) / tan_v
        if abs(ndc_x) > 1.0 or abs(ndc_y) > 1.0:
            continue  # fora do campo

        p = node.properties
        if type_id == "vision_tape":
            size_m = (float(p.get("length_cm", 50)) / 100.0,
                      0.02,
                      float(p.get("width_cm", 5)) / 100.0)
            label = f"Fita {p.get('color', '')}"
            detector = "color"
            conf = 0.95
        elif type_id == "vision_marker":
            s = float(p.get("size_mm", 100)) / 1000.0
            size_m = (s, s, s)
            label = f"Marcador #{p.get('marker_id', '?')}"
            detector = "aruco_contour"
            conf = 0.92
        elif type_id == "vision_target":
            cols, rows = float(p.get("cols", 9)), float(p.get("rows", 6))
            s = float(p.get("square_mm", 25)) / 1000.0
            size_m = (cols * s, rows * s, s)
            label = "Alvo calibração"
            detector = "chessboard"
            conf = 0.99
        else:
            s = float(p.get("arm_length_cm", 40)) / 100.0
            size_m = (s, s, s)
            label = "Canto referência"
            detector = "contours"
            conf = 0.9

        w_ang = 2 * math.atan2(size_m[0] / 2.0, dist)
        h_ang = 2 * math.atan2(size_m[1] / 2.0, dist)
        w_norm = min(1.0, math.degrees(w_ang / 2) / (vfov * aspect * 0.5))
        h_norm = min(1.0, math.degrees(h_ang / 2) / (vfov * 0.5))

        bbox = [
            round((ndc_x + 1) / 2 - w_norm / 2, 4),
            round((ndc_y + 1) / 2 - h_norm / 2, 4),
            round(max(0.01, w_norm), 4),
            round(max(0.01, h_norm), 4),
        ]
        detections.append({
            "reference_id": node.id,
            "type": type_id,
            "label": label,
            "detector": detector,
            "confidence": conf,
            "bbox": bbox,
            "world_position": [round(n, 3) for n in npos],
            "distance_m": round(dist, 3),
        })

    return detections
