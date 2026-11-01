"""
Drives — Inversor de frequência parametrizável

Drive genérico (VFD) com parâmetros configuráveis, controle de
velocidade, rampas de aceleração/desaceleração e portas integradas.
"""
from typing import Any
from loguru import logger

from app.io.ports import Port, PortDomain, PortDirection, PortDataType
from app.devices.base import Device, DeviceCategory, Behaviour, Trigger


def create_vfd() -> Device:
    """Inversor de frequência parametrizável (genérico)."""
    dev = Device(
        type_id="vfd_generic",
        name="Inversor de Frequência",
        category=DeviceCategory.DRIVE,
        properties={
            # Parâmetros do motor
            "motor_power_kw": {"value": 2.2, "unit": "kW", "configurable": True},
            "motor_voltage_v": {"value": 380, "unit": "V", "configurable": True},
            "motor_current_a": {"value": 5.0, "unit": "A", "configurable": True},
            "motor_poles": {"value": 4, "configurable": True},
            "motor_nominal_rpm": {"value": 1750, "unit": "RPM"},
            # Parâmetros de operação
            "max_freq_hz": {"value": 60, "unit": "Hz", "configurable": True},
            "min_freq_hz": {"value": 0, "unit": "Hz", "configurable": True},
            "accel_time_s": {"value": 5.0, "unit": "s", "configurable": True},
            "decel_time_s": {"value": 5.0, "unit": "s", "configurable": True},
            # Estado runtime
            "output_freq_hz": 0.0,
            "output_rpm": 0.0,
            "running": False,
            "fault": False,
            "fault_code": None,
            "direction": 1,  # 1=frente, -1=reverso
        },
        ports=[
            # Alimentação
            Port.power("l1", "L1"),
            Port.power("l2", "L2"),
            Port.power("l3", "L3"),
            # Saída para motor
            Port.power("u", "Motor U"),
            Port.power("v", "Motor V"),
            Port.power("w", "Motor W"),
            # Controle digital
            Port.digital_input("di_start", "DI Start"),
            Port.digital_input("di_stop", "DI Stop"),
            Port.digital_input("di_fwd", "DI Frente"),
            Port.digital_input("di_rev", "DI Reverso"),
            Port.digital_input("di_reset", "DI Reset"),
            Port.digital_input("di_fault", "DI Falha"),
            # Controle analógico
            Port.analog_input("ai_speed", "AI Velocidade 0-10V", (0, 10), "V"),
            # Saídas de status
            Port.digital_output("do_run", "DO Rodando"),
            Port.digital_output("do_fault", "DO Falha"),
            Port.digital_output("do_ready", "DO Pronto"),
            Port.analog_output("ao_freq", "AO Freq. Saída", (0, 60), "Hz"),
            # Comunicação
            Port.data("rs485", "RS-485"),
        ],
        metadata={"icon": "vfd", "description": "Inversor de frequência parametrizável"},
    )

    def update(dev: Device, dt: float):
        props = dev.properties

        # Ler entradas de controle (porta digital tem prioridade sobre analógica)
        start = dev.read_port("di_start") or 0
        stop = dev.read_port("di_stop") or 0
        fwd = dev.read_port("di_fwd") or 1
        rev = dev.read_port("di_rev") or 0
        fault_input = dev.read_port("di_fault") or 0

        # Reset de falha
        if dev.read_port("di_reset"):
            props["fault"] = False
            props["fault_code"] = None

        # Falha externa
        if fault_input:
            props["fault"] = True
            props["fault_code"] = "EF"  # External Fault

        # Direção
        if rev:
            props["direction"] = -1
        elif fwd:
            props["direction"] = 1

        # Comando de velocidade
        ai_speed = dev.read_port("ai_speed") or 0.0
        max_freq = props.get("max_freq_hz", {}).get("value", 60)
        min_freq = props.get("min_freq_hz", {}).get("value", 0)
        # Velocidade alvo (Hz)
        target_freq = min_freq + (ai_speed / 10.0) * (max_freq - min_freq)

        # Rampas de aceleração/desaceleração
        current = props.get("output_freq_hz", 0.0)
        accel = props.get("accel_time_s", {}).get("value", 5.0)
        decel = props.get("decel_time_s", {}).get("value", 5.0)

        # Lógica start/stop (intuitiva): start alto = acelera; start baixo = desacelera (rampa)
        if props["fault"] or stop:
            props["running"] = False
        elif start:
            props["running"] = True
        else:
            # Sem comando de start: desacelerar até zero
            if current <= 0.01:
                props["running"] = False

        if props["running"]:
            rate = (max_freq / accel) if accel > 0 else max_freq
            if current < target_freq:
                current = min(target_freq, current + rate * dt)
            elif current > target_freq:
                current = max(target_freq, current - rate * dt)
        else:
            rate = (max_freq / decel) if decel > 0 else max_freq
            current = max(0, current - rate * dt)

        props["output_freq_hz"] = current

        # Calcular RPM do motor: RPM = 120 * f / polos
        poles = props.get("motor_poles", {}).get("value", 4)
        rpm = (120 * current / poles) * props["direction"] if poles > 0 else 0
        props["output_rpm"] = rpm

        # Atualizar portas de saída
        dev.write_port("do_run", props["running"])
        dev.write_port("do_fault", props["fault"])
        dev.write_port("do_ready", not props["fault"])
        dev.write_port("ao_freq", current)
        dev.write_port("u", props["motor_voltage_v"].get("value", 380) if props["running"] else 0)
        dev.write_port("v", props["motor_voltage_v"].get("value", 380) if props["running"] else 0)
        dev.write_port("w", props["motor_voltage_v"].get("value", 380) if props["running"] else 0)

        # Estado do dispositivo
        dev.state["active"] = props["running"]
        dev.state["error"] = props["fault"]
        dev.state["error_msg"] = props["fault_code"] or ""

    # ---------- Behaviours ----------

    dev.add_behaviour(Behaviour(name="drive_control", trigger=Trigger.ON_TICK, action=update))
    return dev


