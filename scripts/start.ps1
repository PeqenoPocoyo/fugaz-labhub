# Inicia o Fugaz LABHUB (backend + frontend) e espera ficar pronto.
#
# Uso:
#   .\scripts\start.ps1              # estavel (mundo persiste entre requests)
#   .\scripts\start.ps1 -Reload      # recarrega ao salvar .py (perde estado do mundo)
#   .\scripts\start.ps1 -OpenBrowser # abre http://localhost:5173 no navegador

param(
    [switch]$Reload = $false,
    [switch]$OpenBrowser = $true
)

$ErrorActionPreference = "Stop"
$backendPath  = "C:\Users\drici\Documents\FUGAZ LABHUB\backend"
$frontendPath = "C:\Users\drici\Documents\FUGAZ LABHUB\frontend"

Write-Host ""
Write-Host "  FUGAZ LABHUB - iniciando..." -ForegroundColor Cyan
Write-Host "  ----------------------------" -ForegroundColor DarkCyan

# ---------- limpa instancias anteriores ----------
$old = Get-Process python, node -ErrorAction SilentlyContinue |
       Where-Object { $_.Id -ne $PID }
if ($old) {
    Write-Host "  [limpeza] encerrando $($old.Count) processo(s) anterior(es)..." -ForegroundColor DarkGray
    $old | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

# ---------- backend ----------
$uvArgs = @("-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000")
if ($Reload) { $uvArgs += "--reload" }

Write-Host "  [1/2] backend  -> http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList $uvArgs -WorkingDirectory $backendPath -WindowStyle Minimized

# espera o health responder (max 30s)
$ok = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 3
        $ok = $true
        break
    } catch { }
}
if (-not $ok) {
    Write-Host "  [erro] backend nao respondeu em 30s. Veja a janela minimizada." -ForegroundColor Red
    exit 1
}
Write-Host "        backend OK ($($i * 2 + 2)s)" -ForegroundColor Green

# ---------- frontend ----------
Write-Host "  [2/2] frontend -> http://localhost:5173 ..." -ForegroundColor Yellow
# npm e um shim .cmd: Start-Process nao resolve, usar cmd /c
Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -WorkingDirectory $frontendPath -WindowStyle Minimized

$fe = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3
        $fe = $true
        break
    } catch { }
}
if (-not $fe) {
    Write-Host "  [erro] frontend nao respondeu em 60s (npm install feito?)." -ForegroundColor Red
    exit 1
}
Write-Host "        frontend OK ($($i * 2 + 2)s)" -ForegroundColor Green

Write-Host ""
Write-Host "  PRONTO" -ForegroundColor Green
Write-Host "     Bancada:   http://localhost:5173" -ForegroundColor White
Write-Host "     API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "     Parar:     .\scripts\stop.ps1" -ForegroundColor DarkGray
Write-Host ""

if ($OpenBrowser) {
    Start-Process "http://localhost:5173"
}
