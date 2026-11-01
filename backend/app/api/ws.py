"""
WebSocket — Canais de tempo real

Canais:
- /ws/sim    → snapshots de simulação (delta, alta frequência)
- /ws/events → eventos (device spawn, conexão, etc.)
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio
from loguru import logger

from app.main import state
from app.core.settings import settings


class ConnectionManager:
    """Gerencia conexões WebSocket por canal."""

    def __init__(self):
        self.channels: Dict[str, List[WebSocket]] = {"sim": [], "events": []}

    async def connect(self, ws: WebSocket, channel: str):
        await ws.accept()
        self.channels.setdefault(channel, []).append(ws)

    def disconnect(self, ws: WebSocket, channel: str):
        if ws in self.channels.get(channel, []):
            self.channels[channel].remove(ws)

    async def broadcast(self, channel: str, message: dict):
        dead = []
        for ws in self.channels.get(channel, []):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, channel)


manager = ConnectionManager()


# Registrar broadcast de eventos no event bus
async def _on_spawn(data):
    await manager.broadcast("events", {"type": "device_spawned", "data": data})


async def _on_deleted(data):
    await manager.broadcast("events", {"type": "device_deleted", "data": data})


async def _on_conn(data):
    await manager.broadcast("events", {"type": "connection_created", "data": data})


state.event_bus.on("device_spawned", _on_spawn)
state.event_bus.on("device_deleted", _on_deleted)
state.event_bus.on("connection_created", _on_conn)


# Loop de snapshots de simulação
_snapshot_task = None


async def _snapshot_loop():
    """Envia snapshots delta periodicamente para o canal /ws/sim."""
    while True:
        try:
            if state.engine.running and manager.channels.get("sim"):
                world_dict = state.engine.world.to_dict()
                snap = state.snapshot.snapshot(world_dict)
                snap["clock"] = state.engine.clock.stats()
                await manager.broadcast("sim", snap)
        except Exception as e:
            logger.debug(f"Snapshot loop erro: {e}")
        await asyncio.sleep(settings.WS_SNAPSHOT_INTERVAL)


def start_snapshot_loop():
    global _snapshot_task
    if _snapshot_task is None:
        _snapshot_task = asyncio.create_task(_snapshot_loop())


async def websocket_endpoint(websocket: WebSocket, channel: str):
    """Endpoint WebSocket genérico por canal."""
    if channel not in ("sim", "events"):
        await websocket.close(code=1008, reason="Canal inválido")
        return

    await manager.connect(websocket, channel)
    logger.info(f"WebSocket conectado: /ws/{channel}")

    # Enviar estado completo inicial
    try:
        world_dict = state.engine.world.to_dict()
        full = state.snapshot.snapshot(world_dict, force_full=True)
        full["clock"] = state.engine.clock.stats()
        await websocket.send_text(json.dumps(full))

        if channel == "sim":
            start_snapshot_loop()

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            # Comandos bidirecionais
            cmd = msg.get("type")
            if cmd == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif cmd == "start_sim":
                await state.engine.start()
                await websocket.send_text(json.dumps({"type": "sim_status", "running": True}))
            elif cmd == "stop_sim":
                await state.engine.stop()
                await websocket.send_text(json.dumps({"type": "sim_status", "running": False}))
            elif cmd == "spawn":
                device = state.registry.create(msg.get("type_id"))
                if device:
                    if msg.get("position"):
                        device.transform.position = tuple(msg["position"])
                    state.engine.world.add_node(device)
                    await state.event_bus.emit("device_spawned", device.to_dict())
            elif cmd == "connect":
                state.engine.world.connect(msg.get("from_port"), msg.get("to_port"))
            elif cmd == "write_port":
                device = state.engine.world.get_node(msg.get("device_id"))
                if device:
                    port = device.get_port(msg.get("port_id"))
                    if port:
                        port.write(msg.get("value"))

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
        logger.info(f"WebSocket desconectado: /ws/{channel}")
    except Exception as e:
        manager.disconnect(websocket, channel)
        logger.error(f"WebSocket erro: {e}")
