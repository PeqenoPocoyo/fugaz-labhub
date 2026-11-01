"""
Testes do Fugaz LABHUB Backend
"""
import pytest
import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.devices.device_model import Device
from app.physics.electrical import ElectricalEngine
from app.physics.pneumatic import PneumaticEngine, HydraulicEngine
from app.physics.mechanical import MechanicalEngine


def test_device_creation():
    """Testa criação de dispositivo."""
    device_def = {
        "id": "test_device",
        "name": "Test Device",
        "category": "sensor",
        "manufacturer": "Test",
        "model": "T1",
        "ports": [{"id": "out", "type": "digital_output", "label": "OUT"}],
        "properties": {"voltage": {"value": 24, "unit": "V"}},
        "factory_defaults": {"voltage": 24},
        "protocols": [],
        "physics": {},
    }
    device = Device(device_def, {})
    assert device.name == "Test Device"
    assert device.category == "sensor"
    assert "out" in device.ports
    assert device.tags["voltage"] == 24


def test_device_reset():
    """Testa reset para valores de fábrica."""
    device_def = {
        "id": "test_device",
        "name": "Test Device",
        "category": "sensor",
        "ports": [],
        "properties": {"voltage": {"value": 24, "unit": "V"}},
        "factory_defaults": {"voltage": 24},
        "protocols": [],
        "physics": {},
    }
    device = Device(device_def, {"properties": {"voltage": 12}})
    assert device.properties["voltage"]["value"] == 12
    device.reset_to_factory()
    assert device.properties["voltage"]["value"] == 24


def test_electrical_ohm():
    """Testa Lei de Ohm."""
    engine = ElectricalEngine()
    assert engine.calculate_current(12, 4) == 3.0
    assert engine.calculate_power(12, 3) == 36.0
    assert engine.calculate_resistance_series([100, 200, 300]) == 600
    r_parallel = engine.calculate_resistance_parallel([100, 100])
    assert abs(r_parallel - 50.0) < 0.01


def test_electrical_rc_transient():
    """Testa transitório RC."""
    engine = ElectricalEngine()
    v = engine.rc_transient(1000, 0.001, 10, 0.005)
    assert 0 < v < 10


def test_pneumatic_force():
    """Testa cálculo de força pneumática."""
    engine = PneumaticEngine()
    force = engine.calculate_force(600000, 0.0019635)  # 6 bar, área em m²
    assert force > 0


def test_pneumatic_boyle():
    """Testa Lei de Boyle-Mariotte."""
    engine = PneumaticEngine()
    p2 = engine.calculate_pressure_volume(100000, 0.1, 0.05)
    assert abs(p2 - 200000) < 1


def test_hydraulic_bernoulli():
    """Testa equação de Bernoulli."""
    engine = HydraulicEngine()
    p2 = engine.bernoulli(100000, 2, 1, 3, 0.5)
    assert p2 > 0


def test_mechanical_collision():
    """Testa detecção de colisão."""
    engine = MechanicalEngine()
    engine.add_body("box1", {
        "position": [0, 1, 0],
        "dimensions": [1, 1, 1],
        "mass": 1,
    })
    engine.add_body("box2", {
        "position": [0.5, 1, 0],
        "dimensions": [1, 1, 1],
        "mass": 1,
    })
    engine._detect_collisions()
    assert len(engine.collisions) > 0


def test_mechanical_stacking():
    """Testa empilhamento."""
    engine = MechanicalEngine()
    engine.add_body("pallet", {
        "position": [0, 0, 0],
        "dimensions": [1, 0.15, 1.2],
        "mass": 15,
        "is_static": True,
    })
    engine.add_body("box", {
        "position": [0, 1, 0],
        "dimensions": [0.4, 0.3, 0.2],
        "mass": 5,
    })
    engine.update(0.01)
    box = engine.bodies["box"]
    assert box["position"][1] < 1  # Deve ter caído


