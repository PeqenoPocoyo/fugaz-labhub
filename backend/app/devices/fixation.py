"""
Fixation — Sistema de pontos de fixação e encaixe magnético

Define:
- FixationPoint: ponto de montagem de um DISPOSITIVO (flange, eixo, trilho DIN)
- MountSlot: slot de montagem de uma INFRAESTRUTURA (furo, ranhura, perfil)
- MagneticSystem: resolvedor que calcula o encaixe (snap) entre os dois

É geometry-agnostic: funciona com cubos hoje e malhas 3D reais amanhã,
porque opera sobre pontos/normais, não sobre geometria.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
import math
from loguru import logger

Vec3 = Tuple[float, float, float]


# ============================================================
# DOMÍNIOS DE FIXAÇÃO
# ============================================================

class FixDomain:
    MECHANICAL = "mechanical"   # parafuso, flange, eixo
    ELECTRICAL = "electrical"   # trilho DIN, borne
    PNEUMATIC = "pneumatic"     # conexão de ar
    HYDRAULIC = "hydraulic"     # conexão de fluído
    THERMAL = "thermal"         # troca de calor


# ============================================================
# PONTO DE FIXAÇÃO (no dispositivo)
# ============================================================

@dataclass
class FixationPoint:
    """
    Ponto de montagem de um dispositivo.
    Ex: flange da base de um motor, eixo, trilho DIN de um CLP.
    """
    id: str                     # "flange_base", "eixo", "trilho_din"
    local_offset: Vec3 = (0, 0, 0)   # relativo à origem do dispositivo
    normal: Vec3 = (0, 1, 0)         # direção da superfície de montagem
    domain: str = FixDomain.MECHANICAL
    radius: float = 0.25             # raio de captura do ímã (metros)
    label: str = ""

    def world_position(self, device_pos: Vec3) -> Vec3:
        """Posição mundial do ponto, dada a posição do dispositivo."""
        return (
            device_pos[0] + self.local_offset[0],
            device_pos[1] + self.local_offset[1],
            device_pos[2] + self.local_offset[2],
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "local_offset": self.local_offset, "normal": self.normal,
            "domain": self.domain, "radius": self.radius, "label": self.label,
        }


# ============================================================
# SLOT DE MONTAGEM (na infraestrutura)
# ============================================================

@dataclass
class MountSlot:
    """
    Slot de montagem em elemento de infraestrutura.
    Ex: furo numa base plana, ranhura num perfilado, vaga num trilho DIN.
    """
    id: str
    position: Vec3 = (0, 0, 0)       # posição MUNDIAL
    normal: Vec3 = (0, 1, 0)
    accepts: List[str] = field(default_factory=lambda: [FixDomain.MECHANICAL])
    occupied_by: Optional[str] = None  # device_id
    label: str = ""

    def is_free(self) -> bool:
        return self.occupied_by is None

    def accepts_domain(self, domain: str) -> bool:
        return domain in self.accepts

    def to_dict(self) -> dict:
        return {
            "id": self.id, "position": self.position, "normal": self.normal,
            "accepts": self.accepts, "occupied_by": self.occupied_by, "label": self.label,
        }


# ============================================================
# RESOLVEDOR MAGNÉTICO
# ============================================================

class MagneticSystem:
    """
    Resolvedor de encaixe magnético.

    Dado um dispositivo sendo movido (com um ponto de fixação ativo) e os
    slots livres do mundo, encontra o melhor encaixe e calcula a
    posição/rotação exata para o snap.
    """

    def __init__(self, snap_enabled: bool = True, grid_spacing: float = 0.1):
        self.snap_enabled = snap_enabled
        self.grid_spacing = grid_spacing

    # ---------- Cálculo de encaixe ----------

    def find_slot(
        self,
        fixation: FixationPoint,
        device_pos: Vec3,
        slots: List[MountSlot],
    ) -> Optional[Dict[str, Any]]:
        """
        Encontra o melhor slot livre para um ponto de fixação.
        Retorna None se nenhum dentro do alcance.
        """
        world = fixation.world_position(device_pos)
        best = None
        best_dist = float('inf')

        for slot in slots:
            if not slot.is_free():
                continue
            if not slot.accepts_domain(fixation.domain):
                continue
            d = self._distance(world, slot.position)
            reach = fixation.radius + 0.25
            if d < reach and d < best_dist:
                best = slot
                best_dist = d

        if best is None:
            return None

        return {
            "slot": best,
            "distance": best_dist,
            "aligned": best_dist < (fixation.radius * 0.5),
            # Posição que o dispositivo deve assumir para o snap
            "target_position": self._solve_position(fixation, best),
            "strength": 1.0 - min(1.0, best_dist / (fixation.radius + 0.25)),
        }

    def _solve_position(self, fixation: FixationPoint, slot: MountSlot) -> Vec3:
        """
        Calcula a posição do dispositivo para que o ponto de fixação
        coincida exatamente com o slot.
        """
        return (
            slot.position[0] - fixation.local_offset[0],
            slot.position[1] - fixation.local_offset[1],
            slot.position[2] - fixation.local_offset[2],
        )

    # ---------- Snap fino ao grid ----------

    def snap_to_grid(self, pos: Vec3) -> Vec3:
        """Arredonda uma posição para a grade."""
        if not self.snap_enabled:
            return pos
        s = self.grid_spacing if self.grid_spacing > 0 else 1.0
        return (
            round(pos[0] / s) * s,
            round(pos[1] / s) * s,
            round(pos[2] / s) * s,
        )

    # ---------- Utilidades ----------

    @staticmethod
    def _distance(a: Vec3, b: Vec3) -> float:
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)

    @staticmethod
    def alignment_angle(fix_normal: Vec3, slot_normal: Vec3) -> float:
        """Ângulo (radianos) entre as normais — 0 = perfeitamente alinhado."""
        la = math.sqrt(sum(c * c for c in fix_normal)) or 1
        lb = math.sqrt(sum(c * c for c in slot_normal)) or 1
        dot = sum(a * b for a, b in zip(fix_normal, slot_normal)) / (la * lb)
        return math.acos(max(-1.0, min(1.0, dot)))


# ============================================================
# FIXAÇÕES PADRÃO POR TIPO DE DISPOSITIVO
# ============================================================

STANDARD_FIXATIONS: Dict[str, List[FixationPoint]] = {
    # Motor: flange de base (parafusada) + eixo (alinhamento com carga)
    "motor_dc": [
        FixationPoint("flange_base", (0, -0.35, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.3, "Flange de base"),
        FixationPoint("eixo", (0, 0.35, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Eixo de saída"),
    ],
    "motor_ac": [
        FixationPoint("flange_base", (0, -0.35, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.3, "Flange de base"),
        FixationPoint("eixo", (0, 0.4, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Eixo de saída"),
    ],
    "motor_stepper": [
        FixationPoint("flange_base", (0, -0.2, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.25, "Flange NEMA"),
        FixationPoint("eixo", (0, 0.2, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.15, "Eixo"),
    ],
    "motor_servo": [
        FixationPoint("flange_base", (0, -0.35, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.3, "Flange de base"),
        FixationPoint("eixo", (0, 0.4, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Eixo"),
    ],
    # CLP: monta em trilho DIN (painel elétrico)
    "clp_generic": [
        FixationPoint("trilho_din", (0, -0.3, 0), (0, -1, 0), FixDomain.ELECTRICAL, 0.3, "Trilho DIN 35mm"),
        FixationPoint("painel_traseiro", (0, 0, -0.3), (0, 0, -1), FixDomain.MECHANICAL, 0.3, "Fundo no painel"),
    ],
    # Sensores: fixação por braço / base
    "sensor_photoelectric": [
        FixationPoint("base_parafuso", (0, -0.35, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Base com parafuso"),
    ],
    "sensor_inductive": [
        FixationPoint("porca_fixacao", (0, -0.25, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Porca de fixação"),
    ],
    # Drive: monta em painel ou base
    "vfd_generic": [
        FixationPoint("painel_traseiro", (0, 0, -0.55), (0, 0, -1), FixDomain.MECHANICAL, 0.35, "Fundo no painel"),
        FixationPoint("base", (0, -0.55, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.35, "Base de apoio"),
    ],
    # Esteira: pés de apoio
    "conveyor_belt": [
        FixationPoint("pe_esq", (-0.45, -0.3, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Pé esquerdo"),
        FixationPoint("pe_dir", (0.45, -0.3, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Pé direito"),
    ],
    "conveyor_roller": [
        FixationPoint("pe_esq", (-0.45, -0.3, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Pé esquerdo"),
        FixationPoint("pe_dir", (0.45, -0.3, 0), (0, 1, 0), FixDomain.MECHANICAL, 0.2, "Pé direito"),
    ],
    # Cilindros: montagem por flange ou articulação
    "cylinder_pneumatic": [
        FixationPoint("flange_traseira", (0, 0, -0.075), (0, 0, -1), FixDomain.MECHANICAL, 0.2, "Flange traseira"),
        FixationPoint("articulacao", (0, 0, 0.075), (0, 0, 1), FixDomain.MECHANICAL, 0.2, "Articulação dianteira"),
    ],
}


def fixations_for(type_id: str) -> List[FixationPoint]:
    """Retorna os pontos de fixação padrão de um tipo de dispositivo."""
    return STANDARD_FIXATIONS.get(type_id, [])
