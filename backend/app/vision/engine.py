"""
Vision Engine — Motor de visão computacional

Gerencia câmeras, captura de frames e executa detectores OpenCV.
"""
import asyncio
from typing import Dict, List, Any, Optional
from loguru import logger

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV não disponível")


class VisionEngine:
    """Motor de visão computacional."""

    def __init__(self):
        self.cameras: Dict[str, Any] = {}
        self.detections: List[dict] = []

    def add_camera(self, camera_id: str, source: str = "0"):
        """Adiciona uma câmera."""
        if not CV2_AVAILABLE:
            logger.warning(f"OpenCV indisponível, câmera {camera_id} em modo simulado")
            self.cameras[camera_id] = {"source": source, "mode": "simulated"}
            return
        try:
            # Tentar converter source para int (webcam)
            try:
                src = int(source)
            except (ValueError, TypeError):
                src = source
            cap = cv2.VideoCapture(src)
            if cap.isOpened():
                self.cameras[camera_id] = {"cap": cap, "source": source, "mode": "live"}
                logger.info(f"Câmera {camera_id} adicionada ({source})")
            else:
                cap.release()
                self.cameras[camera_id] = {"source": source, "mode": "simulated"}
                logger.warning(f"Não foi possível abrir câmera {source}, modo simulado")
        except Exception as e:
            logger.error(f"Erro ao adicionar câmera: {e}")
            self.cameras[camera_id] = {"source": source, "mode": "simulated"}

    def remove_camera(self, camera_id: str):
        cam = self.cameras.get(camera_id)
        if cam and cam.get("mode") == "live" and cam.get("cap"):
            cam["cap"].release()
        del self.cameras[camera_id]

    def capture_frame(self, camera_id: str) -> Optional[Any]:
        """Captura um frame de uma câmera."""
        cam = self.cameras.get(camera_id)
        if not cam:
            return None
        if cam["mode"] == "live" and cam.get("cap"):
            ret, frame = cam["cap"].read()
            return frame if ret else None
        return None  # simulado

    def run_detection(self, camera_id: str, mode: str = "contours", **params) -> List[dict]:
        """Executa detecção em um frame."""
        from app.vision.detectors import detect_contours, detect_color, detect_barcode
        frame = self.capture_frame(camera_id)
        if frame is None:
            return []
        if mode == "contours":
            return detect_contours(frame, params.get("min_area", 500))
        elif mode == "color":
            lower = params.get("color_lower", [0, 0, 0])
            upper = params.get("color_upper", [180, 255, 255])
            return detect_color(frame, lower, upper, params.get("min_area", 500))
        elif mode == "barcode":
            return detect_barcode(frame)
        return []

    def status(self) -> dict:
        return {
            "opencv_available": CV2_AVAILABLE,
            "cameras": {k: v["mode"] for k, v in self.cameras.items()},
            "total_detections": len(self.detections),
        }


# Instância global
vision_engine = VisionEngine()
