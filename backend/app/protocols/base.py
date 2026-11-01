"""
Protocol Base — Interface base para servidores de protocolo
"""
from abc import ABC, abstractmethod
from typing import Any, Dict


class ProtocolBase(ABC):
    """Interface base para servidores de protocolo industrial."""

    def __init__(self, world, config: dict):
        self.world = world
        self.config = config
        self.running = False
        self.name = self.__class__.__name__

    @abstractmethod
    async def start(self):
        """Inicia o servidor."""
        pass

    @abstractmethod
    async def stop(self):
        """Para o servidor."""
        pass

    def status(self) -> dict:
        return {
            "name": self.name,
            "running": self.running,
            "config": self.config,
        }

    # Helpers para acessar memória do CLP
    def get_clp(self):
        """Retorna o CLP conectado ao mundo."""
        for node in self.world.nodes.values():
            if node.__class__.__name__ == "CLPDevice":
                return node
        return None
