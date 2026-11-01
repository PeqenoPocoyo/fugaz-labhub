"""
Protocol Manager — Gerenciador de protocolos industriais

Gerencia servidores de protocolo (ModBus TCP, OPC UA, Serial) que
permitem que softwares externos (TIA Portal, MasterTool, etc.) se
conectem ao CLP simulado e leiam/escrevam na memória.
"""
import asyncio
from typing import Dict, List, Any, Optional
from loguru import logger

from app.core.event_bus import EventBus
from app.protocols.base import ProtocolBase


class ProtocolManager:
    """Gerenciador central de protocolos."""

    def __init__(self, world, event_bus: EventBus = None):
        self.world = world
        self.event_bus = event_bus or EventBus()
        self.servers: Dict[str, ProtocolBase] = {}
        self.active: List[str] = []

    def available(self) -> List[dict]:
        """Lista protocolos disponíveis."""
        from app.protocols import modbus, opcua, serial
        return [
            {"id": "modbus_tcp", "name": "ModBus TCP", "port": 502},
            {"id": "modbus_rtu", "name": "ModBus RTU", "port": None},
            {"id": "opc_ua", "name": "OPC UA", "port": 4840},
        ]

    async def start_server(self, protocol_id: str, config: dict) -> dict:
        """Inicia um servidor de protocolo."""
        if protocol_id in self.servers:
            return {"success": False, "error": f"Servidor já rodando: {protocol_id}"}

        try:
            from app.protocols import modbus, opcua, serial

            factories = {
                "modbus_tcp": modbus.ModbusTCPServer,
                "modbus_rtu": serial.ModbusRTUServer,
                "opc_ua": opcua.OPCUAServer,
            }

            factory = factories.get(protocol_id)
            if not factory:
                return {"success": False, "error": f"Protocolo não suportado: {protocol_id}"}

            server = factory(self.world, config)
            await server.start()

            self.servers[protocol_id] = server
            if protocol_id not in self.active:
                self.active.append(protocol_id)

            await self.event_bus.emit("protocol_started", {"protocol": protocol_id, "config": config})
            logger.info(f"Servidor {protocol_id} iniciado")
            return {"success": True, "protocol": protocol_id, "config": config}
        except Exception as e:
            logger.error(f"Erro ao iniciar servidor {protocol_id}: {e}")
            return {"success": False, "error": str(e)}

    async def stop_server(self, protocol_id: str) -> dict:
        """Para um servidor de protocolo."""
        server = self.servers.get(protocol_id)
        if not server:
            return {"success": False, "error": f"Servidor não encontrado: {protocol_id}"}
        await server.stop()
        del self.servers[protocol_id]
        self.active.remove(protocol_id)
        await self.event_bus.emit("protocol_stopped", {"protocol": protocol_id})
        return {"success": True, "protocol": protocol_id}

    def status(self) -> dict:
        return {
            "active": self.active,
            "servers": {k: v.status() for k, v in self.servers.items()},
            "available": self.available(),
        }

    def find_clp(self) -> Optional[Any]:
        """Retorna o primeiro CLP encontrado no mundo."""
        for node in self.world.nodes.values():
            if node.__class__.__name__ == "CLPDevice":
                return node
        return None
