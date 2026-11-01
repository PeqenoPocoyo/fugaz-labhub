# Script de inicialização do Fugaz LABHUB
# Uso: .\scripts\start.ps1

Write-Host "?? Iniciando Fugaz LABHUB..." -ForegroundColor Cyan

# Backend
Write-Host "?? Iniciando Backend (FastAPI)..." -ForegroundColor Yellow
$backendPath = "C:\Users\drici\Documents\FUGAZ LABHUB\backend"
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory $backendPath

Start-Sleep -Seconds 3

# Frontend
Write-Host "?? Iniciando Frontend (React + Vite)..." -ForegroundColor Yellow
$frontendPath = "C:\Users\drici\Documents\FUGAZ LABHUB\frontend"
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $frontendPath

Write-Host ""
Write-Host "? Fugaz LABHUB iniciado!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Pressione Ctrl+C para parar..." -ForegroundColor Gray
