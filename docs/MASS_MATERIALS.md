# Massas e Materiais — Fugaz LABHUB

> Sistema completo de física de massas (sólidos, líquidos, gases) com biblioteca de materiais pre-configurados.

---

## 📦 Biblioteca de Materiais

A biblioteca contém materiais pre-configurados divididos em 3 categorias:

### Sólidos (7 materiais)
| Material | Densidade (kg/m³) | Massa padrão (kg) | Atrito | Restituição | Cor |
|----------|------------------|-------------------|--------|-------------|-----|
| Aço | 7850 | 10 | 0.6 | 0.3 | #7F8C8D |
| Alumínio | 2700 | 5 | 0.4 | 0.5 | #95A5A6 |
| Plástico | 950 | 2 | 0.3 | 0.7 | #3498DB |
| Madeira | 600 | 3 | 0.5 | 0.2 | #8B4513 |
| Concreto | 2400 | 15 | 0.7 | 0.1 | #95A5A6 |
| Borracha | 1100 | 1 | 0.9 | 0.8 | #2C3E50 |
| Vidro | 2500 | 4 | 0.3 | 0.4 | #BDC3C7 |
| Cobre | 8960 | 8 | 0.5 | 0.2 | #B87333 |

### Líquidos (4 materiais)
| Material | Densidade (kg/m³) | Massa (kg) | Viscosidade (Pa·s) | Compressibilidade | Cor |
|----------|------------------|------------|-------------------|-------------------|-----|
| Água | 1000 | 1.0 | 0.001 | 4.6e-10 | #3498DB |
| Óleo | 900 | 0.9 | 0.1 | 8.0e-10 | #8B4513 |
| Mel | 1400 | 1.4 | 10.0 | 2.0e-10 | #D35400 |
| Mercúrio | 13600 | 13.6 | 0.0015 | 3.7e-10 | #7F8C8D |

### Gases (4 materiais)
| Material | Densidade (kg/m³) | Massa (kg) | Viscosidade (Pa·s) | Compressibilidade | Cor |
|----------|------------------|------------|-------------------|-------------------|-----|
| Ar | 1.225 | 0.0012 | 1.8e-5 | 9.9e-6 | #ECF0F1 |
| Nitrogênio | 1.16 | 0.0011 | 1.7e-5 | 9.9e-6 | #D5DBDB |
| Oxigênio | 1.33 | 0.0013 | 2.0e-5 | 9.9e-6 | #AAB7B8 |
| CO2 | 1.84 | 0.0018 | 1.5e-5 | 9.9e-6 | #95A5A6 |

---

## 🔧 API de Massas

### Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/materials` | GET | Lista todos os materiais |
| `/api/materials?category=solid` | GET | Filtrar por categoria |
| `/api/materials/{id}` | GET | Detalhes de um material |
| `/api/materials/categories` | GET | Listar categorias |
| `/api/mass-objects` | GET | Lista objetos de massa |
| `/api/mass-objects` | POST | Criar objeto de massa |
| `/api/mass-objects/{id}` | GET | Detalhes de um objeto |
| `/api/mass-objects/{id}` | DELETE | Remover objeto |
| `/api/mass-objects/simulate` | POST | Executar passo de simulação |
| `/api/mass-objects/stats` | GET | Estatísticas do motor |

### Exemplo: Criar objeto de massa
```json
POST /api/mass-objects
{
  "object_id": "box1",
  "material_id": "steel",
  "position": [0, 1, 0],
  "velocity": [0, 0, 0],
  "scale": [1, 1, 1]
}
```

### Exemplo: Simular física
```json
POST /api/mass-objects/simulate?dt=0.01
```

---

## 🎮 Frontend — Componente MaterialSelector

O frontend inclui um pop-up para seleção de materiais:

- **Busca**: Filtrar materiais por nome
- **Categorias**: Sólidos, Líquidos, Gases
- **Visualização**: Cor, densidade, massa de cada material
- **Seleção**: Clique para aplicar material a um objeto na cena

### Como usar
1. Clique em "Adicionar Massa" no header
2. Escolha um material no pop-up
3. O objeto é adicionado à cena 3D com as propriedades do material
4. O menu de abas dinâmicas atualiza com base no tipo selecionado

---

## ⚙️ Motor de Física de Massas

### Características
- **Gravidade**: 9.81 m/s² em todos os objetos
- **Detecção de colisão**: AABB (Axis-Aligned Bounding Box)
- **Empilhamento**: Objetos sólidos se empilham automaticamente
- **Atrito**: Reduz velocidade horizontal em superfícies
- **Restituição**: Coeficiente de quique por material
- **Viscosidade**: Arrasto para líquidos e gases

### Classes Principais

| Classe | Responsabilidade |
|--------|-----------------|
| `MaterialProperties` | Propriedades físicas de um material |
| `MaterialLibrary` | Biblioteca estática de materiais |
| `MassObject` | Objeto individual de massa na simulação |
| `MassPhysicsEngine` | Motor que atualiza física de todos os objetos |

---

## 🧪 Testes

53 testes passando, incluindo:

| Teste | Descrição |
|-------|-----------|
| `test_material_library` | Biblioteca retorna materiais corretos |
| `test_material_list` | Listagem e filtro por categoria |
| `test_mass_object_creation` | Criação de objeto de massa |
| `test_mass_object_gravity` | Gravidade afeta posição |
| `test_mass_object_restitution` | Quique no chão |
| `test_mass_physics_engine` | Motor de física funciona |
| `test_mass_object_stacking` | Objeto para no chão |
| `test_mass_object_weight` | Cálculo de peso (P = m·g) |

---

## 🚀 Próximos Passos

1. Conectar frontend com backend via API de materiais
2. Implementar empilhamento entre múltiplos objetos
3. Adicionar física de fluidos (líquidos fluindo)
4. Adicionar física de gases (pressão, expansão)
5. Integrar com CLPs (sensores de massa, peso, nível)

---

*Última atualização: 28/10/2026*