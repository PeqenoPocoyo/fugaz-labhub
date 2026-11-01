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

    # Nomes de exibição corretos (evita o "Motor Dc"/"Cilindro Pneumatic"
    # que saía dos replace encadeados)
    NOMES = {
        # sensores
        "sensor_photoelectric": "Sensor Fotoelétrico",
        "sensor_photoelectric_receptor": "Receptor Fotoelétrico",
        "sensor_inductive": "Sensor Indutivo",
        "sensor_capacitive": "Sensor Capacitivo",
        "sensor_limit_switch": "Chave Fim de Curso",
        "sensor_emergency_button": "Botão de Emergência",
        "sensor_temperature": "Sensor de Temperatura",
        "sensor_pressure": "Sensor de Pressão",
        "sensor_level": "Sensor de Nível",
        "sensor_load_cell": "Célula de Carga",
        "sensor_encoder": "Encoder",
        # atuadores
        "motor_dc": "Motor DC",
        "motor_ac": "Motor AC",
        "motor_stepper": "Motor Stepper",
        "motor_servo": "Motor Servo",
        "cylinder_pneumatic": "Cilindro Pneumático",
        "valve_pneumatic_5_2": "Válvula 5/2",
        "cylinder_hydraulic": "Cilindro Hidráulico",
        "actuator_linear": "Atuador Linear",
        "conveyor_belt": "Esteira de Correia",
        "conveyor_roller": "Esteira de Rolos",
        "pump_centrifugal": "Motobomba Centrífuga",
        "pump_dosing": "Bomba Dosadora",
        "valve_control": "Válvula de Controle",
        # drives
        "vfd_generic": "Inversor de Frequência",
        "soft_starter": "Soft Starter",
        # CLP
        "clp_generic": "CLP",
        # transmissões
        "trans_gears": "Par de Engrenagens",
        "trans_belt": "Correia + Polias",
        "trans_chain": "Corrente",
        "trans_coupling": "Acoplamento",
        "trans_screw": "Fuso",
        "trans_linear_actuator": "Atuador Linear Elétrico",
        # visão
        "vision_tape": "Fita Colorida",
        "vision_marker": "Marcador de ID",
        "vision_target": "Alvo de Calibração",
        "vision_corner": "Canto de Referência",
        "camera_ip": "Câmera Industrial",
        # infraestrutura
        "infra_base_plate": "Base Plana",
        "infra_i_beam": "Viga I",
        "infra_pillar": "Pilar",
        "infra_profile_alu": "Perfilado de Alumínio",
        "infra_din_rail": "Trilho DIN 35mm",
        "infra_conduit": "Eletroduto",
        "infra_cable_tray": "Calha de Cabos",
        "duct": "Duto Escalável",
        "flange": "Flange",
        "tank": "Tanque",
        # fluidos
        "flow_vortex": "Medidor de Vazão Vortex",
    }

    def __init__(self):
        self.factories: Dict[str, Callable[[], Device]] = {}
        self._catalog_info: Dict[str, dict] = {}

        # Registrar todas as fábricas
        self._register_all()

    def _register_all(self):
        """Registra todas as fábricas de dispositivos."""
        def nome(tid: str, padrao: str) -> str:
            return self.NOMES.get(tid, padrao)

        # Sensores
        for type_id, factory in SENSOR_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.SENSOR.value,
                "name": nome(type_id, type_id.replace("sensor_", "").replace("_", " ").title()),
            })
        # Atuadores
        for type_id, factory in ACTUATOR_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.ACTUATOR.value,
                "name": nome(type_id, type_id),
            })
        # Drives
        for type_id, factory in DRIVE_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.DRIVE.value,
                "name": nome(type_id, type_id),
            })
        # Esteiras
        for type_id, factory in CONVEYOR_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.ACTUATOR.value,
                "name": nome(type_id, type_id),
            })
        # CLP
        self.register("clp_generic", self._create_clp, {
            "category": DeviceCategory.PLC.value,
            "name": nome("clp_generic", "CLP"),
        })
        # Infraestrutura (estrutura + condução)
        for type_id, factory in INFRA_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.STRUCTURE.value,
                "name": self.NOMES.get(type_id, type_id),
            })
        # Transmissões
        for type_id, factory in TRANSMISSION_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.TRANSMISSION.value,
                "name": self.NOMES.get(type_id, type_id),
            })
        # Visão computacional
        for type_id, factory in VISION_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.VISION.value,
                "name": self.NOMES.get(type_id, type_id),
            })
        for type_id, factory in CAMERA_FACTORY.items():
            self.register(type_id, factory, {
                "category": DeviceCategory.VISION.value,
                "name": self.NOMES.get(type_id, "Câmera Industrial"),
            })
        # Fluidos
        for type_id, factory in FLUID_FACTORY.items():
            if type_id in ("duct", "flange", "tank"):
                cat = DeviceCategory.STRUCTURE.value
            elif type_id == "flow_vortex":
                cat = DeviceCategory.SENSOR.value
            else:
                cat = DeviceCategory.ACTUATOR.value
            self.register(type_id, factory, {
                "category": cat,
                "name": self.NOMES.get(type_id, type_id),
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
