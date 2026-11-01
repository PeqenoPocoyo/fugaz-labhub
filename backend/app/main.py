"""
FUGAZ LABHUB Backend v2
Simulador industrial com cena montável, física unificada e protocolos integrados.
"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.event_bus import EventBus
from app.core.settings import settings


# ============================================================
# ESTADO GLOBAL (Singletons)
# ============================================================

class AppState:
    """Estado global da aplicação — singletons compartilhados."""
    def __init__(self):
        from app.devices.registry import registry
        from app.sim.engine import SimulationEngine
        from app.sim.snapshot import SnapshotManager
        from app.protocols.manager import ProtocolManager

        self.event_bus = EventBus()
        self.registry = registry
        self.snapshot = SnapshotManager()
        self.engine = SimulationEngine(self.event_bus, settings.SIM_TICK_RATE)
        self.protocol_manager = ProtocolManager(self.engine.world, self.event_bus)


state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle da aplicação."""
    logger.info("🚀 FUGAZ LABHUB v2 iniciando...")
    logger.info(f"   Dispositivos no catálogo: {len(state.registry.factories)}")
    logger.info(f"   Tick rate: {settings.SIM_TICK_RATE} Hz")
    yield
    await state.engine.stop()
    logger.info("🛑 FUGAZ LABHUB v2 encerrando...")


app = FastAPI(
    title="FUGAZ LABHUB v2 API",
    description="Simulador industrial com cena montável, física unificada e protocolos integrados",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "FUGAZ LABHUB",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "sim_running": state.engine.running,
        "device_types": len(state.registry.factories),
        "world": state.engine.world.stats(),
    }


# ============================================================
# ROTAS
# ============================================================

from app.api import world, devices, sim, vision, protocols

app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(world.router, prefix="/api/world", tags=["world"])
app.include_router(sim.router, prefix="/api/sim", tags=["sim"])
app.include_router(vision.router, prefix="/api/vision", tags=["vision"])
app.include_router(protocols.router, prefix="/api/protocols", tags=["protocols"])


# ============================================================
# WEBSOCKET
# ============================================================

from app.api.ws import websocket_endpoint
app.add_api_websocket_route("/ws/{channel}", websocket_endpoint)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
