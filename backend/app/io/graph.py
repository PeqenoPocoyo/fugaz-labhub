"""
Connection Graph — Grafo de conexões entre portas

Gerencia as conexões entre portas de dispositivos e permite
propagar sinais pelo grafo.
"""
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.core.ids import ids


@dataclass
class Connection:
    """Conexão entre duas portas."""
    id: str
    from_port: str        # ID da porta de origem (qualificado)
    to_port: str          # ID da porta de destino (qualificado)
    domain: PortDomain
    properties: Dict[str, Any] = field(default_factory=dict)
    from_device: str = ""  # ID do dispositivo de origem
    to_device: str = ""    # ID do dispositivo de destino
    # propriedades físicas da conexão:
    # - electrical: resistance, max_current
    # - pneumatic: diameter, length
    # - hydraulic: diameter, length
    # - data: baudrate, protocol

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "from_port": self.from_port,
            "to_port": self.to_port,
            "domain": self.domain.value,
            "properties": self.properties,
            "from_device": self.from_device,
            "to_device": self.to_device,
        }


class ConnectionGraph:
    """Grafo de conexões entre portas."""

    def __init__(self):
        self.connections: Dict[str, Connection] = {}
        self._by_port: Dict[str, List[str]] = {}  # port_id -> [connection_ids]
        self._adjacency: Dict[str, List[str]] = {}  # port_id -> [connected_port_ids]

    def connect(self, from_port: Port, to_port: Port, properties: dict = None) -> Optional[Connection]:
        """Conecta duas portas."""
        # Validação de domínio
        if not to_port.accept_domain(from_port.domain):
            logger.error(f"Domínio incompatível: {from_port.domain} -> {to_port.domain}")
            return None

        # Validação de direção
        if from_port.direction == PortDirection.INPUT:
            logger.error(f"Porta de origem é INPUT: {from_port.id}")
            return None
        if to_port.direction == PortDirection.OUTPUT:
            logger.error(f"Porta de destino é OUTPUT: {to_port.id}")
            return None

        if from_port.is_connected() and from_port.direction != PortDirection.BIDIRECTIONAL:
            logger.warning(f"Porta já conectada: {from_port.id}")

        conn = Connection(
            id=ids.tagged("conn"),
            from_port=from_port.qualified_id or from_port.id,
            to_port=to_port.qualified_id or to_port.id,
            domain=from_port.domain,
            properties=properties or {},
            from_device=from_port.device_id or "",
            to_device=to_port.device_id or "",
        )

        self.connections[conn.id] = conn
        from_port.connected_to = to_port.qualified_id or to_port.id
        to_port.connected_to = from_port.qualified_id or from_port.id

        # Índices (usando IDs qualificados)
        fq = from_port.qualified_id or from_port.id
        tq = to_port.qualified_id or to_port.id
        self._by_port.setdefault(fq, []).append(conn.id)
        self._by_port.setdefault(tq, []).append(conn.id)
        self._adjacency.setdefault(fq, []).append(tq)
        self._adjacency.setdefault(tq, []).append(fq)

        logger.info(f"Conexão criada: {from_port.id} -> {to_port.id} ({from_port.domain.value})")
        return conn

    def disconnect(self, connection_id: str):
        """Remove uma conexão."""
        conn = self.connections.get(connection_id)
        if not conn:
            return
        # Nota: as portas mantêm connected_to; quem gerencia portas limpa isso
        del self.connections[connection_id]
        for port_id in (conn.from_port, conn.to_port):
            if connection_id in self._by_port.get(port_id, []):
                self._by_port[port_id].remove(connection_id)

    def disconnect_port(self, port_id: str):
        """Remove todas as conexões de uma porta."""
        conn_ids = self._by_port.get(port_id, []).copy()
        for cid in conn_ids:
            self.disconnect(cid)

    def get_connections(self, port_id: str = None) -> List[Connection]:
        """Lista conexões (de uma porta ou todas)."""
        if port_id:
            conn_ids = self._by_port.get(port_id, [])
            return [self.connections[c] for c in conn_ids if c in self.connections]
        return list(self.connections.values())

    def get_neighbors(self, port_id: str) -> List[str]:
        """Retorna portas conectadas a uma porta."""
        return self._adjacency.get(port_id, [])

    def propagate(self, ports: Dict[str, Port]):
        """Propaga valores das portas de saída para as conectadas."""
        for conn in self.connections.values():
            from_port = ports.get(conn.from_port)
            to_port = ports.get(conn.to_port)
            if not from_port or not to_port:
                continue

            # Aplicar propriedades da conexão (ex: queda de tensão)
            value = from_port.value
            props = conn.properties

            # origem ainda não escreveu nada (1º tick, ou saída desligada):
            # não há o que propagar — evita None * float
            if value is None:
                continue

            # só perdas numéricas fazem sentido em valores escalares;
            # pacotes (dict) passam direto (ex: {pressure_bar, flow_m3h})
            escalar = isinstance(value, (int, float)) and not isinstance(value, bool)

            if conn.domain == PortDomain.ELECTRICAL and escalar:
                resistance = props.get("resistance", 0.0)
                if resistance > 0 and from_port.data_type == PortDataType.ANALOG:
                    # Queda de tensão simplificada: V_out = V_in - I*R
                    # (sem corrente conhecida, aplicar fator de perda)
                    loss = props.get("loss_factor", 0.0)
                    value = value * (1 - loss)

            if conn.domain == PortDomain.PNEUMATIC and escalar:
                diameter = props.get("diameter", 0.025)
                length = props.get("length", 1.0)
                # Perda de carga simplificada
                loss = props.get("loss_factor", 0.05)
                if from_port.data_type == PortDataType.PRESSURE:
                    value = value * (1 - loss)

            if conn.domain == PortDomain.HYDRAULIC and escalar:
                loss = props.get("loss_factor", 0.1)
                if from_port.data_type == PortDataType.PRESSURE:
                    value = value * (1 - loss)

            if conn.domain == PortDomain.MECHANICAL:
                # Eixo: propaga pacote {rpm, torque_nm, direction} sem perda
                # (a relação de transmissão é aplicada pelo elemento de transmissão)
                value = from_port.value

            to_port.write(value)

    def to_dict(self) -> dict:
        return {
            "connections": [c.to_dict() for c in self.connections.values()],
            "total": len(self.connections),
        }

    def clear(self):
        self.connections.clear()
        self._by_port.clear()
        self._adjacency.clear()

    def __repr__(self):
        return f"<ConnectionGraph: {len(self.connections)} connections>"
