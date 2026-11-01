"""
Device Registry — Catálogo central de dispositivos

Unifica todas as fábricas de dispositivos em um registro único.
"""
from typing import Dict, List, Any, Optional, Callable
from loguru import logger

from app.devices.base import Device, DeviceCategory
from app.devices.sensors import SENSOR_FACTORY
from app.devices.actuators import ACTUATOR_FACTORY
from app.devices.drives import DRIVE_FACTORY
from app.devices.conveyors import CONVEYOR_FACTORY
from app.devices.infrastructure import INFRA_FACTORY
from app.devices.transmission import TRANSMISSION_FACTORY
from app.devices.vision import VISION_FACTORY
from app.devices.fluid import FLUID_FACTORY
from app.vision.camera import CAMERA_FACTORY
from app.devices.clp_rack import CLPDevice


class DeviceRegistry:
    """Registro central de dispositivos."""

    def __init__(self):
        self.factories: Dict[str, Callable[[], Device]] = {}
        self._catalog_info: Dict[str, dict] = {}

        # Registrar todas as fábricas
        self._register_all()

    def _register_all(self):
        """Registra todas as fábricas de dispositivos."""
        # Sensores
        for type_id, factory in SENSOR_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.SENSOR.value,
                "name": type_id.replace("sensor_", "").replace("_", " ").title(),
            })
        # Atuadores
        for type_id, factory in ACTUATOR_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.ACTUATOR.value,
                "name": type_id.replace("motor_", "Motor ").replace("cylinder_", "Cilindro ").replace("actuator_", "Atuador ").replace("valve_", "Válvula "),
            })
        # Drives
        for type_id, factory in DRIVE_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.DRIVE.value,
                "name": type_id.replace("vfd_", "VFD ").replace("_", " ").title(),
            })
        # Esteiras
        for type_id, factory in CONVEYOR_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.ACTUATOR.value,
                "name": type_id.replace("conveyor_", "Esteira ").replace("_", " "),
            })
        # CLP
        self.register("clp_generic", self._create_clp, {
            "category": DeviceCategory.PLC.value,
            "name": "CLP Genérico",
        })
        # Infraestrutura (estrutura + condução)
        infra_names = {
            "infra_base_plate": "Base Plana",
            "infra_i_beam": "Viga I",
            "infra_pillar": "Pilar",
            "infra_profile_alu": "Perfilado Alumínio",
            "infra_din_rail": "Trilho DIN 35mm",
            "infra_conduit": "Eletroduto",
            "infra_cable_tray": "Calha de Cabos",
        }
        for type_id, factory in INFRA_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.STRUCTURE.value,
                "name": infra_names.get(type_id, type_id),
            })
        # Transmissões
        trans_names = {
            "trans_gears": "Par de Engrenagens",
            "trans_belt": "Correia + Polias",
            "trans_chain": "Corrente",
            "trans_coupling": "Acoplamento",
            "trans_screw": "Fuso (Esphi)",
            "trans_linear_actuator": "Atuador Linear Elétrico",
        }
        for type_id, factory in TRANSMISSION_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.TRANSMISSION.value,
                "name": trans_names.get(type_id, type_id),
            })
        # Visão computacional
        vision_names = {
            "vision_tape": "Fita Colorida",
            "vision_marker": "Marcador de ID",
            "vision_target": "Alvo de Calibração",
            "vision_corner": "Canto de Referência",
        }
        for type_id, factory in VISION_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.VISION.value,
                "name": vision_names.get(type_id, type_id),
            })
        for type_id, factory in CAMERA_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.VISION.value,
                "name": "Câmera Industrial",
            })
        # Fluidos
        fluid_names = {
            "pump_centrifugal": "Motobomba Centrífuga",
            "pump_dosing": "Bomba Dosadora",
            "flow_vortex": "Medidor Vortex",
            "valve_control": "Válvula de Controle",
            "duct": "Duto Escalável",
            "flange": "Flange",
            "tank": "Tanque",
        }
        for type_id, factory in FLUID_FACTORY.items():
            if type_id in ("duct", "flange", "tank"):
                cat = DeviceCategory.STRUCTURE.value
            elif type_id == "flow_vortex":
                cat = DeviceCategory.SENSOR.value
            else:
                cat = DeviceCategory.ACTUATOR.value
            self.register(type_id, factory, {
                "category": cat,
                "name": fluid_names.get(type_id, type_id),
            })

    def _create_clp(self) -> Device:
        """Cria um CLP genérico."""
        return CLPDevice()

    def register(self, type_id: str, factory: Callable[[], Device], info: dict = None):
        """Registra uma fábrica de dispositivo."""
        self.factories[type_id] = factory
        self._catalog_info[type_id] = info or {}
        logger.debug(f"Dispositivo registrado: {type_id}")

    def create(self, type_id: str) -> Optional[Device]:
        """Cria uma instância de dispositivo pelo tipo."""
        factory = self.factories.get(type_id)
        if not factory:
            logger.error(f"Tipo de dispositivo não encontrado: {type_id}")
            return None
        try:
            device = factory()
            return device
        except Exception as e:
            logger.error(f"Erro ao criar dispositivo {type_id}: {e}")
            return None

    def has(self, type_id: str) -> bool:
        return type_id in self.factories

    def list_types(self, category: str = None) -> List[dict]:
        """Lista tipos disponíveis, opcionalmente filtrados por categoria."""
        result = []
        for type_id, info in self._catalog_info.items():
            if category and info.get("category") != category:
                continue
            result.append({
                "type_id": type_id,
                "name": info.get("name", type_id),
                "category": info.get("category", "other"),
            })
        return result

    def list_categories(self) -> List[str]:
        cats = set(info.get("category", "other") for info in self._catalog_info.values())
        return sorted(cats)

    def get_info(self, type_id: str) -> dict:
        return self._catalog_info.get(type_id, {})


# Instância global
registry = DeviceRegistry()