def test_circuit_analyzer_series():
    """Testa análise de circuito em série."""
    from app.physics.circuit_analysis import CircuitAnalyzer
    analyzer = CircuitAnalyzer()
    analyzer.add_voltage_source("V1", "n1", "gnd", 12)
    analyzer.add_resistor("R1", "n1", "n2", 1000)
    analyzer.add_resistor("R2", "n2", "gnd", 2000)
    analyzer.set_ground("gnd")
    results = analyzer.analyze()
    assert results["num_nodes"] == 3
    assert results["num_components"] == 3
    assert results["total_power"] > 0


def test_circuit_analyzer_parallel():
    """Testa análise de circuito em paralelo."""
    from app.physics.circuit_analysis import CircuitAnalyzer
    analyzer = CircuitAnalyzer()
    analyzer.add_voltage_source("V1", "n1", "gnd", 12)
    analyzer.add_resistor("R1", "n1", "gnd", 1000)
    analyzer.add_resistor("R2", "n1", "gnd", 2000)
    analyzer.set_ground("gnd")
    results = analyzer.analyze()
    assert results["num_components"] == 3
    # Tensão em n1 deve ser ~12V
    assert abs(results["voltages"]["n1"] - 12) < 0.1


def test_circuit_safety():
    """Testa verificação de segurança."""
    from app.physics.circuit_analysis import CircuitAnalyzer
    analyzer = CircuitAnalyzer()
    analyzer.add_voltage_source("V1", "n1", "gnd", 12)
    analyzer.add_resistor("R1", "n1", "gnd", 10)  # Resistor de baixa resistência
    analyzer.set_ground("gnd")
    analyzer.analyze()
    warnings = analyzer.check_safety()
    assert len(warnings) > 0


def test_fluid_network_air():
    """Testa rede pneumática."""
    from app.physics.fluid_simulation import FluidNetwork
    net = FluidNetwork("air")
    net.add_node("n1", 600000)  # 6 bar
    net.add_node("n2", 0)
    net.add_component("valve", {"cv": 1.0}, "n1", "n2")
    assert net.fluid_type == "air"
    assert len(net.nodes) == 2
    assert len(net.components) == 1


def test_fluid_pressure_drop():
    """Testa queda de pressão em tubo."""
    from app.physics.fluid_simulation import FluidNetwork
    net = FluidNetwork("water")
    dp = net.calculate_pressure_drop_pipe(10, 0.025, 0.001)
    assert dp > 0


def test_fluid_cylinder_force():
    """Testa força de cilindro."""
    from app.physics.fluid_simulation import FluidNetwork
    net = FluidNetwork("hydraulic")
    f_cap, f_rod = net.calculate_cylinder_force(2000000, 0.05, 0.025)
    assert f_cap > 0
    assert f_rod > 0
    assert f_cap > f_rod


def test_nodal_analysis_voltage_divider():
    """Testa divisor de tensão."""
    from app.physics.nodal_analysis import NodalAnalysis
    na = NodalAnalysis()
    na.add_voltage_source("n1", "gnd", 12)
    na.add_resistor("n1", "n2", 1000)
    na.add_resistor("n2", "gnd", 1000)
    na.set_ground("gnd")
    voltages = na.solve()
    # Tensão em n2 deve ser ~6V (divisor de tensão)
    assert abs(voltages["n2"] - 6.0) < 0.1


def test_signal_adc():
    """Testa conversão ADC."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor()
    val = sp.adc_convert(1.65, bits=12, v_ref=3.3)
    assert val == 2047 or val == 2048


def test_signal_dac():
    """Testa conversão DAC."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor()
    val = sp.dac_convert(2048, bits=12, v_ref=3.3)
    assert abs(val - 1.65) < 0.01


def test_signal_scale():
    """Testa escala de sinal."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor()
    val = sp.scale_signal(5, 0, 10, 0, 100)
    assert val == 50.0


def test_signal_clamp():
    """Testa clamp de sinal."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor()
    assert sp.clamp(15, 0, 10) == 10
    assert sp.clamp(-5, 0, 10) == 0
    assert sp.clamp(5, 0, 10) == 5


