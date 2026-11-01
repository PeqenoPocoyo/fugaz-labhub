<#
.SYNOPSIS
    Teste de fumaca completo do LABHUB — monta uma cena, liga o trem de forca,
    roda a simulacao e imprime os valores vivos de cada sistema.

.DESCRIPTION
    Valida sem navegador: encaixe magnetico, trem de forca (VFD -> engrenagens
    -> esteira), visao computacional (projecao na vista fixa) e cadeia de
    fluidos (bomba -> vortex -> valvula -> tanque).

.EXAMPLE
    .\scripts\test-lab.ps1
#>
param()

$ErrorActionPreference = "Stop"
$base = "http://localhost:8000/api"

function Spawn($typeId) {
    $r = Invoke-RestMethod -Uri "$base/devices/spawn" -Method POST `
         -ContentType "application/json" `
         -Body (@{ type_id = $typeId } | ConvertTo-Json)
    return $r
}

function SetPort($deviceId, $portId, $value) {
    $null = Invoke-RestMethod -Uri "$base/devices/$deviceId/port/$portId" -Method POST `
           -ContentType "application/json" -Body (@{ value = $value } | ConvertTo-Json)
}

function Section($title) {
    Write-Host ""
    Write-Host "== $title " -ForegroundColor Cyan -NoNewline
    Write-Host ("=" * [Math]::Max(0, (56 - $title.Length)))
}

# ---------- verifica backend ----------
try {
    $null = Invoke-WebRequest -Uri "$base/health" -UseBasicParsing -TimeoutSec 5
} catch {
    Write-Host "Backend nao esta rodando. Rode: .\scripts\start.ps1" -ForegroundColor Red
    exit 1
}

Section "MONTANDO A CENA"
$null = Invoke-RestMethod -Uri "$base/world/reset" -Method POST

$basePlate = Spawn "infra_base_plate"
$motor     = Spawn "motor_dc"
$gears     = Spawn "trans_gears"
$conveyor  = Spawn "conveyor_belt"
$tape      = Spawn "vision_tape"
$marker    = Spawn "vision_marker"
$camera    = Spawn "camera_ip"
$vfd       = Spawn "vfd_generic"
$pump      = Spawn "pump_centrifugal"
$vortex    = Spawn "flow_vortex"
$valve     = Spawn "valve_control"
$tank      = Spawn "tank"
Write-Host "  12 dispositivos criados" -ForegroundColor Green

Section "ENCAIXE MAGNETICO"
# pega um furo livre da base e joga o motor ao lado para encaixar
$bpNode = Invoke-RestMethod -Uri "$base/devices/$($basePlate.id)"
$slot = $bpNode.slots | Where-Object { -not $_.occupied_by } | Select-Object -First 1
Write-Host "  furo livre: $($slot.label) em ($($slot.position -join ', '))"

$targetX = $slot.position[0] + 0.1
$targetZ = $slot.position[2] + 0.1
$null = Invoke-RestMethod -Uri "$base/devices/$($motor.id)" -Method PATCH -ContentType "application/json" `
        -Body (@{ transform = @{ position = @($targetX, 0.6, $targetZ) } } | ConvertTo-Json)
$null = Invoke-RestMethod -Uri "$base/devices/$($camera.id)" -Method PATCH -ContentType "application/json" `
        -Body (@{ transform = @{ position = @(0.1, 1.2, 0.1) } } | ConvertTo-Json)

$snap1 = Invoke-RestMethod -Uri "$base/devices/snap" -Method POST -ContentType "application/json" `
         -Body (@{ device_id = $motor.id; fixation_id = "flange_base" } | ConvertTo-Json)
Write-Host "  motor -> $($snap1.slot_label): alinhado=$($snap1.aligned) forca=$($snap1.strength)"
Write-Host "  nova posicao do motor: $($snap1.position -join ', ')"

Section "TREM DE FORCA (VFD -> ENGRENAGENS -> ESTEIRA)"
$link = Invoke-RestMethod -Uri "$base/world/drivetrain" -Method POST -ContentType "application/json" `
        -Body (@{ source_id = $vfd.id; target_id = $conveyor.id; transmission_ids = @($gears.id) } | ConvertTo-Json)
Write-Host "  modo=$($link.drivetrain.mode) via $($link.drivetrain.transmissions -join ',')"

# engrenagens 18/54 = razao 3
$g = Invoke-RestMethod -Uri "$base/devices/$($gears.id)" -Method PATCH -ContentType "application/json" `
       -Body (@{ properties = @{ teeth_in = 18; teeth_out = 54 } } | ConvertTo-Json)

# esteira grande: 12 x 2 celulas
$null = Invoke-RestMethod -Uri "$base/devices/$($conveyor.id)/resize" -Method POST -ContentType "application/json" `
        -Body (@{ cells_x = 12; cells_y = 2 } | ConvertTo-Json)
Write-Host "  esteira redimensionada para 12x2 (2400 x 400 mm)"

Section "CADEIA DE FLUIDOS"
$null = Invoke-RestMethod -Uri "$base/world/connect" -Method POST -ContentType "application/json" `
        -Body (@{ from_port = "$($pump.id)_fluid_out"; to_port = "$($vortex.id)_fluid_in" } | ConvertTo-Json)
$null = Invoke-RestMethod -Uri "$base/world/connect" -Method POST -ContentType "application/json" `
        -Body (@{ from_port = "$($vortex.id)_fluid_out"; to_port = "$($valve.id)_fluid_in" } | ConvertTo-Json)
$null = Invoke-RestMethod -Uri "$base/world/connect" -Method POST -ContentType "application/json" `
        -Body (@{ from_port = "$($valve.id)_fluid_out"; to_port = "$($tank.id)_inlet" } | ConvertTo-Json)
$link2 = Invoke-RestMethod -Uri "$base/world/drivetrain" -Method POST -ContentType "application/json" `
         -Body (@{ source_id = $vfd.id; target_id = $pump.id; transmission_ids = @() } | ConvertTo-Json)
Write-Host "  bomba <- VFD (direto) -> vortex -> valvula -> tanque"

Section "VISAO COMPUTACIONAL"
# posiciona a fita e o marcador na frente da camera
$null = Invoke-RestMethod -Uri "$base/devices/$($tape.id)" -Method PATCH -ContentType "application/json" `
        -Body (@{ transform = @{ position = @(2, 0.1, 2) } } | ConvertTo-Json)
$null = Invoke-RestMethod -Uri "$base/devices/$($marker.id)" -Method PATCH -ContentType "application/json" `
        -Body (@{ transform = @{ position = @(0, 1, 3) } } | ConvertTo-Json)
$null = Invoke-RestMethod -Uri "$base/devices/$($camera.id)" -Method PATCH -ContentType "application/json" `
        -Body (@{ properties = @{ yaw_deg = 45; pitch_deg = -8; fov_deg = 60; running = $true; detection_mode = "references" } } | ConvertTo-Json)

Section "LIGANDO E SIMULANDO (6 segundos)"
SetPort $vfd.id "di_start" $true
SetPort $vfd.id "ai_speed" 10
SetPort $conveyor.id "run" $true
SetPort $valve.id "cmd" 6
SetPort $tank.id "drain_cmd" 2

$null = Invoke-RestMethod -Uri "$base/sim/start" -Method POST
Start-Sleep -Seconds 6

Section "VALORES VIVOS"
$c  = Invoke-RestMethod -Uri "$base/devices/$($conveyor.id)"
$gg = Invoke-RestMethod -Uri "$base/devices/$($gears.id)"
$p  = Invoke-RestMethod -Uri "$base/devices/$($pump.id)"
$v  = Invoke-RestMethod -Uri "$base/devices/$($vortex.id)"
$vv = Invoke-RestMethod -Uri "$base/devices/$($valve.id)"
$t  = Invoke-RestMethod -Uri "$base/devices/$($tank.id)"
$det = Invoke-RestMethod -Uri "$base/vision/references/$($camera.id)"

Write-Host ("  ENGRENAGENS  razao={0,-6} in={1,-8} out={2,-8} rpm" -f $gg.properties.ratio, $gg.properties.rpm_in, $gg.properties.rpm_out)
Write-Host ("  ESTEIRA      {0}x{1} cel | eixo={2} rpm | v={3} m/s" -f $c.properties.cells_x, $c.properties.cells_y, $c.properties.shaft_rpm, $c.properties.speed_m_s)
Write-Host ("  BOMBA        {0} rpm | Q={1} m3/h | H={2} m | {3} W" -f $p.properties.rpm, $p.properties.flow_m3h, $p.properties.head_m, $p.properties.power_w)
Write-Host ("  VORTEX       Q={0} m3/h | f={1} Hz | total={2} m3" -f $v.properties.flow_m3h, $v.properties.vortex_freq_hz, $v.properties.total_m3)
Write-Host ("  VALVULA      abertura={0}% | Q={1} m3/h" -f $vv.properties.opening_pct, $vv.properties.flow_m3h)
Write-Host ("  TANQUE       nivel={0}% ({1} L)" -f $t.properties.level_pct, $t.properties.level_l)

Write-Host ""
Write-Host "  DETECCOES ($($det.count)):" -ForegroundColor Yellow
foreach ($d in $det.detections) {
    Write-Host ("    - {0} | bbox=[{1}] | {2} m | {3}%" -f $d.label, ($d.bbox -join ", "), $d.distance_m, [math]::Round($d.confidence * 100))
}

Section "RESUMO"
$stats = Invoke-RestMethod -Uri "$base/world/stats"
Write-Host "  nos=$($stats.nodes) conexoes=$($stats.connections) trens=$((Invoke-RestMethod -Uri "$base/world/drivetrains").drivetrains.Count)"
Write-Host ""
Write-Host "  Cena pronta na bancada: http://localhost:5173" -ForegroundColor Green
Write-Host "  (selecione a camera no canto para ver o preview ao vivo)" -ForegroundColor DarkGray
Write-Host ""
$null = Invoke-RestMethod -Uri "$base/sim/stop" -Method POST
