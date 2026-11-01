# Fugaz LABHUB — Catálogo de Dispositivos

## Categorias

### PLC (Controladores Lógicos Programáveis)
| ID | Nome | Fabricante | Protocolos |
|----|------|------------|------------|
| siemens_s7_1200 | S7-1200 CPU 1214C | Siemens | PROFINET, ModBus TCP |
| altus_nexto_xp340 | Nexto XP340 | Altus | ModBus TCP, EtherNet/IP |
| delta_dvp_ss2 | DVP-SS2 | Delta | ModBus RTU/TCP |
| schneider_modicon_m221 | Modicon M221 | Schneider | ModBus TCP, EtherNet/IP |
| fatek_fb_s | FBs | FATEK | ModBus RTU |

### Microcontroladores
| ID | Nome | Fabricante | Protocolos |
|----|------|------------|------------|
| arduino_uno | Arduino UNO R3 | Arduino | USB, ModBus RTU |
| esp32_devkit | ESP32 DevKit V1 | Espressif | USB, WiFi, Bluetooth, ModBus TCP |

### Atuadores
| ID | Nome | Tipo | Potência |
|----|------|------|----------|
| motor_dc | Motor DC 12V | DC | 6W |
| motor_stepper | Motor de Passo NEMA17 | Stepper | 18W |

### Sensores
| ID | Nome | Tipo | Range |
|----|------|------|-------|
| sensor_indutivo | Sensor Indutivo M12 | Indutivo | 4mm |
| sensor_fotoeletrico | Sensor Fotoelétrico Barreira | Fotoelétrico | 10m |
| sensor_temperatura_pt100 | Sensor PT100 | Temperatura | -50 a 200°C |
| celula_carga | Célula de Carga 50kg | Carga | 50kg |

### Pneumática
| ID | Nome | Tipo | Especificação |
|----|------|------|---------------|
| cilindro_pneumatico | Cilindro Simples Ação | Cilindro | Ø50mm, 100mm curso |
| valvula_direcional_5_2 | Válvula 5/2 | Válvula | 24VDC, 700 l/min |
| compressor_ar | Compressor de Ar | Compressor | 8 bar, 200 l/min |

### Hidráulica
| ID | Nome | Tipo | Especificação |
|----|------|------|---------------|
| bomba_hidraulica | Bomba de Engrenagem | Bomba | 10 l/min, 200 bar |
| cilindro_hidraulico | Cilindro Dupla Ação | Cilindro | Ø50mm, 200mm curso |

### Mecânica
| ID | Nome | Tipo | Especificação |
|----|------|------|---------------|
| esteira_transportadora | Esteira Transportadora | Transportador | 0.5 m/s, 50kg max |

### Visão
| ID | Nome | Tipo | Especificação |
|----|------|------|---------------|
| camera_ip | Câmera IP Industrial | Câmera | 1080p, 30fps |

### Materiais
| ID | Nome | Tipo | Dimensões |
|----|------|------|-----------|
| caixa_empilhavel | Caixa Empilhável | Caixa | 400x300x200mm |
| palete | Palete PBR | Palete | 1000x150x1200mm |

### Eletrônica
| ID | Nome | Tipo | Especificação |
|----|------|------|---------------|
| resistor | Resistor | Passivo | 1kΩ, 0.25W |
| capacitor | Capacitor Eletrolítico | Passivo | 100µF, 25V |
| relay | Relé Eletromecânico | Ativo | 24VDC, 10A |

### Potência
| ID | Nome | Tipo | Especificação |
|----|------|------|---------------|
| fonte_alimentacao | Fonte 24V DC | Fonte | 24V, 5A |

### IHM
| ID | Nome | Fabricante | Tela |
|----|------|------------|------|
| ihm_weintek | MT8071iP | Weintek | 7", 800x480 |

### Drives
| ID | Nome | Tipo | Potência |
|----|------|------|----------|
| inversor_frequencia | Inversor de Frequência | VFD | 2.2kW |

## Adicionando Novos Dispositivos

1. Criar entrada no arquivo `backend/app/devices/catalog/devices.json`
2. Adicionar imagem em `frontend/public/assets/devices/`
3. O dispositivo aparecerá automaticamente no catálogo

## Valores de Fábrica

Todos os dispositivos vêm pré-configurados com seus valores de fábrica para:
- Tensão de alimentação
- Corrente nominal
- Endereço IP (quando aplicável)
- Parâmetros de comunicação
- Constantes físicas (resistência, capacitância, etc.)