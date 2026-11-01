"""
World — Mundo de simulação

Contém todos os nós (dispositivos, massas, estruturas), o grafo de
conexões e orquestra a atualização de tudo em sincronia.
"""
from typing import Dict, List, Any, Optional
from loguru import logger

from app.devices.base import Device, DeviceCategory
from app.io.ports import Port
from app.io.graph import ConnectionGraph, Connection
from app.core.ids import ids


class World:
    """Mundo de simulação."""

    def __init__(self, max_nodes: int = 10000):
        self.nodes: Dict[str, Device] = {}
        self.connections = ConnectionGraph()
        self.max_nodes = max_nodes
        self.version = 0  # incrementa a cada mudança estrutural
        self._spawn_count = 0  # contador para posicionamento em grade
        # Trem de força: links [fonte → transmissões... → carga]
        self.drivetrains: List[Dict[str, Any]] = []
        # A simulação está rodando? (energiza nós spawnados em tempo real)
        self.sim_running: bool = False

    # ---------- Trem de força (motor → transmissão → carga) ----------

    def source_rpm(self, device: Device) -> float:
        """Extrai o RPM de um dispositivo fonte (motor, VFD, transmissão)."""
        # porta mecânica de saída
        port = device.ports.get("shaft_out") or device.ports.get("shaft")
        if port is not None and port.value is not None:
            v = port.value
            if isinstance(v, (int, float)):
                return float(v)
            if isinstance(v, dict) and "rpm" in v:
                return float(v["rpm"])
        # propriedades conhecidas
        for key in ("output_rpm", "current_rpm", "rpm_out", "shaft_rpm"):
            val = device.properties.get(key)
            if isinstance(val, (int, float)):
                return float(val)
            if isinstance(val, dict) and isinstance(val.get("value"), (int, float)):
                return float(val["value"])
        return 0.0

    def link_drivetrain(self, source_id: str, target_id: str,
                        transmission_ids: List[str] = None) -> Optional[Any]:
        """
        Liga um trem de força: fonte (motor/VFD) → transmissões → carga.
        A direção é sempre source → target (carga). Substitui link anterior
        da mesma fonte para o mesmo alvo.
        """
        if source_id not in self.nodes:
            logger.error(f"Fonte do trem de força não encontrada: {source_id}")
            return None
        if target_id not in self.nodes:
            logger.error(f"Carga do trem de força não encontrada: {target_id}")
            return None
        transmission_ids = list(transmission_ids or [])
        for tid in transmission_ids:
            if tid not in self.nodes:
                logger.error(f"Transmissão não encontrada: {tid}")
                return None

        link = {
            "id": ids.tagged("train"),
            "source_id": source_id,
            "target_id": target_id,
            "transmissions": transmission_ids,
            "mode": "linked" if transmission_ids else "direct",
        }
        # remover link anterior mesmo par source/target
        self.drivetrains = [
            d for d in self.drivetrains
            if not (d["source_id"] == source_id and d["target_id"] == target_id)
        ]
        self.drivetrains.append(link)
        self.version += 1
        logger.info(
            f"Trem de força ligado: {source_id} -> "
            f"{' -> '.join(transmission_ids) or '(direto)'} -> {target_id}")
        return link

    def unlink_drivetrain(self, link_id: str) -> bool:
        before = len(self.drivetrains)
        self.drivetrains = [d for d in self.drivetrains if d["id"] != link_id]
        if len(self.drivetrains) != before:
            self.version += 1
            return True
        return False

    def resolve_drivetrains(self):
        """
        Resolve cada trem de força: lê o RPM da fonte, aplica a relação de
        cada transmissão na sequência e escreve o RPM no eixo da carga.
        """
        for link in self.drivetrains:
            source = self.nodes.get(link["source_id"])
            target = self.nodes.get(link["target_id"])
            if not source or not target:
                continue

            rpm = self.source_rpm(source)
            torque = 10.0  # nominal simplificado para estimativa de torque
            chain = []

            for tid in link["transmissions"]:
                trans = self.nodes.get(tid)
                if not trans:
                    continue
                # razão pelos dentes/diâmetros reais (mesmo antes do 1º tick)
                from app.devices.transmission import ratio_of
                ratio = ratio_of(trans)
                eff = trans.properties.get("efficiency", 0.95)
                if isinstance(eff, dict):
                    eff = eff.get("value", 0.95)
                try:
                    eff = float(eff or 0.95)
                except (TypeError, ValueError):
                    eff = 0.95
                rpm_in = rpm
                rpm = rpm / ratio if ratio > 0 else rpm
                torque = torque * ratio * eff
                chain.append({"type_id": trans.type_id, "ratio": round(ratio, 3)})
                # espelha os valores vivos na transmissão (para UI)
                trans.properties["rpm_in"] = round(rpm_in, 2)
                trans.properties["rpm_out"] = round(rpm, 2)
                trans.properties["torque_out_nm"] = round(torque, 3)
                trans.write_port("shaft_out", {"rpm": rpm, "torque_nm": torque, "direction": 1})

            # escreve no eixo da carga (porta + propriedade)
            target.write_port("shaft", {"rpm": rpm, "torque_nm": torque, "direction": 1})
            target.properties["shaft_rpm"] = round(rpm, 2)
            target.properties["drivetrain"] = {
                "source": source.name, "rpm": round(rpm, 2),
                "chain": chain or ("direto",),
            }

    def next_slot_position(self) -> tuple:
        """Próxima posição livre em grade (evita sobreposição)."""
        cols = 6
        spacing = 1.6
        idx = self._spawn_count
        self._spawn_count += 1
        x = ((idx % cols) - (cols - 1) / 2) * spacing
        z = (idx // cols) * spacing
        return (x, 0.5, z)

    # ---------- Nós ----------

    def add_node(self, device: Device) -> Device:
        """Adiciona um nó ao mundo."""
        if len(self.nodes) >= self.max_nodes:
            logger.error(f"Limite de nós atingido: {self.max_nodes}")
            return device
        self.nodes[device.id] = device
        self.version += 1
        # Se a simulação já está rodando, o nó nasce energizado
        if self.sim_running:
            device.on_start()
        logger.info(f"Nó adicionado: {device.id} ({device.name})")
        return device

    def remove_node(self, node_id: str):
        """Remove um nó e suas conexões."""
        device = self.nodes.get(node_id)
        if not device:
            return
        # Remover conexões das portas
        for port_id in list(device.ports.keys()):
            self.connections.disconnect_port(port_id)
        # Remover trens de força que referenciam o nó
        self.drivetrains = [
            d for d in self.drivetrains
            if node_id not in (d["source_id"], d["target_id"])
            and node_id not in d.get("transmissions", [])
        ]
        del self.nodes[node_id]
        self.version += 1

    def get_node(self, node_id: str) -> Optional[Device]:
        return self.nodes.get(node_id)

    def get_nodes_by_category(self, category: DeviceCategory) -> List[Device]:
        return [d for d in self.nodes.values() if d.category == category]

    def get_nodes_by_layer(self, layer: str) -> List[Device]:
        return [d for d in self.nodes.values() if d.layer == layer]

    def all_ports(self) -> Dict[str, Port]:
        """Retorna todas as portas de todos os nós indexadas por ID qualificado."""
        result = {}
        for device in self.nodes.values():
            for port in device.ports.values():
                key = port.qualified_id or f"{device.id}_{port.id}"
                result[key] = port
        return result

    # ---------- Conexões ----------

    def connect(self, from_port_id: str, to_port_id: str, properties: dict = None) -> Optional[Connection]:
        """Conecta duas portas pelo ID."""
        ports = self.all_ports()
        from_port = ports.get(from_port_id)
        to_port = ports.get(to_port_id)
        if not from_port:
            logger.error(f"Porta de origem não encontrada: {from_port_id}")
            return None
        if not to_port:
            logger.error(f"Porta de destino não encontrada: {to_port_id}")
            return None
        conn = self.connections.connect(from_port, to_port, properties)
        if conn:
            self.version += 1
        return conn

    def disconnect(self, connection_id: str):
        self.connections.disconnect(connection_id)
        self.version += 1

    # ---------- Atualização ----------

    def update(self, dt: float):
        """Atualiza todo o mundo por um passo de tempo."""
        # 0. Resolver trens de força (fonte → transmissões → eixo da carga)
        self.resolve_drivetrains()

        # 1. Propagar sinais pelas conexões
        self.connections.propagate(self.all_ports())

        # 2. Atualizar dispositivos (behaviours)
        for device in self.nodes.values():
            if device.state.get("powered", False):
                device.update(dt)

        # 3. Propagar novamente (caso dispositivos escreveram em saídas)
        self.connections.propagate(self.all_ports())

    def power_on_all(self):
        self.sim_running = True
        for device in self.nodes.values():
            device.on_start()

    def power_off_all(self):
        self.sim_running = False
        for device in self.nodes.values():
            device.on_stop()

    # ---------- Snapshots ----------

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "node_count": len(self.nodes),
            "connection_count": len(self.connections.connections),
            "nodes": {k: v.to_dict() for k, v in self.nodes.items()},
            "connections": self.connections.to_dict(),
            "drivetrains": self.drivetrains,
        }

    def clear(self):
        self.nodes.clear()
        self.connections.clear()
        self.drivetrains.clear()
        self._spawn_count = 0
        self.version += 1

    def stats(self) -> dict:
        categories = {}
        for d in self.nodes.values():
            cat = d.category.value
            categories[cat] = categories.get(cat, 0) + 1
        return {
            "nodes": len(self.nodes),
            "connections": len(self.connections.connections),
            "by_category": categories,
            "version": self.version,
        }

    def __repr__(self):
        return f"<World: {len(self.nodes)} nodes, {len(self.connections.connections)} connections>"
