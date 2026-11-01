"""
Auditoria do catálogo — revisão sistemática de todos os tipos de dispositivo.

Para cada tipo, verifica: categoria, nº de portas, presença de âncoras 3D,
pontos de fixação, comportamento (behaviour) e lacunas de modelagem.
Saída em markdown para docs/COMPONENT_AUDIT.md (a base para modelar todos).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# receitas de modelo já existentes no frontend (pipeline A) — espelha
# o catálogo de frontend/src/components/scene/recipes.ts
RECEITAS_FRONTEND = {
    # motores
    "motor_dc", "motor_ac", "motor_stepper", "motor_servo",
    # sensores
    "sensor_photoelectric", "sensor_photoelectric_receptor", "sensor_inductive",
    "sensor_limit_switch", "sensor_temperature", "sensor_pressure", "sensor_encoder",
    # pneumáticos
    "cylinder_pneumatic", "valve_pneumatic_5_2",
    # câmera
    "camera_ip",
    # painel
    "clp_generic", "vfd_generic",
    # infraestrutura
    "infra_base_plate", "infra_din_rail", "infra_i_beam", "infra_pillar",
    "infra_profile_alu",
    # lote 3
    "sensor_capacitive", "sensor_emergency_button", "sensor_level",
    "sensor_load_cell", "cylinder_hydraulic", "actuator_linear",
    "pump_dosing", "soft_starter", "flange",
}

CAT_LABEL = {
    "plc": "CLPs", "sensor": "Sensores", "actuator": "Atuadores", "drive": "Drives",
    "transmission": "Transmissões", "vision": "Visão", "structure": "Infraestrutura",
    "mass": "Massas", "power": "Energia", "hmi": "IHM",
}


def main():
    from app.devices.registry import registry

    linhas = []
    linhas.append("# Auditoria do catálogo de componentes\n")
    linhas.append("> Gerado por `tests/audit_catalog.py` — base para modelar todos os componentes.\n")

    totais = {"tipos": 0, "comReceita": 0, "semPorta": 0, "semFixacao": 0, "semComportamento": 0}

    for cat in ["plc", "sensor", "actuator", "drive", "transmission", "vision",
                "structure", "mass", "power", "hmi"]:
        tipos = registry.list_types(cat)
        if not tipos:
            continue
        linhas.append(f"\n## {CAT_LABEL.get(cat, cat)} ({len(tipos)})\n")
        linhas.append("| Tipo | Nome | Portas | Âncoras | Fixação | Comportamento | Modelo |")
        linhas.append("|---|---|---|---|---|---|---|")

        for t in tipos:
            tid = t["type_id"]
            dev = registry.create(tid)
            if dev is None:
                continue
            totais["tipos"] += 1
            d = dev.to_dict()
            nportas = len(dev.ports)
            nanchor = len(d.get("port_anchors") or {})
            nfix = len(dev.fixations)
            nbeh = len([b for b in dev.behaviours if b.trigger.value == "on_tick"])
            temReceita = tid in RECEITAS_FRONTEND
            if temReceita:
                totais["comReceita"] += 1
            if nportas == 0:
                totais["semPorta"] += 1
            if nfix == 0 and cat not in ("structure", "vision"):
                totais["semFixacao"] += 1
            if nbeh == 0:
                totais["semComportamento"] += 1

            modelo = "✅ receita" if temReceita else ("— passivo" if nportas == 0 and nbeh == 0 else "❌ bloco")
            fix = "✅" if nfix else ("—" if cat in ("structure", "vision") else "❌")
            linhas.append(
                f"| `{tid}` | {t['name']} | {nportas} | {nanchor} | {fix} | {nbeh} | {modelo} |"
            )

    linhas.append("\n## Resumo\n")
    linhas.append(f"- **Tipos no catálogo:** {totais['tipos']}")
    linhas.append(f"- **Com modelo (receita):** {totais['comReceita']}")
    linhas.append(f"- **Sem portas (passivos):** {totais['semPorta']}")
    linhas.append(f"- **Sem ponto de fixação (não-infra):** {totais['semFixacao']}")
    linhas.append(f"- **Sem comportamento por tick:** {totais['semComportamento']}")

    saida = os.path.join(os.path.dirname(__file__), "..", "docs", "COMPONENT_AUDIT.md")
    with open(saida, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas) + "\n")
    print(f"auditoria escrita em {saida}")
    print(f"tipos={totais['tipos']} comReceita={totais['comReceita']} "
          f"semPorta={totais['semPorta']} semFixacao={totais['semFixacao']} "
          f"semComportamento={totais['semComportamento']}")


if __name__ == "__main__":
    main()
