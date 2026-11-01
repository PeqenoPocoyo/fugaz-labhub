"""
ModBus TCP Server — Servidor ModBus TCP para integração externa

Expõe a memória do CLP simulado como um servidor ModBus TCP escravo.
Softwares externos (MasterTool, TIA Portal via gateway, etc.) conectam
como clientes mestres e leem/escrevem coils/registradores.
"""
import asyncio
from typing import Any, Dict
from loguru import logger

from app.protocols.base import ProtocolBase

try:
    from pymodbus.datastore import (
        ModbusSequentialDataBlock,
        ModbusSlaveContext,
        ModbusServerContext,
    )
    from pymodbus.server import StartAsyncTcpServer
    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False
    logger.warning("pymodbus não disponível — ModBus TCP em modo simulado")


class ModbusTCPServer(ProtocolBase):
    """Servidor ModBus TCP que expõe a memória do CLP."""

    def __init__(self, world, config: dict):
        super().__init__(world, config)
        self.host = config.get("host", "0.0.0.0")
        self.port = config.get("port", 502)
        self.unit_id = config.get("unit_id", 1)
        self.context = None
        self._sync_task = None

    async def start(self):
        """Inicia servidor ModBus TCP."""
        clp = self.get_clp()
        if not clp:
            raise ValueError("Nenhum CLP encontrado no mundo para expor via ModBus")

        if not MODBUS_AVAILABLE:
            # Modo simulado: registra como ativo mas não abre socket
            self.running = True
            self._sync_task = asyncio.create_task(self._sync_loop())
            logger.info(f"ModBus TCP (simulado) ativo em {self.host}:{self.port}")
            return

        # Criar datastore vinculado à memória do CLP
        mem = clp.rack.memory
        co = ModbusSequentialDataBlock(0, [1 if c else 0 for c in mem.coils])
        di = ModbusSequentialDataBlock(0, [1 if d else 0 for d in mem.discrete_inputs])
        hr = ModbusSequentialDataBlock(0, list(mem.holding_registers))
        ir = ModbusSequentialDataBlock(0, list(mem.input_registers))

        slave = ModbusSlaveContext(
            di=di, co=co, hr=hr, ir=ir,
            zero_mode=True,
        )
        self.context = ModbusServerContext(slaves={self.unit_id: slave}, single=False)

        # Task de sincronização contínua memória ↔ datastore
        self._sync_task = asyncio.create_task(self._sync_loop())

        # Iniciar servidor em background
        asyncio.create_task(self._run_server())
        self.running = True
        logger.info(f"ModBus TCP servidor em {self.host}:{self.port} (unit {self.unit_id})")

    async def _run_server(self):
        try:
            await StartAsyncTcpServer(context=self.context, address=(self.host, self.port))
        except Exception as e:
            logger.error(f"ModBus server erro: {e}")
            self.running = False

    async def _sync_loop(self):
        """Sincroniza memória do CLP com o datastore ModBus continuamente."""
        while self.running:
            try:
                clp = self.get_clp()
                if clp and self.context:
                    slave = self.context[self.unit_id]
                    mem = clp.rack.memory
                    # Escrever estado atual nos stores
                    store_co = slave.store["c"]
                    for i, v in enumerate(mem.coils):
                        store_co.setValues(i + 1, [1 if v else 0])
                    store_di = slave.store["d"]
                    for i, v in enumerate(mem.discrete_inputs):
                        store_di.setValues(i + 1, [1 if v else 0])
                    store_hr = slave.store["h"]
                    for i, v in enumerate(mem.holding_registers):
                        store_hr.setValues(i + 1, [v])
                    store_ir = slave.store["i"]
                    for i, v in enumerate(mem.input_registers):
                        store_ir.setValues(i + 1, [v])
            except Exception as e:
                logger.debug(f"Sync erro: {e}")
            await asyncio.sleep(0.1)

    async def stop(self):
        self.running = False
        if self._sync_task:
            self._sync_task.cancel()
        logger.info("ModBus TCP servidor parado")

    def status(self) -> dict:
        base = super().status()
        base["modbus_available"] = MODBUS_AVAILABLE
        return base
