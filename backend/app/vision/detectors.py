"""
Vision Detectors — Detectores OpenCV
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


def detect_contours(frame: np.ndarray, min_area: int = 500) -> List[dict]:
    """Detecta objetos por contornos."""
    if not CV2_AVAILABLE or frame is None:
        return []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    detections = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(contour)
            detections.append({
                "type": "contour",
                "bbox": [x, y, w, h],
                "area": float(area),
                "center": [x + w // 2, y + h // 2],
            })
    return detections


def detect_color(frame: np.ndarray, lower: list, upper: list, min_area: int = 500) -> List[dict]:
    """Detecta objetos por cor HSV."""
    if not CV2_AVAILABLE or frame is None:
        return []
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    detections = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(contour)
            detections.append({
                "type": "color",
                "bbox": [x, y, w, h],
                "area": float(area),
                "center": [x + w // 2, y + h // 2],
            })
    return detections


def detect_barcode(frame: np.ndarray) -> List[dict]:
    """Detecta códigos de barras/QR."""
    if not CV2_AVAILABLE or frame is None:
        return []
    try:
        from pyzbar.pyzbar import decode
        decoded = decode(frame)
        return [{"type": "barcode", "data": d.data.decode(), "rect": d.rect} for d in decoded]
    except ImportError:
        return []
