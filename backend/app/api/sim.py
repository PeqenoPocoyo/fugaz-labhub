"""
API — Simulação
"""
from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel

from app.main import state

router = APIRouter()


class SpeedRequest(BaseModel):
    speed: float


@router.post("/start")
async def start():
    await state.engine.start()
    return {"success": True, "state": state.engine.state()}


@router.post("/stop")
async def stop():
    await state.engine.stop()
    return {"success": True, "state": state.engine.state()}


@router.post("/step")
async def step(steps: int = 1):
    """Avança N passos (modo passo a passo)."""
    await state.engine.stop()
    await state.engine.step(steps)
    return {"success": True, "state": state.engine.state()}


@router.post("/speed")
async def set_speed(req: SpeedRequest):
    state.engine.set_speed(req.speed)
    return {"success": True, "speed": req.speed}


@router.post("/pause")
async def pause():
    state.engine.pause()
    return {"success": True}


@router.post("/resume")
async def resume():
    state.engine.resume()
    return {"success": True}


@router.get("/state")
async def sim_state():
    return state.engine.state()


@router.get("/snapshot")
async def snapshot():
    """Snapshot do mundo (para clientes que não usam WebSocket)."""
    world_dict = state.engine.world.to_dict()
    return state.snapshot.snapshot(world_dict, force_full=True)
