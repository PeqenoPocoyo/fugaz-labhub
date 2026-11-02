"""
API — Dispositivos
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.main import state

router = APIRouter()


class SpawnRequest(BaseModel):
    type_id: str
    position: Optional[List[float]] = None
    rotation: Optional[List[float]] = None   # yaw/pitch/roll em graus
    layer: Optional[str] = "devices"
    properties: Optional[dict] = None
    # bornes declarados pelo modelo 3D (posição real na carcaça).
    # Quando presentes, sobrescrevem o auto-layout — o fio nasce no borne.
    port_anchors: Optional[Dict[str, List[float]]] = None


class ModuleInstallRequest(BaseModel):
    clp_id: str
    spec_key: str
    slot: int


class UpdateRequest(BaseModel):
    properties: Optional[dict] = None
    transform: Optional[dict] = None


@router.get("/types")
async def list_types(category: Optional[str] = None):
    """Lista tipos de dispositivos disponíveis."""
    return {
        "types": state.registry.list_types(category),
        "categories": state.registry.list_categories(),
    }


@router.get("/types/{type_id}")
async def get_type(type_id: str):
    """Obtém informações de um tipo."""
    if not state.registry.has(type_id):
        raise HTTPException(status_code=404, detail=f"Tipo não encontrado: {type_id}")
    return state.registry.get_info(type_id)


@router.post("/spawn")
async def spawn_device(req: SpawnRequest):
    """Cria um dispositivo no mundo."""
    device = state.registry.create(req.type_id)
    if not device:
        raise HTTPException(status_code=400, detail=f"Falha ao criar: {req.type_id}")

    device.layer = req.layer
    # Posição: explícita, ou próxima vaga em grade
    if req.position is not None and any(p != 0 for p in req.position):
        device.place(tuple(req.position))
    else:
        device.place(state.engine.world.next_slot_position())

    if req.rotation is not None and len(req.rotation) == 3:
        device.transform.rotation = tuple(req.rotation)

    # bornes do modelo 3D (posição real na carcaça) têm prioridade sobre
    # o auto-layout — é o que faz o fio começar exatamente no conector
    if req.port_anchors:
        device.port_anchors = {k: tuple(v) for k, v in req.port_anchors.items()}
    if req.properties:
        device.properties.update(req.properties)

    state.engine.world.add_node(device)
    await state.event_bus.emit("device_spawned", device.to_dict())
    return device.to_dict()


@router.get("/")
async def list_devices():
    """Lista dispositivos no mundo."""
    return {"devices": [d.to_dict() for d in state.engine.world.nodes.values()]}


@router.get("/{device_id}")
async def get_device(device_id: str):
    device = state.engine.world.get_node(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    return device.to_dict()


@router.patch("/{device_id}")
async def update_device(device_id: str, req: UpdateRequest):
    device = state.engine.world.get_node(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    if req.properties:
        device.properties.update(req.properties)
    if req.transform:
        if "position" in req.transform:
            device.place(tuple(req.transform["position"]))
        if "rotation" in req.transform:
            device.transform.rotation = tuple(req.transform["rotation"])
        if "scale" in req.transform:
            device.transform.scale = tuple(req.transform["scale"])
    return device.to_dict()


@router.delete("/{device_id}")
async def delete_device(device_id: str):
    if not state.engine.world.get_node(device_id):
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    state.engine.world.remove_node(device_id)
    await state.event_bus.emit("device_deleted", {"id": device_id})
    return {"success": True, "id": device_id}


def _resolve_port(device, port_id: str):
    """Resolve porta por ID local ou qualificado."""
    port = device.get_port(port_id)
    if port:
        return port
    # Tentar remover prefixo do device_id (ID qualificado)
    if port_id.startswith(f"{device.id}_"):
        local = port_id[len(f"{device.id}_"):]
        return device.get_port(local)
    return None


@router.post("/{device_id}/port/{port_id}")
async def write_port(device_id: str, port_id: str, value: dict):
    """Escreve valor em uma porta do dispositivo."""
    device = state.engine.world.get_node(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    port = _resolve_port(device, port_id)
    if not port:
        raise HTTPException(status_code=404, detail=f"Porta não encontrada: {port_id}")
    port.write(value.get("value"))
    return {"success": True, "port": port.to_dict()}


@router.get("/{device_id}/port/{port_id}")
async def read_port(device_id: str, port_id: str):
    """Lê valor de uma porta do dispositivo."""
    device = state.engine.world.get_node(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    port = _resolve_port(device, port_id)
    if not port:
        raise HTTPException(status_code=404, detail=f"Porta não encontrada: {port_id}")
    return {"port": port.to_dict(), "value": port.read()}


@router.post("/clp/install-module")
async def install_module(req: ModuleInstallRequest):
    """Instala um módulo em um slot do CLP."""
    device = state.engine.world.get_node(req.clp_id)
    if not device or device.__class__.__name__ != "CLPDevice":
        raise HTTPException(status_code=400, detail="CLP não encontrado")
    module = device.install_module(req.spec_key, req.slot)
    if not module:
        raise HTTPException(status_code=400, detail="Falha ao instalar módulo")
    return {"success": True, "module": module.to_dict()}


class SnapRequest(BaseModel):
    device_id: str
    fixation_id: str


class GridSnapRequest(BaseModel):
    device_id: str


@router.get("/{device_id}/fixations")
async def list_fixations(device_id: str):
    """Lista pontos de fixação de um dispositivo."""
    device = state.engine.world.get_node(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    return {
        "device_id": device_id,
        "fixations": [f.to_dict() for f in device.fixations],
        "slots": [s.to_dict() for s in device.slots],
    }


@router.post("/snap")
async def snap_magnetic(req: SnapRequest):
    """
    Resolve o encaixe magnético: move o dispositivo para que o ponto de
    fixação coincida com o slot livre mais próximo.
    """
    from app.devices.fixation import MagneticSystem
    world = state.engine.world
    device = world.get_node(req.device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    fixation = next((f for f in device.fixations if f.id == req.fixation_id), None)
    if not fixation:
        raise HTTPException(status_code=400, detail=f"Ponto de fixação não encontrado: {req.fixation_id}")

    # Coletar todos os slots livres do mundo (exceto do próprio dispositivo)
    all_slots = []
    for node in world.nodes.values():
        if node.id == device.id:
            continue
        for slot in getattr(node, "slots", []):
            all_slots.append(slot)

    mag = MagneticSystem()
    result = mag.find_slot(fixation, device.transform.position, all_slots)

    if not result:
        return {"success": False, "message": "Nenhum slot livre no alcance"}

    slot = result["slot"]
    # Aplicar snap
    device.place(result["target_position"])
    slot.occupied_by = device.id
    world.version += 1

    addLog = getattr(state, "_noop", None)
    await state.event_bus.emit("device_snapped", {
        "device_id": device.id, "fixation": fixation.id,
        "slot": slot.id, "aligned": result["aligned"],
    })
    return {
        "success": True,
        "device_id": device.id,
        "fixation": fixation.id,
        "slot_id": slot.id,
        "slot_label": slot.label,
        "position": list(device.transform.position),
        "aligned": result["aligned"],
        "strength": round(result["strength"], 3),
    }


class SnapShaftRequest(BaseModel):
    transmissao_id: str     # engrenagem/correia/fuso...
    motor_id: str           # Motor/VFD que tem o eixo
    shaft_fixation_id: str = "eixo_entrada"
    motor_port: str = "shaft_out"


@router.post("/snap-shaft")
async def snap_shaft(req: SnapShaftRequest):
    """
    Encaixe por EIXO: alinha o cubo da transmissão ao eixo do motor.

    Diferente do snap por base (que alinha um furo): aqui o que encaixa é o
    EIXO — a transmissão é posicionada de forma que o eixo do motor passe
    pelo cubo de entrada, com a mesma orientação do eixo do motor.
    """
    world = state.engine.world
    trans = world.get_node(req.transmissao_id)
    motor = world.get_node(req.motor_id)
    if not trans or not motor:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")

    fix = next((f for f in trans.shaft_fixations if f.id == req.shaft_fixation_id), None)
    if not fix:
        raise HTTPException(status_code=400,
                            detail=f"{trans.type_id} não tem fixação de eixo '{req.shaft_fixation_id}'")

    # eixo DECLARADO do motor (fonte da verdade, junto com o modelo 3D)
    eixo = next(iter(motor.shafts), None)
    if eixo is None:
        raise HTTPException(
            status_code=400,
            detail=f"{motor.type_id} nao tem eixo declarado para acoplar transmissao"
        )

    hub_mundo = eixo.world_position(motor.transform.position)
    eixo_dir = eixo.direction

    # posição da transmissão: hub coincide com o eixo, com folga mínima
    # para o cubo não atravessar a carcaça do motor
    gap = 0.04
    novo = (
        hub_mundo[0] - fix.local_offset[0] + eixo_dir[0] * gap,
        hub_mundo[1] - fix.local_offset[1] + eixo_dir[1] * gap,
        hub_mundo[2] - fix.local_offset[2] + eixo_dir[2] * gap,
    )
    trans.place(novo)

    # alinha a rotação da transmissão ao eixo do motor (mesmo yaw)
    yaw_motor = motor.transform.rotation[0] if motor.transform.rotation else 0.0
    trans.transform.rotation = (yaw_motor, 0.0, 0.0)

    world.version += 1

    await state.event_bus.emit("shaft_snapped", {
        "transmissao": trans.id, "motor": motor.id,
        "hub": fix.id, "posicao": list(novo),
    })
    return {
        "success": True,
        "transmissao_id": trans.id,
        "motor_id": motor.id,
        "hub": fix.id,
        "position": list(novo),
        "eixo_dir": list(eixo_dir),
    }


@router.post("/grid-snap")
async def grid_snap(req: GridSnapRequest):
    """Snap fino do dispositivo à grade do mundo."""
    from app.devices.fixation import MagneticSystem
    world = state.engine.world
    device = world.get_node(req.device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    mag = MagneticSystem(snap_enabled=True, grid_spacing=0.1)
    device.place(mag.snap_to_grid(device.transform.position))
    return {"success": True, "position": list(device.transform.position)}
    clp_id: str
    in_slot: int
    in_point: int
    out_slot: int
    out_point: int
    invert: bool = False


class RouteRequest(BaseModel):
    clp_id: str
    in_slot: int
    in_point: int
    out_slot: int
    out_point: int
    invert: bool = False


class ResizeRequest(BaseModel):
    cells_x: Optional[int] = None
    cells_y: Optional[int] = None
    segments: Optional[int] = None
    diameter_mm: Optional[int] = None


@router.post("/{device_id}/resize")
async def resize_device(device_id: str, req: ResizeRequest):
    """
    Redimensiona um elemento escalável (esteira em grade X×Y, duto em
    segmentos). O front chama isto durante o drag de escala.
    """
    world = state.engine.world
    device = world.get_node(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    resize = getattr(device, "resize", None)
    if not resize:
        raise HTTPException(status_code=400,
                            detail=f"{device.type_id} não é escalável")
    size = {}
    if req.cells_x is not None: size["cells_x"] = req.cells_x
    if req.cells_y is not None: size["cells_y"] = req.cells_y
    if req.segments is not None: size["segments"] = req.segments
    if req.diameter_mm is not None: size["diameter_mm"] = req.diameter_mm
    resize(**size)
    world.version += 1
    return {"success": True, "properties": device.properties}


@router.post("/clp/route")
async def clp_route(req: RouteRequest):
    """Configura roteamento simples no CLP (copia entrada→saída)."""
    device = state.engine.world.get_node(req.clp_id)
    if not device or device.__class__.__name__ != "CLPDevice":
        raise HTTPException(status_code=400, detail="CLP não encontrado")
    device.route(req.in_slot, req.in_point, req.out_slot, req.out_point, req.invert)
    return {"success": True, "routing": device.routing}