def test_signal_moving_average():
    """Testa média móvel."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor()
    result = sp.moving_average([1, 2, 3, 4, 5], window=3)
    assert len(result) == 5
    assert result[-1] == 4.0


def test_signal_pwm():
    """Testa geração de PWM."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor(sample_rate=1000)
    pwm = sp.pwm_generate(0.5, 100, 0.01)
    assert len(pwm) == 10
    assert all(v in [0.0, 1.0] for v in pwm)


def test_signal_pid():
    """Testa controlador PID."""
    from app.physics.signal_processing import SignalProcessor
    sp = SignalProcessor()
    output, error, integral = sp.pid_controller(10, 8, 1, 0.1, 0.01, 0, 0, 0.1)
    assert error == 2
    assert output > 0


def test_electrical_safety_cb():
    """Testa disjuntor."""
    from app.physics.electrical_safety import ElectricalSafety
    safety = ElectricalSafety()
    safety.add_circuit_breaker("cb1", 10, "C", 3)
    result = safety.check_overcurrent("cb1", 5)
    assert not result["tripped"]
    result = safety.check_overcurrent("cb1", 150)
    assert result["tripped"]


def test_electrical_safety_fuse():
    """Testa fusível."""
    from app.physics.electrical_safety import ElectricalSafety
    safety = ElectricalSafety()
    safety.add_fuse("fuse1", 5)
    result = safety.check_overcurrent("fuse1", 10)
    assert result["tripped"]


def test_electrical_safety_ground_fault():
    """Testa falha de aterramento."""
    from app.physics.electrical_safety import ElectricalSafety
    safety = ElectricalSafety()
    result = safety.check_ground_fault(0.05)
    assert result["fault"]
    result = safety.check_ground_fault(0.01)
    assert not result["fault"]


def test_electrical_safety_reset():
    """Testa reset de protetor."""
    from app.physics.electrical_safety import ElectricalSafety
    safety = ElectricalSafety()
    safety.add_circuit_breaker("cb1", 10)
    safety.check_overcurrent("cb1", 150)
    assert safety.protectors["cb1"]["tripped"]
    safety.reset_protector("cb1")
    assert not safety.protectors["cb1"]["tripped"]


def test_vibration_rms():
    """Testa RMS de vibração."""
    from app.physics.vibration import VibrationAnalyzer
    va = VibrationAnalyzer()
    signal = [1.0, 2.0, 3.0, 4.0, 5.0]
    rms = va.compute_rms(signal)
    assert rms > 0


def test_vibration_peak():
    """Testa pico de vibração."""
    from app.physics.vibration import VibrationAnalyzer
    va = VibrationAnalyzer()
    signal = [1.0, 5.0, 2.0, 3.0]
    peak = va.compute_peak(signal)
    assert peak == 5.0


def test_vibration_crest_factor():
    """Testa fator de crista."""
    from app.physics.vibration import VibrationAnalyzer
    va = VibrationAnalyzer()
    signal = [1.0, 2.0, 3.0, 4.0, 5.0]
    cf = va.compute_crest_factor(signal)
    assert cf > 0


def test_vibration_fft():
    """Testa FFT de vibração."""
    from app.physics.vibration import VibrationAnalyzer
    va = VibrationAnalyzer(sample_rate=1000)
    signal = [np.sin(2 * np.pi * 50 * t / 1000) for t in range(1000)]
    freqs, mags = va.compute_fft(signal)
    assert len(freqs) > 0
    assert len(mags) > 0
    # Pico deve estar em ~50Hz
    peak_idx = np.argmax(mags)
    assert abs(freqs[peak_idx] - 50) < 5


def test_vibration_bearing_fault():
    """Testa detecção de falha em rolamento."""
    from app.physics.vibration import VibrationAnalyzer
    va = VibrationAnalyzer(sample_rate=10000)
    # Sinal com componente em frequência de falha
    signal = [0.1 * np.sin(2 * np.pi * 100 * t / 10000) for t in range(10000)]
    result = va.detect_bearing_fault(signal, 100)
    assert "severity" in result
    assert "fault_ratio" in result


