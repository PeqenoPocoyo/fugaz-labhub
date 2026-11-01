"""
Serial / ModBus RTU — Servidor serial para integração externa

Expõe a memória do CLP simulado via ModBus RTU sobre serial (RS-232/485).
Compatível com FATEK, Delta e outros CLPs seriais.
"""
import asyncio
from typing import Any, Dict
from loguru import logger

from app.protocols.base import ProtocolBase

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    logger.warning("pyserial não disponível — Serial em modo simulado")


class ModbusRTUServer(ProtocolBase):
    """Servidor ModBus RTU sobre serial."""

    def __init__(self, world, config: dict):
        super().__init__(world, config)
        self.port_name = config.get("port", "COM1")
        self.baudrate = config.get("baudrate", 9600)
        self.bytesize = config.get("bytesize", 8)
        self.parity = config.get("parity", "N")
        self.stopbits = config.get("stopbits", 1)
        self.serial_port = None

    async def start(self):
        clp = self.get_clp()
        if not clp:
            raise ValueError("Nenhum CLP encontrado no mundo para expor via ModBus RTU")

        if not SERIAL_AVAILABLE:
            self.running = True
            logger.info(f"ModBus RTU (simulado) ativo em {self.port_name} @ {self.baudrate}")
            return

        try:
            self.serial_port = serial.Serial(
                port=self.port_name,
                baudrate=self.baudrate,
                bytesize=self.bytesize,
                parity=self.parity,
                stopbits=self.stopbits,
                timeout=0.1,
            )
            self.running = True
            logger.info(f"ModBus RTU servidor em {self.port_name} @ {self.baudrate}")
        except Exception as e:
            logger.error(f"Erro ao abrir serial {self.port_name}: {e}")
            raise

    async def stop(self):
        self.running = False
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
        logger.info("ModBus RTU servidor parado")

    def status(self) -> dict:
        base = super().status()
        base["serial_available"] = SERIAL_AVAILABLE
        return base
