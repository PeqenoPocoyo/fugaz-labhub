# FUGAZ LABHUB — Visão de UX (Experiência Fora da Curva)

> "Não é um software. É uma bancada de oficina viva onde a máquina respira."

---

## 1. FILOSOFIA: A Bancada Viva (The Living Bench)

O erro comum de IA: fazer um "dashboard" com painéis retangulares, azul/branco, cards genéricos.
**Nossa abordagem:** o usuário não está "usando um app" — está **montando uma máquina numa bancada de oficina**.

### Metáforas centrais
| Metáfora | Significado |
|----------|-------------|
| **Bancada (Bench)** | A cena 3D é uma bancada física. Você monta nela. |
| **Gavetas (Drawers)** | Painéis laterais são gavetas que deslizam, não "sidebars". |
| **Fios vivos** | Conexões são cabos físicos que pulsam quando o sinal flui. |
| **Ímã** | Dispositivos "saltam" para nós de fixação com snap magnético. |
| **Raio-X** | Slider fatia a cena em camadas (infra, elétrica, lógica, dados). |
| **Osciloscópio** | Console inferior mostra sinais em tempo real + logs + warns. |

---

## 2. ANTI-PADRÕES (o que NÃO fazer)

- ❌ Cards brancos com sombra suave
- ❌ Azul corporativo + cinza
- ❌ Sidebar > Conteúdo > Sidebar simétrico
- ❌ Botões retangulares genéricos
- ❌ "Empty state" com ilustração triste
- ❌ Toast de canto genérico
- ❌ Modal central quadrado

---

## 3. IDENTIDADE VISUAL (paleta industrial)

Não é "tema escuro". É **grafite de oficina + sinalização industrial**:

```
Fundo:        #0B0E13  (grafite fosco)
Superfície:   #141922  (aço escovado)
Borda:        #232C38  (reborda metalizada)
Texto:        #D7DEE8  (alumínio)
Texto dim:    #6B7787  (aço envelhecido)

Sinalização (industrial safety colors):
  Elétrica:   #FFB300  (âmbar - "energia")
  Pneumática: #29B6F6  (azul claro)
  Hidráulica: #26C6DA  (ciano)
  Dados:      #AB47BC  (violeta)
  Digital:    #66BB6A  (verde - "ligado")
  Analógico:  #FFA726  (laranja)
  Erro:       #EF5350  (vermelho - perigo)
  Warn:       #FFCA28  (amarelo - atenção)
  Sucesso:    #26A69A  (verde-água)
  Foco:       #00E5FF  (ciano elétrico - "selecionado")
```

---

## 4. COMPONENTES ASSINATURA (Signature Components)

### 4.1 Fio Vivo (Live Wire)
Conexão entre portas renderizada como cabo 3D:
- Cor por domínio (elétrica=âmbar, pneumática=azul, etc.)
- **Pulsa** quando sinal flui (animação de corrente)
- Espessura proporcional à "bitola" (resistência/vazão)
- Ao passar mouse: mostra tooltip com propriedades da conexão
- Ao clicar: seleciona e permite desconectar

### 4.2 Snap Magnético (Magnetic Snap)
Ao arrastar dispositivo próximo a um nó de fixação:
- Dispositivo "inclina" em direção ao nó (efeito imã)
- Círculo de alinhamento brilha (verde = alinhado)
- "Tick" sonoro/visual ao encaixar
- Mostra coordenadas de encaixe em tempo real

### 4.3 Raio-X de Camadas (Layer X-Ray)
Slider vertical no canto direito que "fatia" a cena:
- Topo = infraestrutura (vigas, bases)
- Meio = dispositivos + conexões
- Base = dados/sinais (tags, valores flutuando)
- Arrastar o slider "dissolve" camadas com opacidade animada
- Como um CT scan da máquina

### 4.4 Console de Diagnóstico (Scope Console)
Barra inferior expansível (tipo osciloscópio):
- **Aba Sinais**: forma de onda dos valores analógicos em tempo real
- **Aba Log**: stream de eventos com severidade (INFO/WARN/ERROR/DEBUG)
- **Aba Protocolos**: tabela de tags ModBus/OPC UA com valores updating
- **Aba Física**: leituras de temperatura, pressão, corrente
- Filtros por severidade, busca, pause, clear

### 4.5 Cartão de Dispositivo (Device Card)
Quando seleciona um dispositivo, abre um "cartão físico":
- Não é modal quadrado — é painel que "desencaixa" da direita
- Portas desenhadas como conectores físicos (cores, formato)
- Cada porta clicável → mostra valor ao vivo
- Propriedades como "etiquetas de especificação" (tipo placa de motor)

### 4.6 Modo Comissionamento (Commissioning Mode)
Toggle que transforma a UI em modo técnico:
- Mostra endereços ModBus em cada porta
- Tags OPC UA flutuando sobre dispositivos
- Grid com coordenadas técnicas
- Cores dessaturadas (foco em dados, não estética)

---

## 5. MICRO-INTERAÇÕES (o detalhe que equipes boas pensam)

1. **Hover em porta**: conector "levanta" 2px + brilho
2. **Arrastar dispositivo**: sombra projetada no chão (contato)
3. **Conectar portas**: cabo "viaja" da origem ao destino antes de fixar
4. **Sinal muda**: fio emite pulso luminoso que percorre o cabo
5. **Erro**: borda do componente fica vermelha + ícone pisca + log no console
6. **Warn**: borda âmbar + tooltip persiste até resolver
7. **Simulação rodando**: indicador sutil de "respiração" nos componentes ativos
8. **Zoom na cena**: transição suave com easing (não salto)

---

## 6. FLUXO DE TRABALHO (Workflow)

### Montar uma máquina (fluxo natural):
1. Abrir gaveta de dispositivos (esquerda)
2. Arrastar motor para bancada → snap magnético na base
3. Arrastar CLP → snap ao lado
4. Clicar porta do CLP → "pegar fio"
5. Clicar porta do motor → fio se conecta (viaja + fixa)
6. Console mostra "CLP.DO0 = 1" em tempo real
7. Raio-X desliza para ver camada de dados

### Diagnosticar problema:
1. Console inferior mostra WARN vermelho
2. Clicar no warn → câmera voa até o componente
3. Cartão do dispositivo abre destacando a porta com problema
4. Aba Física mostra leituras anormais

---

## 7. TIPOGRAFIA E RITMO

- **Display**: font técnica condensada (ex: "Barlow Condensed" / "Saira")
- **UI**: "Inter" (legibilidade)
- **Mono**: "JetBrains Mono" (dados, endereços, tags)
- **Ritmo**: espaçamento em escala 4px, cantos levemente arredondados (4px — industrial, não 16px apple)

---

## 8. ACESSIBILIDADE COM ESTILO

- Contraste mínimo 4.5:1 mantido
- Foco visível com anel ciano elétrico (#00E5FF)
- Nunca só cor para severidade: ícone + cor + texto
- Console tem versão "alto contraste"

---

## 9. ROADMAP DE COMPONENTES

1. [ ] Design tokens (CSS custom properties)
2. [ ] App Shell (bancada + gavetas + console)
3. [ ] Fio Vivo (Live Wire)
4. [ ] Snap Magnético
5. [ ] Raio-X de Camadas
6. [ ] Console de Diagnóstico
7. [ ] Cartão de Dispositivo
8. [ ] Modo Comissionamento
9. [ ] Sistema de Toasts/Warns inline

---

*Esta visão guia cada componente. Nada de template genérico.*