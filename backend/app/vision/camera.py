"""
Camera Device — Câmera como dispositivo conectável

Câmera é um nó especial que:
- Conecta a dispositivos programáveis (porta de dados)
- Tem vista fixa em elemento de fixação
- Expõe detecções como portas digitais/analógicas
"""
from typing import Any
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger


def create_camera() -> Device:
    """Cria uma câmera como dispositivo integrado."""
    dev = Device(
        type_id="camera_ip",
        name="Câmera Industrial",
        category=DeviceCategory.VISION,
        properties={
            "source": "0",           # webcam idx, RTSP URL, ou arquivo
            "resolution": [640, 480],
            "fps": 30,
            "fov_deg": 60,
            # --- Vista fixa ---
            "yaw_deg": 0,
            "pitch_deg": -15,
            "fixed_view": True,
            # --- Detecção ---
            "detection_mode": "contours",  # contours, color, barcode, references
            "min_area": 500,
            "color_lower": [0, 0, 0],
            "color_upper": [180, 255, 255],
            "detected_objects": 0,
            "detections": [],
            "last_detection": None,
            "running": False,
        },
        ports=[
            # Alimentação PoE
            Port.power("poe", "PoE"),
            # Conexão de dados (para CLP programável)
            Port.data("eth0", "Ethernet"),
            # Saídas de detecção (feed para outros dispositivos)
            Port.digital_output("detect", "Objeto Detectado"),
            Port.analog_output("count", "Contagem", (0, 100), "obj"),
            Port.analog_output("pos_x", "Posição X", (0, 640), "px"),
            Port.analog_output("pos_y", "Posição Y", (0, 480), "px"),
        ],
        metadata={"icon": "camera", "description": "Câmera com visão computacional"},
    )

    def update(dev: Device, dt: float):
        if not dev.properties.get("running", False):
            return

        # --- Modo "references": projeção das referências na vista fixa ---
        if dev.properties.get("detection_mode") == "references":
            from app.main import state
            from app.devices.vision import detect_references
            detections = detect_references(dev, state.engine.world.nodes)
            props = dev.properties
            props["detections"] = detections
            props["detected_objects"] = len(detections)
            props["last_detection"] = detections[0] if detections else None
            dev.write_port("detect", len(detections) > 0)
            dev.write_port("count", len(detections))
            if detections:
                bbox = detections[0].get("bbox", [0, 0, 0.1, 0.1])
                cx = (bbox[0] + bbox[2] / 2) * 640
                cy = (bbox[1] + bbox[3] / 2) * 480
                dev.write_port("pos_x", cx)
                dev.write_port("pos_y", cy)
            return

        from app.vision.engine import vision_engine
        cam_id = dev.id
        if cam_id not in vision_engine.cameras:
            vision_engine.add_camera(cam_id, dev.properties.get("source", "0"))

        mode = dev.properties.get("detection_mode", "contours")
        detections = vision_engine.run_detection(cam_id, mode,
            min_area=dev.properties.get("min_area", 500),
            color_lower=dev.properties.get("color_lower", [0,0,0]),
            color_upper=dev.properties.get("color_upper", [180,255,255]),
        )

        count = len(detections)
        dev.properties["detected_objects"] = count
        dev.properties["last_detection"] = detections[0] if detections else None

        dev.write_port("detect", count > 0)
        dev.write_port("count", count)
        if detections:
            bbox = detections[0].get("bbox", [0, 0, 0, 0])
            cx = bbox[0] + bbox[2] // 2
            cy = bbox[1] + bbox[3] // 2
            dev.write_port("pos_x", cx)
            dev.write_port("pos_y", cy)

    dev.add_behaviour(Behaviour(name="vision", trigger=Trigger.ON_TICK, action=update))
    return dev


CAMERA_FACTORY = {"camera_ip": create_camera}
