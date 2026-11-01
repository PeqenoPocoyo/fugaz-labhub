"""
API — Mundo e Conexões
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from app.main import state

router = APIRouter()


class ConnectRequest(BaseModel):
    from_port: str
    to_port: str
    properties: Optional[dict] = None
    path: Optional[List[List[float]]] = None   # waypoints do fio (rota do usuário)


@router.get("/")
async def get_world():
    """Estado completo do mundo."""
    return state.engine.world.to_dict()


@router.get("/ports")
async def list_ports():
    """Lista todas as portas disponíveis no mundo."""
    ports = state.engine.world.all_ports()
    return {"ports": {pid: p.to_dict() for pid, p in ports.items()}}


@router.post("/connect")
async def connect(req: ConnectRequest):
    """Cria conexão entre duas portas."""
    conn = state.engine.world.connect(req.from_port, req.to_port, req.properties)
    if not conn:
        raise HTTPException(status_code=400, detail="Falha ao conectar portas")
    # rota definida pelo usuário (waypoints) — o fio passa a ter caminho próprio
    if req.path:
        conn.properties["path"] = [list(p) for p in req.path]
    await state.event_bus.emit("connection_created", conn.to_dict())
    return {"success": True, "connection": conn.to_dict()}


class PathRequest(BaseModel):
    path: Optional[List[List[float]]] = None   # None = volta ao automático


@router.patch("/connections/{connection_id}")
async def set_connection_path(connection_id: str, req: PathRequest):
    """Define (ou limpa) o caminho de um fio — usado ao arrastar a rota."""
    conn = state.engine.world.connections.connections.get(connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Conexão não encontrada")
    if req.path:
        conn.properties["path"] = [list(p) for p in req.path]
    else:
        conn.properties.pop("path", None)
    return {"success": True, "connection": conn.to_dict()}


@router.get("/connections")
async def list_connections():
    return state.engine.world.connections.to_dict()


@router.delete("/connections/{connection_id}")
async def disconnect(connection_id: str):
    state.engine.world.disconnect(connection_id)
    await state.event_bus.emit("connection_deleted", {"id": connection_id})
    return {"success": True, "id": connection_id}


@router.post("/reset")
async def reset_world():
    """Limpa o mundo completamente."""
    await state.engine.stop()
    state.engine.world.clear()
    state.snapshot.reset()
    return {"success": True, "message": "Mundo resetado"}


@router.get("/stats")
async def world_stats():
    return state.engine.world.stats()


# ---------- Trem de força ----------

class DrivetrainRequest(BaseModel):
    source_id: str
    target_id: str
    transmission_ids: List[str] = []


@router.post("/drivetrain")
async def link_drivetrain(req: DrivetrainRequest):
    """Liga motor → transmissões → carga (trem de força)."""
    link = state.engine.world.link_drivetrain(
        req.source_id, req.target_id, req.transmission_ids
    )
    if not link:
        raise HTTPException(status_code=400, detail="Falha ao ligar trem de força")
    await state.event_bus.emit("drivetrain_linked", link)
    return {"success": True, "drivetrain": link}


@router.get("/drivetrains")
async def list_drivetrains():
    return {"drivetrains": state.engine.world.drivetrains}


@router.delete("/drivetrain/{link_id}")
async def unlink_drivetrain(link_id: str):
    if not state.engine.world.unlink_drivetrain(link_id):
        raise HTTPException(status_code=404, detail="Trem de força não encontrado")
    await state.event_bus.emit("drivetrain_unlinked", {"id": link_id})
    return {"success": True, "id": link_id}
