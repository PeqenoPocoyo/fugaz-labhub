"""
Clock — Relógio de simulação com passo fixo

Usa modelo accumulator: passo fixo de física (ex: 60 Hz) com
acumulador de tempo real, estável independente de framerate.
"""
import time
from typing import Optional


class SimulationClock:
    """Relógio de simulação com passo fixo."""

    def __init__(self, tick_rate: float = 60.0):
        self.tick_rate = tick_rate
        self.dt = 1.0 / tick_rate
        self.sim_time = 0.0
        self.real_time = 0.0
        self.tick_count = 0
        self.speed = 1.0
        self.paused = False
        self._last_real = time.perf_counter()
        self._accumulator = 0.0

    def reset(self):
        self.sim_time = 0.0
        self.real_time = 0.0
        self.tick_count = 0
        self._accumulator = 0.0
        self._last_real = time.perf_counter()

    def set_speed(self, speed: float):
        """Define multiplicador de velocidade (0.1 a 10)."""
        self.speed = max(0.1, min(10.0, speed))

    def pause(self):
        self.paused = True

    def resume(self):
        self.paused = False
        self._last_real = time.perf_counter()

    def advance(self) -> bool:
        """
        Avança o relógio. Retorna True se um tick de simulação deve ocorrer.
        Deve ser chamado a cada frame/loop.
        """
        now = time.perf_counter()
        real_dt = now - self._last_real
        self._last_real = now

        if self.paused:
            return False

        self.real_time += real_dt
        self._accumulator += real_dt * self.speed

        if self._accumulator >= self.dt:
            self._accumulator -= self.dt
            self.sim_time += self.dt
            self.tick_count += 1
            return True

        return False

    def force_step(self, steps: int = 1) -> float:
        """Força N passos de simulação (para modo passo a passo)."""
        self.sim_time += self.dt * steps
        self.tick_count += steps
        return self.dt * steps

    def stats(self) -> dict:
        return {
            "sim_time": round(self.sim_time, 4),
            "real_time": round(self.real_time, 4),
            "tick_count": self.tick_count,
            "tick_rate": self.tick_rate,
            "speed": self.speed,
            "paused": self.paused,
        }

    def __repr__(self):
        return f"<Clock: t={self.sim_time:.2f}s @ {self.tick_rate}Hz x{self.speed}>"