def test_thermal_steady_state():
    """Testa temperatura em regime permanente."""
    from app.physics.thermal import ThermalAnalyzer
    ta = ThermalAnalyzer()
    ta.add_component("resistor", 2.0, 50.0)
    temp = ta.calculate_steady_state("resistor")
    assert temp == 25.0 + 2.0 * 50.0


def test_thermal_transient():
    """Testa temperatura transiente."""
    from app.physics.thermal import ThermalAnalyzer
    ta = ThermalAnalyzer()
    ta.add_component("resistor", 2.0, 50.0, mass=0.01, specific_heat=900)
    temp = ta.calculate_transient("resistor", 0.1)
    assert temp > 25.0


def test_thermal_overtemp():
    """Testa verificação de superaquecimento."""
    from app.physics.thermal import ThermalAnalyzer
    ta = ThermalAnalyzer()
    ta.add_component("resistor", 10.0, 10.0)
    ta.calculate_steady_state("resistor")
    result = ta.check_overtemp("resistor")
    assert "overtemp" in result
    assert "severity" in result


def test_thermal_heat_sink():
    """Testa cálculo de dissipador."""
    from app.physics.thermal import ThermalAnalyzer
    ta = ThermalAnalyzer()
    result = ta.calculate_heat_sink(5.0, 85.0, 25.0, 2.0)
    assert "heat_sink_r_th" in result
    assert result["heat_sink_r_th"] > 0


def test_oil_viscosity_index():
    """Testa índice de viscosidade."""
    from app.physics.oil_analysis import OilAnalyzer
    oa = OilAnalyzer()
    vi = oa.calculate_viscosity_index(100, 15)
    assert 0 <= vi <= 200


def test_oil_degradation():
    """Testa degradação do óleo."""
    from app.physics.oil_analysis import OilAnalyzer
    oa = OilAnalyzer()
    deg = oa.calculate_degradation(5, 10)
    assert deg == 50.0


def test_oil_contamination():
    """Testa contaminação do óleo."""
    from app.physics.oil_analysis import OilAnalyzer
    oa = OilAnalyzer()
    result = oa.check_contamination(200, 0.02, 1.0)
    assert not result["contaminated"]
    result = oa.check_contamination(2000, 0.2, 10.0)
    assert result["contaminated"]


def test_oil_remaining_life():
    """Testa vida útil restante."""
    from app.physics.oil_analysis import OilAnalyzer
    oa = OilAnalyzer()
    result = oa.estimate_remaining_life(8, 10, 1000)
    assert "remaining_percent" in result
    assert "status" in result


def test_gas_partial_pressure():
    """Testa pressão parcial."""
    from app.physics.gas_analysis import GasAnalyzer
    ga = GasAnalyzer()
    pp = ga.calculate_partial_pressure(101325, 0.21)
    assert abs(pp - 21278) < 100


def test_gas_density():
    """Testa densidade do gás."""
    from app.physics.gas_analysis import GasAnalyzer
    ga = GasAnalyzer()
    rho = ga.calculate_density(101325, 293.15, 0.02897)
    assert abs(rho - 1.205) < 0.1


def test_gas_dew_point():
    """Testa ponto de orvalho."""
    from app.physics.gas_analysis import GasAnalyzer
    ga = GasAnalyzer()
    dp = ga.calculate_dew_point(25, 50)
    assert dp < 25


def test_gas_purity():
    """Testa pureza do gás."""
    from app.physics.gas_analysis import GasAnalyzer
    ga = GasAnalyzer()
    result = ga.check_purity({"N2": 99.5, "O2": 0.3, "Ar": 0.2}, 99.0)
    assert result["meets_requirement"]
    assert result["main_component"] == "N2"


def test_gas_compression():
    """Testa razão de compressão."""
    from app.physics.gas_analysis import GasAnalyzer
    ga = GasAnalyzer()
    ratio = ga.calculate_compression_ratio(100000, 800000)
    assert ratio == 8.0


