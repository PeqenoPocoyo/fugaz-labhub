"""
Simulation Engine — Motor principal de simulação

Orquestra o relógio e o mundo. Roda em loop assíncrono.
"""
import asyncio
from typing import Optional, Callable, Awaitable
from loguru import logger

from app.sim.clock import SimulationClock
from app.sim.world import World
from app.core.event_bus import EventBus
from app.core.settings import settings


class SimulationEngine:
    """Motor de simulação."""

    def __init__(self, event_bus: EventBus = None, tick_rate: float = None):
        self.event_bus = event_bus or EventBus()
        self.clock = SimulationClock(tick_rate or settings.SIM_TICK_RATE)
        self.world = World(settings.SIM_MAX_NODES)
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self._on_tick_callbacks: list = []

    # ---------- Ciclo de vida ----------

    async def start(self):
        """Inicia loop de simulação."""
        if self.running:
            return
        self.running = True
        self.clock.reset()
        self.clock.resume()
        self.world.power_on_all()
        self._task = asyncio.create_task(self._loop())
        await self.event_bus.emit("sim_started", self.clock.stats())
        logger.info("▶ Simulação iniciada")

    async def stop(self):
        """Para loop de simulação."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.clock.pause()
        self.world.power_off_all()
        await self.event_bus.emit("sim_stopped", self.clock.stats())
        logger.info("⏹ Simulação parada")

    async def step(self, steps: int = 1):
        """Avança N passos manualmente (modo passo a passo)."""
        for _ in range(steps):
            dt = self.clock.force_step()
            self.world.update(dt)
            self._notify_tick()
        await self.event_bus.emit("sim_stepped", self.clock.stats())

    async def reset(self):
        """Reseta simulação."""
        self.clock.reset()
        await self.event_bus.emit("sim_reset", self.clock.stats())

    # ---------- Loop ----------

    async def _loop(self):
        """Loop principal de simulação."""
        target_interval = 0.002  # checar clock a cada 2ms
        try:
            while self.running:
                ticked = self.clock.advance()
                if ticked:
                    dt = self.clock.dt
                    self.world.update(dt)
                    self._notify_tick()
                await asyncio.sleep(target_interval)
        except asyncio.CancelledError:
            logger.info("Loop de simulação cancelado")
        except Exception as e:
            logger.error(f"Erro no loop de simulação: {e}")
            self.running = False

    def _notify_tick(self):
        for cb in self._on_tick_callbacks:
            try:
                cb(self.clock.dt)
            except Exception as e:
                logger.error(f"Erro em callback de tick: {e}")

    def on_tick(self, callback: Callable[[float], None]):
        """Registra callback para cada tick."""
        self._on_tick_callbacks.append(callback)

    # ---------- Velocidade ----------

    def set_speed(self, speed: float):
        self.clock.set_speed(speed)

    def pause(self):
        self.clock.pause()

    def resume(self):
        self.clock.resume()

    # ---------- Estado ----------

    def state(self) -> dict:
        return {
            "running": self.running,
            "clock": self.clock.stats(),
            "world": self.world.stats(),
        }

    def full_state(self) -> dict:
        return {
            "sim": self.state(),
            "world": self.world.to_dict(),
        }

    def __repr__(self):
        return f"<SimulationEngine running={self.running} {self.world}>"
