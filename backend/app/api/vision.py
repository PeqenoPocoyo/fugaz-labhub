"""
API — Visão Computacional (OpenCV)
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel

from app.main import state

router = APIRouter()


class DetectionRequest(BaseModel):
    camera_id: Optional[str] = None
    mode: str = "contours"  # contours, color, barcode
    min_area: int = 500
    color_lower: Optional[list] = None  # HSV
    color_upper: Optional[list] = None


class CameraCreate(BaseModel):
    camera_id: str
    source: str = "0"  # índice webcam, URL RTSP, ou caminho de arquivo


@router.get("/references/{camera_id}")
async def detect_references(camera_id: str):
    """
    Projeta as referências (fitas, marcadores, alvos) no campo de vista
    FIXO da câmera. Retorna bboxes normalizadas para overlay 2D.
    """
    camera = state.engine.world.get_node(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Câmera não encontrada")
    from app.devices.vision import detect_references as _detect
    detections = _detect(camera, state.engine.world.nodes)
    return {
        "camera_id": camera_id,
        "count": len(detections),
        "detections": detections,
    }


@router.get("/status")
async def vision_status():
    """Status da visão computacional."""
    import cv2
    return {
        "opencv_version": cv2.__version__,
        "cameras": [],
        "available": True,
    }


@router.post("/cameras")
async def create_camera(req: CameraCreate):
    """Registra uma câmera."""
    from app.vision.camera import Camera
    # Câmera como nó no mundo
    device = state.registry.create("camera_ip")
    if not device:
        raise HTTPException(status_code=500, detail="Falha ao criar câmera")
    device.id = req.camera_id
    device.set_property("source", req.source)
    state.engine.world.add_node(device)
    return {"success": True, "camera": device.to_dict()}


@router.get("/cameras")
async def list_cameras():
    """Lista câmeras no mundo."""
    cams = [
        d.to_dict() for d in state.engine.world.nodes.values()
        if d.__class__.__name__ == "Device" and "camera" in d.type_id
    ]
    return {"cameras": cams}


@router.post("/detect")
async def detect(req: DetectionRequest):
    """Executa detecção em um frame."""
    from app.vision.detectors import detect_contours, detect_color
    import numpy as np

    # Modo simulado: retorna estrutura de detecção vazia
    # (implementação real requer frame de câmera)
    return {
        "success": True,
        "mode": req.mode,
        "detections": [],
        "message": "Detecção simulada (nenhuma câmera ativa)",
    }
