"""
API — Protocolos Industriais
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.main import state

router = APIRouter()


class StartServerRequest(BaseModel):
    protocol: str
    config: dict = {}


class ModbusAddressRequest(BaseModel):
    address: str  # ex: "hr:0", "co:0"


@router.get("/")
async def list_protocols():
    """Lista protocolos disponíveis e ativos."""
    return state.protocol_manager.status()


@router.post("/start")
async def start_server(req: StartServerRequest):
    """Inicia um servidor de protocolo."""
    result = await state.protocol_manager.start_server(req.protocol, req.config)
    return result


@router.post("/stop/{protocol}")
async def stop_server(protocol: str):
    result = await state.protocol_manager.stop_server(protocol)
    return result


@router.get("/status")
async def protocol_status():
    return state.protocol_manager.status()


@router.get("/clp/ports")
async def clp_module_specs():
    """Lista especificações de módulos disponíveis para CLP."""
    from app.devices.clp_rack import MODULE_SPECS
    return {
        "specs": {
            key: {
                "type": spec.type.value,
                "points": spec.points,
                "base_area": spec.base_area,
                "data_type": spec.data_type,
                "analog_range": spec.analog_range,
                "unit": spec.unit,
                "voltage": spec.voltage,
            }
            for key, spec in MODULE_SPECS.items()
        }
    }


@router.get("/serial/ports")
async def list_serial_ports():
    """Lista portas seriais disponíveis."""
    try:
        import serial.tools.list_ports
        return {"ports": [{"port": p.device, "description": p.description}
                          for p in serial.tools.list_ports.comports()]}
    except ImportError:
        return {"ports": []}
