"""
Testes do FUGAZ LABHUB v3 — Transmissões, Trem de Força,
Esteiras Escaláveis, Visão Computacional e Fluidos
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


# ============================================================
# TRANSMISSÕES
# ============================================================

def test_gear_ratio():
    """Par de engrenagens calcula razão por dentes (e inverte o sentido)."""
    from app.devices.transmission import create_gears
    dev = create_gears()
    dev.properties["teeth_in"] = 10
    dev.properties["teeth_out"] = 40
    dev.on_start()
    dev.write_port("shaft_in", {"rpm": 100, "torque_nm": 5, "direction": 1})
    dev.update(1 / 60)
    assert dev.properties["ratio"] == 4.0
    # engrenagens externas invertem o sentido: 100 rpm → -25 rpm
    assert dev.properties["rpm_out"] == pytest.approx(-25.0, abs=0.01)


def test_belt_ratio_diameter():
    """Correia: razão pelo diâmetro das polias."""
    from app.devices.transmission import create_belt
    dev = create_belt()
    dev.properties["pulley_d_in_mm"] = 50
    dev.properties["pulley_d_out_mm"] = 150
    dev.on_start()
    dev.write_port("shaft_in", {"rpm": 300, "torque_nm": 2, "direction": 1})
    dev.update(1 / 60)
    assert dev.properties["ratio"] == 3.0
    assert dev.properties["rpm_out"] == pytest.approx(100.0, abs=0.01)


def test_coupling_is_direct():
    """Acoplamento transmite 1:1."""
    from app.devices.transmission import create_coupling
    dev = create_coupling()
    dev.on_start()
    dev.write_port("shaft_in", {"rpm": 120, "torque_nm": 10, "direction": 1})
    dev.update(1 / 60)
    assert dev.properties["rpm_out"] == 120


def test_screw_rotation_to_linear():
    """Fuso converte rotação em avanço linear."""
    from app.devices.transmission import create_screw
    dev = create_screw()
    dev.properties["lead_mm"] = 4.0
    dev.properties["position_mm"] = 0.0
    dev.on_start()
    dev.write_port("shaft_in", {"rpm": 60, "torque_nm": 1, "direction": 1})
    dev.update(1.0)  # 1 segundo a 60rpm = 1 volta = 4mm
    assert dev.properties["linear_speed_mm_s"] == pytest.approx(4.0, abs=0.01)
    assert dev.properties["position_mm"] == pytest.approx(4.0, abs=0.05)


def test_linear_actuator_extend():
    """Atuador linear avança ao comando extend."""
    from app.devices.transmission import create_linear_actuator
    dev = create_linear_actuator()
    dev.properties["stroke_mm"] = 100
    dev.properties["position_mm"] = 0.0
    dev.on_start()
    dev.write_port("extend", True)
    dev.update(0.5)
    assert dev.properties["position_mm"] > 0
    assert dev.properties["extended_pct"] > 0


# ============================================================
# ESTEIRAS ESCALÁVEIS + VELOCIDADE POR RPM
# ============================================================

def test_conveyor_scalable():
    """Esteira é escalável em células X×Y."""
    from app.devices.conveyors import create_conveyor_belt
    dev = create_conveyor_belt()
    assert dev.properties["cells_x"] == 5
    dev.resize(52, 4)
    assert dev.properties["cells_x"] == 52
    assert dev.properties["cells_y"] == 4
    # limites de sanidade
    dev.resize(999, 999)
    assert dev.properties["cells_x"] == 200
    dev.resize(0, 0)
    assert dev.properties["cells_x"] == 1


def test_conveyor_speed_from_rpm():
    """Velocidade da correia derivada do RPM do eixo: v = RPM·π·D/60."""
    from app.devices.conveyors import create_conveyor_belt, _belt_speed_from_rpm
    # 100 rpm, rolo de 100mm → v = 100·π·0.1/60 ≈ 0.524 m/s
    assert _belt_speed_from_rpm(100, 100) == pytest.approx(0.5236, abs=0.001)

    dev = create_conveyor_belt()
    dev.properties["drive_mode"] = "rpm"
    dev.properties["roller_diameter_mm"] = 100
    dev.properties["max_speed_m_s"] = 10
    dev.properties["running"] = True
    dev.on_start()
    dev.write_port("shaft", {"rpm": 100, "torque_nm": 0, "direction": 1})
    dev.update(1 / 60)
    assert dev.properties["shaft_rpm"] == pytest.approx(100, abs=0.5)
    assert dev.properties["speed_m_s"] == pytest.approx(0.5236, abs=0.002)
    assert dev.properties["length_mm"] == 1000  # 5 células × 200mm


# ============================================================
# TREM DE FORÇA (mundo)
# ============================================================

def _mini_world():
    from app.sim.world import World
    from app.devices.registry import registry
    world = World()
    return world, registry


def test_drivetrain_resolution():
    """VFD → engrenagens → esteira: razão aplicada no RPM final."""
    from app.sim.world import World
    from app.devices.registry import registry

    world = World()
    vfd = registry.create("vfd_generic")
    gears = registry.create("trans_gears")
    conveyor = registry.create("conveyor_belt")
    for d in (vfd, gears, conveyor):
        world.add_node(d)

    world.link_drivetrain(vfd.id, conveyor.id, [gears.id])
    assert len(world.drivetrains) == 1
    assert world.drivetrains[0]["mode"] == "linked"

    # fonte com 1800 rpm; engrenagens 18/54 → ratio 3
    vfd.properties["output_rpm"] = 1800
    world.sim_running = True
    world.resolve_drivetrains()

    assert conveyor.properties["shaft_rpm"] == pytest.approx(600, abs=1)
    assert gears.properties["rpm_in"] == pytest.approx(1800, abs=1)
    assert gears.properties["rpm_out"] == pytest.approx(600, abs=1)


def test_drivetrain_removed_with_node():
    """Remover um nó limpa os trens de força que o referenciam."""
    from app.sim.world import World
    from app.devices.registry import registry

    world = World()
    vfd = registry.create("vfd_generic")
    conveyor = registry.create("conveyor_belt")
    world.add_node(vfd)
    world.add_node(conveyor)
    world.link_drivetrain(vfd.id, conveyor.id, [])

    world.remove_node(vfd.id)
    assert world.drivetrains == []


def test_new_node_powered_when_running():
    """Nó spawnado com a simulação rodando nasce energizado."""
    from app.sim.world import World
    from app.devices.registry import registry

    world = World()
    world.sim_running = True
    motor = registry.create("motor_dc")
    world.add_node(motor)
    assert motor.state["powered"] is True


# ============================================================
# VISÃO COMPUTACIONAL
# ============================================================

def test_vision_reference_detection():
    """Referências dentro do campo de vista são detectadas com bbox."""
    from app.sim.world import World
    from app.devices.registry import registry
    from app.devices.vision import detect_references

    world = World()
    cam = registry.create("camera_ip")
    tape = registry.create("vision_tape")
    world.add_node(cam)
    world.add_node(tape)

    # câmera em (0, 0.5, 0) olhando para +Z (yaw 0)
    cam.transform.position = (0, 0.5, 0)
    cam.properties["yaw_deg"] = 0
    cam.properties["pitch_deg"] = 0
    cam.properties["fov_deg"] = 60

    # fita a 3m na frente (câmera baixa o suficiente para vê-la)
    tape.transform.position = (0, 0.05, 3.0)

    dets = detect_references(cam, world.nodes)
    assert len(dets) == 1
    d = dets[0]
    assert d["type"] == "vision_tape"
    assert 0.0 <= d["bbox"][0] <= 1.0
    assert 0.0 <= d["bbox"][1] <= 1.0
    assert d["distance_m"] == pytest.approx(3.02, abs=0.2)

    # fita ATRÁS da câmera → não detecta
    tape.transform.position = (0, 0.05, -3.0)
    assert detect_references(cam, world.nodes) == []


def test_vision_out_of_fov():
    """Referência fora do campo de vista não é detectada."""
    from app.sim.world import World
    from app.devices.registry import registry
    from app.devices.vision import detect_references

    world = World()
    cam = registry.create("camera_ip")
    marker = registry.create("vision_marker")
    world.add_node(cam)
    world.add_node(marker)

    cam.transform.position = (0, 2.0, 0)
    cam.properties["yaw_deg"] = 0
    cam.properties["pitch_deg"] = 0
    cam.properties["fov_deg"] = 30
    marker.transform.position = (5, 1, 5)  # bem fora do campo
    assert detect_references(cam, world.nodes) == []


# ============================================================
# FLUIDOS
# ============================================================

def test_pump_affinity_laws():
    """Motobomba: Q ∝ ω, H ∝ ω²."""
    from app.devices.fluid import create_pump
    pump = create_pump()
    pump.properties["nominal_rpm"] = 1000
    pump.properties["nominal_flow_m3h"] = 10
    pump.properties["nominal_head_m"] = 20
    pump.on_start()
    pump.write_port("shaft", {"rpm": 500, "torque_nm": 0, "direction": 1})
    pump.update(1 / 60)
    # metade da rotação → metade da vazão, 1/4 da altura
    assert pump.properties["flow_m3h"] == pytest.approx(5.0, abs=0.1)
    assert pump.properties["head_m"] == pytest.approx(5.0, abs=0.1)


def test_vortex_meter_frequency():
    """Medidor vortex: f = St·v/d."""
    from app.devices.fluid import create_vortex_meter
    m = create_vortex_meter()
    m.properties["pipe_diameter_mm"] = 100  # área ≈ 0.00785 m²
    m.properties["strouhal"] = 0.2
    m.on_start()
    # 36 m³/h em duto de 100mm → v ≈ 1.27 m/s → f ≈ 2.55 Hz
    m.write_port("fluid_in", {"flow_m3h": 36})
    m.update(1.0)
    assert m.properties["flow_m3h"] == pytest.approx(36, abs=0.5)
    assert m.properties["vortex_freq_hz"] == pytest.approx(2.55, abs=0.1)
    assert m.properties["total_m3"] > 0


def test_valve_flow_by_opening():
    """Válvula: fechada não passa vazão; 100% passa o disponível."""
    from app.devices.fluid import create_valve
    v = create_valve()
    v.properties["inlet_pressure_bar"] = 4
    v.properties["outlet_pressure_bar"] = 1
    v.properties["cv_full"] = 40
    v.on_start()
    # comanda 0V → fechada
    v.write_port("cmd", 0)
    v.write_port("fluid_in", {"flow_m3h": 100})
    v.update(1 / 60)
    assert v.properties["opening_pct"] == 0
    assert v.properties["flow_m3h"] == pytest.approx(0, abs=0.01)
    # comanda 10V → 100%: cv = 40, ΔP = 3 → Q = 40·1.73 ≈ 69.3
    v.write_port("cmd", 10)
    v.update(1 / 60)
    assert v.properties["opening_pct"] == 100
    assert v.properties["flow_m3h"] == pytest.approx(69.28, abs=0.5)


def test_tank_level_rises_and_caps():
    """Tanque acumula nível e satura na capacidade."""
    from app.devices.fluid import create_tank
    t = create_tank()
    t.properties["capacity_l"] = 10
    t.properties["level_l"] = 0.0
    t.on_start()
    t.write_port("drain_cmd", 0)
    t.write_port("inlet", {"flow_m3h": 360})
    t.update(10)  # 360 m³/h por 10s = 1 m³ = 1000L → satura em 10L
    assert t.properties["level_l"] == 10.0
    assert t.properties["level_pct"] == 100.0


# ============================================================
# REGISTRY
# ============================================================

def test_registry_v3_types():
    """Registry cobre transmissão, visão e fluidos."""
    from app.devices.registry import DeviceRegistry
    reg = DeviceRegistry()
    for t in ["trans_gears", "trans_belt", "trans_chain", "trans_coupling",
              "trans_screw", "trans_linear_actuator",
              "vision_tape", "vision_marker", "vision_target", "vision_corner",
              "camera_ip", "pump_centrifugal", "pump_dosing", "flow_vortex",
              "valve_control", "duct", "flange", "tank"]:
        assert t in reg.factories, f"faltou tipo: {t}"
    assert len(reg.factories) >= 45


def test_duct_scalable():
    """Duto é escalável em segmentos e diâmetro."""
    from app.devices.fluid import create_duct
    d = create_duct()
    d.resize(segments=8, diameter_mm=250)
    assert d.properties["segments"] == 8
    assert d.properties["diameter_mm"] == 250
    d.on_start()
    d.write_port("fluid_in", {"flow_m3h": 20})
    d.update(1 / 60)
    assert d.properties["length_m"] == 8.0
    assert d.properties["flow_m3h"] == pytest.approx(20, abs=0.01)


# ============================================================
# POSICIONAMENTO — slots seguem o dispositivo
# ============================================================

def test_infra_slots_follow_device():
    """Slots de montagem acompanham o transform do dispositivo dono."""
    from app.devices.infrastructure import create_base_plate
    bp = create_base_plate()
    assert len(bp.slots) == 12
    # na origem, slot coincide com o offset local
    s0 = bp.slots[0]
    assert list(s0.position) == list(s0.local_offset)

    bp.place((-5.0, 0.5, -1.0))
    # slot 0 do grid 4x3 spacing 1.0 = (-1.5, 0, -1.0) relativo
    assert bp.slots[0].position == (-6.5, 0.5, -2.0)
    assert bp.slots[-1].position == (-3.5, 0.5, 0.0)


def test_conduit_path_follow_device():
    """Trajeto do eletroduto/calha acompanha o dispositivo."""
    from app.devices.infrastructure import create_cable_tray
    tray = create_cable_tray()
    local_first = list(tray.conduit_path[0])
    tray.place((2.0, 0.3, 4.0))
    assert tray.conduit_path[0] == (
        local_first[0] + 2.0, local_first[1] + 0.3, local_first[2] + 4.0
    )


def test_drivetrain_uses_computed_ratio():
    """Resolver calcula a razão pelos dentes, mesmo sem tick prévio."""
    from app.sim.world import World
    from app.devices.registry import registry
    from app.devices.transmission import ratio_of

    world = World()
    vfd = registry.create("vfd_generic")
    gears = registry.create("trans_gears")
    conv = registry.create("conveyor_belt")
    for d in (vfd, gears, conv):
        world.add_node(d)

    gears.properties["teeth_in"] = 10
    gears.properties["teeth_out"] = 40
    assert ratio_of(gears) == 4.0

    world.link_drivetrain(vfd.id, conv.id, [gears.id])
    vfd.properties["output_rpm"] = 1200
    world.sim_running = True
    world.resolve_drivetrains()

    # 1200 rpm / 4 = 300 no eixo da carga
    assert conv.properties["shaft_rpm"] == pytest.approx(300, abs=1)
    # transmissão marcada como dirigida (behaviour próprio não sobrescreve)
    assert gears.properties.get("_driven") is True
    assert gears.properties["rpm_in"] == pytest.approx(1200, abs=1)
    assert gears.properties["rpm_out"] == pytest.approx(300, abs=1)

    # behaviour da engrenagem consome a flag e mantém os valores do resolver
    gears.update(1 / 60)
    assert gears.properties["rpm_in"] == pytest.approx(1200, abs=1)
    assert gears.properties["_driven"] is False
