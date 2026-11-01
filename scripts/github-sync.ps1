# Sincroniza o FUGAZ LABHUB com o GitHub (commit + push) em um comando.
# Publica em https://github.com/PeqenoPocoyo/fugaz-labhub
#
# Uso:
#   .\scripts\github-sync.ps1 "feat: minha mensagem"
#   .\scripts\github-sync.ps1                 (mensagem automatica com timestamp)
#   git sync "mensagem"                      (atalho configurado no repo)

param([string]$Message = "")

$ErrorActionPreference = "Stop"
$repoRoot = "C:\Users\drici\Documents\FUGAZ LABHUB"
$remoteUrl = "https://github.com/PeqenoPocoyo/fugaz-labhub.git"

# ---------- bootstrap: repo + remote ----------
$isRepo = git -C $repoRoot rev-parse --git-dir 2>$null
if (-not $isRepo) {
    Write-Host "[setup] inicializando repositorio git..." -ForegroundColor Cyan
    git -C $repoRoot init -b main
}

$hasRemote = git -C $repoRoot remote
if ($hasRemote -notmatch "origin") {
    Write-Host "[setup] adicionando remote origin..." -ForegroundColor Cyan
    git -C $repoRoot remote add origin $remoteUrl
}

# ---------- ciclo de sync ----------
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
if ($Message -ne "") {
    $msg = $Message
} else {
    $msg = "chore: sync $stamp"
}

$changes = git -C $repoRoot status --porcelain
if (-not $changes) {
    Write-Host "[sync] nada a publicar ($stamp)" -ForegroundColor DarkGray
    exit 0
}

$count = ($changes | Measure-Object).Count
git -C $repoRoot add -A
git -C $repoRoot commit -m $msg | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "[erro] falha no commit" -ForegroundColor Red
    exit 1
}

Write-Host "[sync] $count arquivo(s) - $msg" -ForegroundColor Green

git -C $repoRoot push origin HEAD | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[erro] push falhou (credenciais/conexao)" -ForegroundColor Red
    exit 1
}

Write-Host "[sync] publicado em github.com/PeqenoPocoyo/fugaz-labhub" -ForegroundColor Green
