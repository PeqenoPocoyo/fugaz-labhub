# Fugaz LABHUB — Como Testar

## 🚀 Quick Start

### Backend (Python/FastAPI)

```powershell
cd "C:\Users\drici\OneDrive\Documentos\FUGAZ LABHUB\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Acesse:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/health

### Frontend (React + Vite)

```powershell
cd "C:\Users\drici\OneDrive\Documentos\FUGAZ LABHUB\frontend"
npm run dev
```

Acesse: **http://localhost:5173**

### Testes

```powershell
cd "C:\Users\drici\OneDrive\Documentos\FUGAZ LABHUB"
python -m pytest tests/test_backend.py -v
```

## 🧪 Testando Funcionalidades

### 1. Arrastar Dispositivos
1. Abra o frontend (http://localhost:5173)
2. Na sidebar esquerda, veja a paleta de dispositivos
3. Arraste um dispositivo (ex: "Arduino UNO R3") para a área 3D
4. O dispositivo aparecerá na cena

### 2. Trocar Visualização
1. No header, clique em "Circuito" para abrir o editor de circuitos
2. Desenhe circuitos com nós e componentes
3. Clique em "3D" para voltar à visualização 3D

### 3. Configurar Protocolos
1. Na sidebar direita, encontre "Protocolos"
2. Selecione ModBus TCP, OPC UA ou Serial/USB
3. Configure host, porta, unit ID
4. Clique "Conectar"

### 4. Monitorar Sinais
1. Na sidebar esquerda, veja "Sinais"
2. Clique "Iniciar" para ver sinais simulados
3. Na sidebar direita, veja "Vibração", "Térmico", "Óleo", "Gases"

### 5. Testar API (PowerShell)

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing

# Listar catálogo
Invoke-WebRequest -Uri "http://localhost:8000/api/devices/catalog" -UseBasicParsing

# Criar dispositivo
$body = @{ device_type = "arduino_uno"; config = @{} } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8000/api/devices/" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing

# Listar dispositivos
Invoke-WebRequest -Uri "http://localhost:8000/api/devices/" -UseBasicParsing
```

## ⚠️ Troubleshooting

### Porta em uso
```powershell
Get-Process python | Stop-Process -Force
```

### npm não funciona
```powershell
cmd /c "cd C:\Users\drici\OneDrive\Documentos\FUGAZ LABHUB\frontend && npm run dev"
```

### Backend não inicia
```powershell
cd "C:\Users\drici\OneDrive\Documentos\FUGAZ LABHUB\backend"
pip install -r requirements.txt
```

### Frontend não compila
```powershell
cd "C:\Users\drici\OneDrive\Documentos\FUGAZ LABHUB\frontend"
npm install
npx tsc --noEmit
```