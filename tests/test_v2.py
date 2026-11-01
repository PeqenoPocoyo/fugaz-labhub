"""
Testes do FUGAZ LABHUB v2 — Núcleo, Dispositivos, CLP e Simulação
"""
import pytest
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


# ============================================================
# NÚCLEO
# ============================================================

def test_event_bus():
    """Testa event bus."""
    from app.core.event_bus import EventBus
    bus = EventBus()
    received = []
    bus.on("test", lambda d: received.append(d))
    asyncio.run(bus.emit("test", 42))
    assert received == [42]


def test_clock_tick():
    """Testa relógio de simulação."""
    from app.sim.clock import SimulationClock
    clock = SimulationClock(60.0)
    assert clock.dt == 1.0 / 60.0
    dt = clock.force_step(10)
    assert dt == 10 / 60.0
    assert clock.tick_count == 10


# ============================================================
# DISPOSITIVOS
# ============================================================

def test_registry():
    """Testa registro de dispositivos."""
    from app.devices.registry import DeviceRegistry
    reg = DeviceRegistry()
    assert len(reg.factories) > 15
    assert "clp_generic" in reg.factories
    assert "sensor_photoelectric" in reg.factories
    assert "vfd_generic" in reg.factories
    assert "conveyor_belt" in reg.factories


def test_sensor_creation():
    """Testa criação de sensor."""
    from app.devices.sensors import create_photoelectric_sensor
    s = create_photoelectric_sensor()
    assert s.type_id == "sensor_photoelectric"
    assert "out" in s.ports


def test_sensor_detection():
    """Testa detecção do sensor."""
    from app.devices.sensors import create_photoelectric_sensor
    s = create_photoelectric_sensor()
    s.power_on()
    # Sem objeto
    s.properties["distance_mm"] = 1000
    s.update(1/60)
    assert s.read_port("out") == False
    # Com objeto
    s.properties["distance_mm"] = 100
    s.update(1/60)
    assert s.read_port("out") == True


def test_motor_creation():
    """Testa criação de motor."""
    from app.devices.actuators import create_dc_motor
    m = create_dc_motor()
    assert m.type_id == "motor_dc"
    assert "pwm" in m.ports


def test_vfd_creation():
    """Testa criação do VFD."""
    from app.devices.drives import create_vfd
    v = create_vfd()
    assert v.type_id == "vfd_generic"
    assert "di_start" in v.ports
    assert len(v.ports) == 18


def test_vfd_start_stop():
    """Testa start/stop do VFD."""
    from app.devices.drives import create_vfd
    v = create_vfd()
    v.power_on()
    v.set_property("accel_time_s", {"value": 0.5})
    v.write_port("di_start", True)
    for _ in range(10):
        v.update(1/60)
    assert v.properties["running"] == True
    # Parar
    v.write_port("di_start", False)
    v.set_property("accel_time_s", {"value": 0.5})
    for _ in range(60):
        v.update(1/60)
    assert v.properties["output_freq_hz"] < 0.01


# ============================================================
# CLP + MÓDULOS
# ============================================================

def test_clp_creation():
    """Testa criação do CLP."""
    from app.devices.clp_rack import CLPDevice
    clp = CLPDevice()
    assert clp.__class__.__name__ == "CLPDevice"
    assert clp.rack.slots == 8


def test_clp_install_modules():
    """Testa instalação de módulos."""
    from app.devices.clp_rack import CLPDevice
    clp = CLPDevice()
    m1 = clp.install_module("di_8_24v", 1)
    m2 = clp.install_module("do_8_24v", 2)
    assert m1 is not None
    assert m2 is not None
    assert 1 in clp.rack.modules
    assert 2 in clp.rack.modules
    # Portas registradas
    assert f"rack_{clp.rack.id}_s1_p0" in clp.ports
    assert f"rack_{clp.rack.id}_s2_p0" in clp.ports


def test_clp_memory():
    """Testa memória do CLP."""
    from app.devices.clp_rack import CLPDevice, MemoryMap
    mem = MemoryMap(100)
    mem.write_coil(0, True)
    assert mem.read_coil(0) == True
    mem.write_holding(5, 4200)
    assert mem.read_holding(5) == 4200


def test_clp_routing():
    """Testa roteamento (ligação entrada→saída)."""
    from app.devices.clp_rack import CLPDevice
    clp = CLPDevice()
    clp.install_module("di_8_24v", 1)
    clp.install_module("do_8_24v", 2)
    clp.route(1, 0, 2, 0)
    clp.write_input(1, 0, True)
    for _ in range(3):
        clp._do_scan(clp, 1/60)
    assert clp.read_output(2, 0) == True


# ============================================================
# MUNDO + SIMULAÇÃO
# ============================================================

def test_world_nodes():
    """Testa mundo com nós."""
    from app.sim.world import World
    from app.devices.sensors import create_photoelectric_sensor
    w = World()
    s = create_photoelectric_sensor()
    w.add_node(s)
    assert len(w.nodes) == 1
    w.remove_node(s.id)
    assert len(w.nodes) == 0


def test_world_connect_and_propagate():
    """Testa conexão e propagação de sinal."""
    from app.sim.world import World
    from app.io.ports import Port
    w = World()
    p_out = Port.digital_output("out1", "Saída")
    p_in = Port.digital_input("in1", "Entrada")
    conn = w.connections.connect(p_out, p_in)
    assert conn is not None
    p_out.write(True)
    w.connections.propagate({p_out.id: p_out, p_in.id: p_in})
    assert p_in.value == True


def test_scene_full_flow():
    """Testa cena completa: sensor → CLP → VFD → esteira."""
    from app.main import state
    state.engine.world.clear()

    clp = state.registry.create("clp_generic")
    clp.install_module("di_8_24v", 1)
    clp.install_module("do_8_24v", 2)
    vfd = state.registry.create("vfd_generic")
    sensor = state.registry.create("sensor_photoelectric")
    conveyor = state.registry.create("conveyor_belt")

    for d in [clp, vfd, sensor, conveyor]:
        state.engine.world.add_node(d)

    state.engine.world.connect(sensor.ports["out"].qualified_id, clp.ports[f"rack_{clp.rack.id}_s1_p0"].qualified_id)
    state.engine.world.connect(clp.ports[f"rack_{clp.rack.id}_s2_p0"].qualified_id, vfd.ports["di_start"].qualified_id)
    clp.route(1, 0, 2, 0)

    async def run():
        await state.engine.start()
        sensor.properties["distance_mm"] = 100
        await asyncio.sleep(0.5)
        assert sensor.read_port("out") == True
        assert clp.read_input(1, 0) == True
        assert clp.read_output(2, 0) == True
        assert vfd.properties["running"] == True
        await state.engine.stop()
    asyncio.run(run())
    state.engine.world.clear()


def test_conveyor_objects():
    """Testa objetos na esteira."""
    from app.devices.conveyors import create_conveyor_belt
    c = create_conveyor_belt()
    c.power_on()
    c.write_port("run", True)
    c.add_object_to_belt("box1", 5.0)
    for _ in range(10):
        c.update(1/60)
    objs = c.properties["objects_on_belt"]
    assert len(objs) == 1
    assert objs[0]["position_mm"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
