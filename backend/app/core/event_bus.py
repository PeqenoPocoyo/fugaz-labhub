"""
Event Bus — Comunicação desacoplada entre módulos
"""
import asyncio
from typing import Callable, Dict, List, Any, Awaitable
from loguru import logger

Handler = Callable[[Any], Any] | Callable[[Any], Awaitable[Any]]


class EventBus:
    """Bus de eventos assíncrono para comunicação entre módulos."""

    def __init__(self):
        self._handlers: Dict[str, List[Handler]] = {}
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._history: List[Dict[str, Any]] = []
        self._max_history = 500

    def on(self, event: str, handler: Handler):
        """Registra handler para um evento."""
        if event not in self._handlers:
            self._handlers[event] = []
        self._handlers[event].append(handler)

    def off(self, event: str, handler: Handler):
        """Remove handler."""
        if event in self._handlers and handler in self._handlers[event]:
            self._handlers[event].remove(handler)

    def once(self, event: str, handler: Handler):
        """Registra handler que executa uma única vez."""
        def wrapper(data: Any):
            self.off(event, wrapper)
            return handler(data)
        wrapper.__name__ = f"once_{handler.__name__}"
        self.on(event, wrapper)

    async def emit(self, event: str, data: Any = None):
        """Emite evento para todos os handlers registrados."""
        entry = {"event": event, "data": data}
        self._history.append(entry)
        if len(self._history) > self._max_history:
            self._history.pop(0)

        handlers = self._handlers.get(event, [])
        for handler in handlers:
            try:
                result = handler(data)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Erro no handler de '{event}': {e}")

        # Também colocar na fila para consumidores
        try:
            self._queue.put_nowait(entry)
        except asyncio.QueueFull:
            logger.warning(f"Fila de eventos cheia, descartando: {event}")

    async def get_next(self, timeout: float = None):
        """Obtém próximo evento da fila."""
        try:
            if timeout:
                return await asyncio.wait_for(self._queue.get(), timeout=timeout)
            return await self._queue.get()
        except asyncio.TimeoutError:
            return None

    def get_history(self, event: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retorna histórico de eventos."""
        history = self._history
        if event:
            history = [h for h in history if h["event"] == event]
        return history[-limit:]

    def clear(self):
        """Limpa handlers e fila."""
        self._handlers.clear()
        self._history.clear()
        while not self._queue.empty():
            self._queue.get_nowait()

    def event_names(self) -> List[str]:
        """Lista nomes de eventos registrados."""
        return list(self._handlers.keys())

    def __repr__(self):
        total = sum(len(h) for h in self._handlers.values())
        return f"<EventBus: {len(self._handlers)} events, {total} handlers>"