def test_material_library():
    """Testa biblioteca de materiais."""
    from app.physics.mass_physics import MaterialLibrary
    steel = MaterialLibrary.get("steel")
    assert steel is not None
    assert steel.name == "Aço"
    assert steel.category == "solid"
    assert steel.density == 7850

    water = MaterialLibrary.get("water")
    assert water is not None
    assert water.category == "liquid"

    air = MaterialLibrary.get("air")
    assert air is not None
    assert air.category == "gas"

    # Material inexistente
    assert MaterialLibrary.get("nonexistent") is None


def test_material_list():
    """Testa listagem de materiais."""
    from app.physics.mass_physics import MaterialLibrary
    all_mats = MaterialLibrary.list_all()
    assert len(all_mats) > 0
    assert all_mats[0]["id"] in MaterialLibrary.MATERIALS

    solids = MaterialLibrary.list_by_category("solid")
    assert len(solids) > 0
    assert all(m["category"] == "solid" for m in solids)


def test_mass_object_creation():
    """Testa criação de objeto de massa."""
    from app.physics.mass_physics import MassObject
    obj = MassObject("box1", "steel", position=[0, 1, 0], scale=[1, 1, 1])
    assert obj.object_id == "box1"
    assert obj.material.name == "Aço"
    assert obj.mass > 0
    assert obj.position[1] == 1.0


def test_mass_object_gravity():
    """Testa gravidade em objeto de massa."""
    from app.physics.mass_physics import MassObject
    obj = MassObject("box1", "steel", position=[0, 10, 0], scale=[1, 1, 1])
    obj.update(1.0)  # 1 segundo
    assert obj.position[1] < 10.0  # Deve cair
    assert obj.velocity[1] < 0  # Velocidade para baixo


def test_mass_object_restitution():
    """Testa restituição (quique) em objeto de massa."""
    from app.physics.mass_physics import MassObject
    obj = MassObject("ball1", "rubber", position=[0, 5, 0], scale=[0.5, 0.5, 0.5])
    obj.update(1.0)
    # Deve ter atingido o chão e quicado
    assert obj.position[1] >= 0


def test_mass_physics_engine():
    """Testa motor de física de massas."""
    from app.physics.mass_physics import MassPhysicsEngine, MassObject
    engine = MassPhysicsEngine()
    engine.add_object(MassObject("box1", "steel", position=[0, 1, 0], scale=[1, 1, 1]))
    engine.add_object(MassObject("box2", "wood", position=[0, 2, 0], scale=[1, 1, 1]))
    assert len(engine.objects) == 2
    engine.update(0.1)
    assert len(engine.get_all_states()) == 2


def test_mass_object_stacking():
    """Testa empilhamento de objetos de massa."""
    from app.physics.mass_physics import MassPhysicsEngine, MassObject
    engine = MassPhysicsEngine()
    # Objeto estático no chão (chão = y=0)
    engine.add_object(MassObject("floor", "rubber", position=[0, 0, 0], scale=[2, 0.1, 2], is_static=True))
    # Objeto caindo sobre o chão
    engine.add_object(MassObject("box1", "steel", position=[0, 1, 0], scale=[0.5, 0.5, 0.5]))
    # Múltiplos passos para simular queda
    for _ in range(200):
        engine.update(0.01)
    box = engine.objects["box1"]
    # Deve ter atingido o chão e parado (ou quase parado)
    assert box.position[1] >= 0
    assert box.position[1] < 0.6  # Caiu perto do chão
    assert abs(box.velocity[1]) < 0.1  # Velocidade próxima de zero
    assert box.is_grounded


def test_mass_object_weight():
    """Testa cálculo de peso."""
    from app.physics.mass_physics import MassObject
    obj = MassObject("box1", "steel", scale=[2, 2, 2])
    weight = obj.get_weight()
    assert weight > 0
    assert weight == obj.mass * 9.81


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
