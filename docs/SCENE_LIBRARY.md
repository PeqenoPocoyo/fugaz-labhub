# Biblioteca de Construção de Cena — Fugaz LABHUB

> Biblioteca segregada para montagem de cenas 3D industriais.
> Não será compilada tão cedo — planejamento e documentação primeiro.

---

## 🏗️ Visão Geral

A Biblioteca de Construção de Cena é o conjunto de elementos que permitem montar a infraestrutura física da simulação. Diferente dos dispositivos (CLPs, sensores, motores), estes elementos são **estruturais e de suporte**.

## 📂 Estrutura da Biblioteca

```
scene-library/
├── estrutura/          # Elementos de suporte e layout
│   ├── bases/          # Bases de fixação
│   ├── vigas/          # Vigas estruturais
│   ├── pilares/        # Pilares de sustentação
│   ├── plataformas/    # Plataformas e passarelas
│   ├── grades/         # Grades de proteção
│   └── cases/          # Cases de motores (auto-ajustáveis)
├── fixacao/            # Elementos de fixação
│   ├── parafusos/      # Parafusos e buchas
│   ├── buchas/         # Buchas de fixação
│   ├── abraçadeiras/   # Abraçadeiras de cabo
│   └── magnetico/      # Efeito magnético (on/off)
├── transmissao/        # Elementos de transmissão de movimento
│   ├── engrenagens/    # Engrenagens de diversos tipos
│   ├── correias/       # Correias e polias
│   ├── correntes/      # Correntes e pinhões
│   ├── acoplamentos/   # Acoplamentos de eixo
│   └── rolamentos/     # Rolamentos
└── componentes/        # Componentes mistos
    ├── esteiras/       # Esteiras escaláveis
    ├── recipientes/    # Reservatórios e tubulações
    └── bicos/          # Bicos e válvulas
```

---

## 1. ESTRUTURA — Elementos de Suporte e Layout

### 1.1 Bases de Fixação
- Base plana simples
- Base com furos para parafusos
- Base com ranhuras para eixos
- Base para motor (com plug para cabos)

### 1.2 Vigas Estruturais
- Viga I (I-beam)
- Viga retangular
- Viga em U
- Viga em L

### 1.3 Pilares de Sustentação
- Pilar simples
- Pilar com base
- Pilar com top
- Pilar ajustável em altura

### 1.4 Plataformas e Passarelas
- Plataforma retangular
- Passarela com grade
- Escada de acesso
- Guarda-corpo

### 1.5 Grades de Proteção
- Grade retangular
- Grade circular
- Grade de máquina

### 1.6 Cases de Motores (Auto-ajustáveis)
- Case pequeno (até 50mm)
- Case médio (50-150mm)
- Case grande (150-300mm)
- Case com plug para cabos em posições configuráveis

---

## 2. FIXAÇÃO — Elementos de Fixação

### 2.1 Parafusos e Buchas
- Parafuso sextavado
- Parafuso allen
- Bucha de expansão
- Porca e arruela

### 2.2 Abraçadeiras de Cabo
- Abraçadeira plástica
- Abraçadeira metálica
- Abraçadeira com parafuso

### 2.3 Efeito Magnético (Alternável On/Off)
- Fixação magnética em elementos de aço
- Ativa/desativa via UI
- Força de atração configurável

---

## 3. TRANSMISSÃO — Elementos de Transmissão de Movimento

### 3.1 Engrenagens
- Engrenagem dente reto
- Engrenagem dente helicoidal
- Cremalheira
- Engrenagem cônica

### 3.2 Correias e Polias
- Correia dentada
- Correia V
- Polia simples
- Polia com ranhura

### 3.3 Correntes e Pinhões
- Corrente de rolos
- Pinhão simples
- Pinhão duplo

### 3.4 Acoplamentos de Eixo
- Acoplamento rígido
- Acoplamento flexível
- Acoplamento deOldham

### 3.5 Rolamentos
- Rolamento de esferas
- Rolamento de rolos
- Rolamento de agulha

---

## 🎯 Próximos Passos (quando voltar com as imagens)

1. Receber imagens da indústria
2. Identificar elementos estruturais/layout nas imagens
3. Listar cada elemento com: nome, categoria, dimensões, propriedades
4. Criar modelos 3D parametrizados para cada elemento
5. Implementar efeito magnético para fixação
6. Implementar auto-ajuste de cases de motores

---

## 📐 Princípios de Design

- **3D puro** (não 2.5D) — cena completa em três dimensões
- **Modelos detalhados** — não quadrados genéricos
- **Eixos alinhados** — motor + esteira com eixo perfeitamente alinhado
- **Cases auto-ajustáveis** — conforme tamanho do modelo do motor
- **Plugs para cabos** — em posições específicas de cada modelo
- **Efeito magnético** — alternável entre on/off
- **Otimizado para hardware modesto** (Galaxy Book Go, 4GB RAM, Snapdragon 7c Gen 2)
- **Física simplificada** — tipo Minecraft, mas não quadrada

---

*Última atualização: 28/10/2026*