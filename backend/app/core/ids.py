"""
IDs — Geração de identificadores únicos
"""
import uuid
from typing import Optional


class IDGenerator:
    """Gerador de IDs únicos e legíveis."""

    def __init__(self):
        self._counters: dict[str, int] = {}

    def next(self, prefix: str) -> str:
        """Gera próximo ID sequencial com prefixo."""
        count = self._counters.get(prefix, 0)
        self._counters[prefix] = count + 1
        return f"{prefix}_{count:04d}"

    def unique(self) -> str:
        """Gera ID único universal (UUID curto)."""
        return uuid.uuid4().hex[:12]

    def tagged(self, prefix: str) -> str:
        """Gera ID único com prefixo legível + sufixo aleatório."""
        return f"{prefix}_{uuid.uuid4().hex[:6]}"

    def reset(self):
        """Reseta contadores."""
        self._counters.clear()


# Instância global
ids = IDGenerator()


def make_id(prefix: str) -> str:
    """Atalho para gerar ID único com prefixo."""
    return ids.tagged(prefix)
