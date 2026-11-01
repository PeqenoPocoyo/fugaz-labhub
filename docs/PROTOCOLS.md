# Fugaz LABHUB — Protocolos Industriais

## Protocolos Suportados

### 1. ModBus TCP/IP
- **Porta padrão**: 502
- **Funções suportadas**: Read Coils, Read Discrete Inputs, Read Holding Registers, Read Input Registers, Write Single Coil, Write Single Register, Write Multiple Coils, Write Multiple Registers
- **Endereçamento**: `hr:0` (Holding Register 0), `co:0` (Coil 0), `ir:0` (Input Register 0), `di:0` (Discrete Input 0)
- **Biblioteca**: pymodbus

### 2. ModBus RTU (Serial)
- **Baudrate padrão**: 9600
- **Paridade**: None (N)
- **Stop bits**: 1
- **Data bits**: 8
- **Biblioteca**: pymodbus (serial)

### 3. OPC UA
- **Porta padrão**: 4840
- **Modos de segurança**: None, Sign, SignAndEncrypt
- **Autenticação**: Anônima, Usuário/Senha, Certificado
- **Biblioteca**: asyncua

### 4. OPC DA (Legacy)
- **Protocolo**: DCOM
- **Plataforma**: Windows only
- **Biblioteca**: OpenOPC (via COM)

### 5. PROFINET
- **Tipo**: Ethernet Industrial
- **Fabricantes**: Siemens (principal)
- **Classes**: RT (Real-Time), IRT (Isochronous Real-Time)
- **Biblioteca**: python-snap7 (para S7), profinet (custom)

### 6. EtherNet/IP
- **Tipo**: Ethernet Industrial
- **Fabricantes**: Allen-Bradley, Rockwell, Schneider
- **Biblioteca**: pycomm3

### 7. USB/Serial
- **Protocolos**: RS-232, RS-485, USB CDC
- **Biblioteca**: pyserial

### 8. MQTT
- **Porta padrão**: 1883 (TCP), 8883 (TLS)
- **QoS**: 0, 1, 2
- **Biblioteca**: paho-mqtt

## Configuração de Protocolo

### Exemplo: ModBus TCP
```json
{
  "protocol": "modbus_tcp",
  "config": {
    "host": "192.168.0.1",
    "port": 502,
    "unit_id": 1,
    "timeout": 3.0
  }
}
```

### Exemplo: OPC UA
```json
{
  "protocol": "opc_ua",
  "config": {
    "endpoint": "opc.tcp://192.168.0.1:4840",
    "username": "admin",
    "password": "password",
    "security_mode": "SignAndEncrypt"
  }
}
```

### Exemplo: Serial/USB
```json
{
  "protocol": "serial_usb",
  "config": {
    "port": "COM3",
    "baudrate": 9600,
    "bytesize": 8,
    "parity": "N",
    "stopbits": 1,
    "timeout": 1.0
  }
}
```

## Softwares Suportados

| Software | Fabricante | Protocolos | Status |
|----------|------------|------------|--------|
| TIA Portal | Siemens | PROFINET, ModBus | ✅ |
| MasterTool | Altus | ModBus TCP | ✅ |
| BluePlant | Altus | ModBus TCP, OPC UA | ✅ |
| FvDesigner | Fatek | ModBus RTU | ✅ |
| EcoStruxure | Schneider | ModBus TCP, EtherNet/IP | 🔲 |
| RSLogix | Rockwell | EtherNet/IP | 🔲 |

## Comunicação Bidirecional

O Fugaz LABHUB pode:
1. **Ler** tags/variáveis de dispositivos externos
2. **Escrever** valores em dispositivos externos
3. **Escalar** sinais (0-10V, 4-20mA, etc.)
4. **Converter** entre formatos (digital ↔ analógico)

## Tags e GVLs

- **Tags**: Variáveis individuais acessíveis via protocolo
- **GVL (Global Variable List)**: Lista de variáveis globais do CLP
- **Mapping**: Mapeamento entre tags internas e externas

## Segurança

- TLS para comunicação externa
- Autenticação por usuário/senha
- Certificados X.509 para OPC UA
- Firewall rules configuráveis