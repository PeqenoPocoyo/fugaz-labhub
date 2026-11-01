"""
OPC UA Server — Servidor OPC UA para integração externa

Expõe a memória do CLP simulado como um servidor OPC UA. Softwares
como TIA Portal (Siemens), SCADAs e MES conectam como clientes.
"""
import asyncio
from typing import Any, Dict
from loguru import logger

from app.protocols.base import ProtocolBase

try:
    from asyncua import Server
    OPCUA_AVAILABLE = True
except ImportError:
    OPCUA_AVAILABLE = False
    logger.warning("asyncua não disponível — OPC UA em modo simulado")


class OPCUAServer(ProtocolBase):
    """Servidor OPC UA que expõe a memória do CLP."""

    def __init__(self, world, config: dict):
        super().__init__(world, config)
        self.endpoint = config.get("endpoint", "opc.tcp://0.0.0.0:4840/fugaz/")
        self.name_space = config.get("namespace", "http://fugaz.labhub")
        self.server = None
        self._tags: Dict[str, Any] = {}
        self._sync_task = None

    async def start(self):
        """Inicia servidor OPC UA."""
        clp = self.get_clp()
        if not clp:
            raise ValueError("Nenhum CLP encontrado no mundo para expor via OPC UA")

        if not OPCUA_AVAILABLE:
            self.running = True
            self._sync_task = asyncio.create_task(self._sync_loop())
            logger.info(f"OPC UA (simulado) ativo em {self.endpoint}")
            return

        self.server = Server()
        await self.server.init()
        self.server.set_endpoint(self.endpoint)
        self.server.set_server_name("FUGAZ LABHUB OPC UA")

        # Registrar namespace
        idx = await self.server.register_namespace(self.name_space)
        objects = self.server.nodes.objects

        # Criar nós para coils e registradores
        mem = clp.rack.memory
        coils_node = await objects.add_object(idx, "Coils")
        for i in range(0, min(100, len(mem.coils))):
            var = await coils_node.add_variable(idx, f"Coil_{i}", mem.coils[i])
            await var.set_writable()
            self._tags[f"Coil_{i}"] = (var, "coil", i)

        hr_node = await objects.add_object(idx, "HoldingRegisters")
        for i in range(0, min(100, len(mem.holding_registers))):
            var = await hr_node.add_variable(idx, f"HR_{i}", mem.holding_registers[i])
            await var.set_writable()
            self._tags[f"HR_{i}"] = (var, "hr", i)

        self._sync_task = asyncio.create_task(self._sync_loop())
        asyncio.create_task(self._run_server())
        self.running = True
        logger.info(f"OPC UA servidor em {self.endpoint}")

    async def _run_server(self):
        try:
            async with self.server:
                while self.running:
                    await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"OPC UA server erro: {e}")
            self.running = False

    async def _sync_loop(self):
        """Sincroniza valores entre OPC UA e memória do CLP."""
        while self.running:
            try:
                clp = self.get_clp()
                if clp:
                    mem = clp.rack.memory
                    for tag_name, (var, kind, idx) in self._tags.items():
                        try:
                            val = await var.get_value()
                            # Cliente escreveu → atualizar memória
                            if kind == "coil":
                                mem.write_coil(idx, bool(val))
                            elif kind == "hr":
                                mem.write_holding(idx, int(val))
                            # Memória mudou → atualizar tag
                            if kind == "coil":
                                await var.write_value(mem.coils[idx])
                            elif kind == "hr":
                                await var.write_value(mem.holding_registers[idx])
                        except Exception:
                            pass
            except Exception as e:
                logger.debug(f"OPC sync erro: {e}")
            await asyncio.sleep(0.5)

    async def stop(self):
        self.running = False
        if self._sync_task:
            self._sync_task.cancel()
        logger.info("OPC UA servidor parado")

    def status(self) -> dict:
        base = super().status()
        base["opcua_available"] = OPCUA_AVAILABLE
        return base