def create_soft_starter() -> Device:
    """Soft starter (partida suave) — alternativa ao VFD."""
    dev = Device(
        type_id="soft_starter",
        name="Soft Starter",
        category=DeviceCategory.DRIVE,
        properties={
            "motor_power_kw": {"value": 5.0, "unit": "kW"},
            "ramp_time_s": {"value": 5.0, "unit": "s"},
            "kick_start": False,
            "running": False,
            "voltage_pct": 0.0,
        },
        ports=[
            Port.power("l1", "L1"),
            Port.power("l2", "L2"),
            Port.power("l3", "L3"),
            Port.digital_input("start", "Start"),
            Port.digital_input("stop", "Stop"),
            Port.digital_output("run", "Run"),
            Port.digital_output("bypass", "Bypass"),
        ],
        metadata={"icon": "soft_starter", "description": "Partida suave"},
    )

    def update(dev: Device, dt: float):
        start = dev.read_port("start")
        stop = dev.read_port("stop")
        ramp = dev.properties.get("ramp_time_s", {}).get("value", 5.0)
        if start and not stop:
            dev.properties["running"] = True
        if stop:
            dev.properties["running"] = False

        voltage = dev.properties.get("voltage_pct", 0.0)
        if dev.properties["running"]:
            rate = 100 / ramp if ramp > 0 else 100
            voltage = min(100, voltage + rate * dt)
        dev.properties["voltage_pct"] = voltage
        dev.write_port("run", dev.properties["running"])
        dev.write_port("bypass", voltage >= 100)

    dev.add_behaviour(Behaviour(name="run", trigger=Trigger.ON_TICK, action=update))
    return dev


DRIVE_FACTORY = {
    "vfd_generic": create_vfd,
    "soft_starter": create_soft_starter,
}
