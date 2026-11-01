<#
.SYNOPSIS
    Sincroniza o FUGAZ LABHUB com o GitHub (commit + push) em um comando.

.DESCRIPTION
    Publica o estado atual do projeto em github.com/PeqenoPocoyo/fugaz-labhub.
    Ignora automaticamente node_modules, dist, caches e segredos (via .gitignore).

.PARAMETER Message
    Mensagem do commit. Se omitida, gera uma mensagem com timestamp.

.PARAMETER Watch
    Modo vigia: refaz o sync a cada N segundos enquanto houver mudanças.

.PARAMETER Interval
    Intervalo do modo vigia em segundos (padrão: 60).

.EXAMPLE
    .\scripts\github-sync.ps1
    .\scripts\github-sync.ps1 -Message "feat: engrenagens com razão computada"
    .\scripts\github-sync.ps1 -Watch -Interval 30
#>
param(
    [string]$Message = "",
    [switch]$Watch = $false,
    [int]$Interval = 60
)

$ErrorActionPreference = "Stop"
$repo = "C:\Users\drici\Documents\FUGAZ LABHUB"
$remote = "https://github.com/PeqenoPocoyo/fugaz-labhub.git"

function Test-GitRepo {
    git -C $repo rev-parse --git-dir *> $null
    return $?
}

# ---------- Bootstrap: garante repo + remote na primeira execução ----------
if (-not (Test-GitRepo)) {
    Write-Host "[setup] Inicializando repositório git..." -ForegroundColor Cyan
    git -C $repo init -b main
}

if (-not (git -C $repo remote | Select-String -SimpleMatch "origin")) {
    Write-Host "[setup] Adicionando remote origin..." -ForegroundColor Cyan
    git -C $repo remote add origin $remote
}

# ---------- Um ciclo de sync ----------
function Invoke-Sync {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $msg = if ($Message) { $Message } else { "chore: sync $stamp" }

    # Nada a fazer?
    $status = git -C $repo status --porcelain
    if (-not $status) {
        Write-Host "[sync] Nada a publicar ($stamp)" -ForegroundColor DarkGray
        return
    }

    git -C $repo add -A
    git -C $repo commit -m $msg *> $null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[erro] falha no commit" -ForegroundColor Red
        return
    }

    $files = ($status | Measure-Object).Count
    Write-Host "[sync] $files arquivo(s) — '$msg'" -ForegroundColor Green

    git -C $repo push origin HEAD *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[sync] publicado em $remote" -ForegroundColor Green
    } else {
        Write-Host "[erro] push falhou — verifique credenciais/conexão" -ForegroundColor Red
    }
}

# ---------- Execução ----------
if ($Watch) {
    Write-Host "[watch] vigiando mudanças a cada ${Interval}s (Ctrl+C para sair)" -ForegroundColor Cyan
    while ($true) {
        Invoke-Sync
        Start-Sleep -Seconds $Interval
    }
} else {
    Invoke-Sync
}
