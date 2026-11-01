"""
Settings — Configuração do backend
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Tuple


class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # Simulação
    SIM_TICK_RATE: float = 60.0  # Hz — passo fixo de física
    SIM_MAX_SPEED: float = 10.0  # multiplicador de velocidade
    SIM_MAX_NODES: int = 10000   # limite de nós no mundo

    # Física
    GRAVITY: float = 9.81        # m/s²
    AIR_DENSITY: float = 1.225   # kg/m³
    WATER_DENSITY: float = 1000  # kg/m³
    AMBIENT_TEMP: float = 25.0   # °C
    AMBIENT_PRESSURE: float = 101325  # Pa

    # Visão computacional
    VISION_DEFAULT_FPS: int = 30
    VISION_DEFAULT_RESOLUTION: Tuple[int, int] = (640, 480)
    VISION_MAX_CAMERAS: int = 4

    # Protocolos
    PROTOCOL_POLL_INTERVAL: float = 0.1  # segundos
    PROTOCOL_TIMEOUT: float = 3.0

    # WebSocket
    WS_SNAPSHOT_INTERVAL: float = 0.05  # 20 Hz para snapshots
    WS_MAX_CONNECTIONS: int = 10

    # Segurança
    SECRET_KEY: str = "fugaz-labhub-v2-change-in-production"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
