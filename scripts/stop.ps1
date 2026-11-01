# Encerra backend (uvicorn/python) e frontend (vite/node) do LABHUB.
# Uso: .\scripts\stop.ps1

Write-Host "Encerrando servidores do LABHUB..." -ForegroundColor Yellow

$procs = Get-Process python, node -ErrorAction SilentlyContinue
if (-not $procs) {
    Write-Host "Nenhum servidor rodando." -ForegroundColor DarkGray
    exit 0
}

$procs | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$rest = Get-Process python, node -ErrorAction SilentlyContinue
if ($rest) {
    Write-Host "Ainda restam $($rest.Count) processo(s)." -ForegroundColor Red
} else {
    Write-Host "Servidores encerrados." -ForegroundColor Green
}
