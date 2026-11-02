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

# commits locais ainda nao publicados (working tree limpa, mas ahead do remote)
$ahead = 0
$hasUpstream = git -C $repoRoot rev-parse --verify --quiet origin/main
if ($LASTEXITCODE -eq 0 -and $hasUpstream) {
    $ahead = [int](git -C $repoRoot rev-list --count origin/main..HEAD)
}

if (-not $changes -and $ahead -eq 0) {
    Write-Host "[sync] nada a publicar ($stamp)" -ForegroundColor DarkGray
    exit 0
}

if ($changes) {
    $count = ($changes | Measure-Object).Count
    git -C $repoRoot add -A
    git -C $repoRoot commit -m $msg | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[erro] falha no commit" -ForegroundColor Red
        exit 1
    }

    Write-Host "[sync] $count arquivo(s) - $msg" -ForegroundColor Green
} else {
    Write-Host "[sync] $ahead commit(s) local(is) sem publish - enviando" -ForegroundColor Cyan
}

git -C $repoRoot push origin HEAD | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[erro] push falhou (credenciais/conexao)" -ForegroundColor Red
    exit 1
}

Write-Host "[sync] publicado em github.com/PeqenoPocoyo/fugaz-labhub" -ForegroundColor Green
