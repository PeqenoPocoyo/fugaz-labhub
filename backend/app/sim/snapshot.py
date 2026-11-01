"""
Snapshot — Snapshots de estado para transmissão eficiente

Snapshots delta enviam apenas o que mudou desde o último snapshot,
reduzindo drasticamente o tráfego de WebSocket.
"""
from typing import Dict, List, Any, Optional
import copy


class SnapshotManager:
    """Gerencia snapshots delta do mundo."""

    def __init__(self):
        self._last_full: Optional[dict] = None
        self._last_state: Dict[str, dict] = {}

    def reset(self):
        self._last_full = None
        self._last_state.clear()

    def full(self, world_dict: dict) -> dict:
        """Retorna snapshot completo."""
        self._last_full = copy.deepcopy(world_dict)
        self._last_state = {
            nid: node for nid, node in world_dict.get("nodes", {}).items()
        }
        return {"type": "full", "data": world_dict}

    def delta(self, world_dict: dict) -> dict:
        """Retorna snapshot delta (apenas mudanças)."""
        nodes = world_dict.get("nodes", {})
        connections = world_dict.get("connections", {})

        # Nós novos ou modificados
        changed_nodes = {}
        for nid, node in nodes.items():
            prev = self._last_state.get(nid)
            if prev != node:
                changed_nodes[nid] = node
            self._last_state[nid] = node

        # Nós removidos
        removed = [nid for nid in self._last_state if nid not in nodes]
        for nid in removed:
            self._last_state.pop(nid, None)

        delta = {"type": "delta"}
        if changed_nodes:
            delta["nodes"] = changed_nodes
        if removed:
            delta["removed_nodes"] = removed

        # Conexões (sempre enviar todas por simplicidade — são poucas)
        delta["connections"] = connections
        delta["version"] = world_dict.get("version")

        return delta

    def snapshot(self, world_dict: dict, force_full: bool = False) -> dict:
        """Retorna snapshot completo ou delta conforme necessidade."""
        if force_full or self._last_full is None:
            return self.full(world_dict)
        return self.delta(world_dict)
