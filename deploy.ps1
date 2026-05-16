# =====================================================================
# TikBoosTTS Landing - deploy a Cloudflare Pages (PowerShell)
# =====================================================================
# Uso:
#   .\deploy.ps1                          -> preview
#   .\deploy.ps1 -Prod                    -> produccion (con confirmacion)
#   .\deploy.ps1 -Prod -Yes               -> produccion sin confirmacion
#   .\deploy.ps1 -Project "otro-nombre"   -> cambia el proyecto en CF
#
# Requisitos:
#   - Node.js (https://nodejs.org/) - incluye npx
#   - Cuenta en Cloudflare
#
# NOTA sobre encoding: este archivo usa solo ASCII a proposito.
# Windows PowerShell 5.1 lee .ps1 como Windows-1252 por default y
# corrompe caracteres UTF-8 sin BOM, lo que rompe el parser.
# =====================================================================

[CmdletBinding()]
param(
    [switch]$Prod,
    [switch]$Yes,
    [string]$Project = "tikboostts"
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Branch    = if ($Prod) { "main" } else { "preview" }

function Say  ($m) { Write-Host "[>] $m"  -ForegroundColor Blue }
function Ok   ($m) { Write-Host "[OK] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "[!] $m"  -ForegroundColor Yellow }
function Err  ($m) { Write-Host "[X] $m"  -ForegroundColor Red }
function Hr   { Write-Host ("-" * 70) -ForegroundColor DarkGray }

Hr
Write-Host "TikBoosTTS Landing - Cloudflare Pages" -ForegroundColor Green
Write-Host "   Proyecto: " -NoNewline; Write-Host $Project -ForegroundColor Blue -NoNewline
Write-Host "   Rama: "     -NoNewline; Write-Host $Branch  -ForegroundColor Blue
Hr

# ----- 1) Prerequisitos --------------------------------------------------
Say "Verificando prerequisitos..."
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Err "Node.js no esta instalado."
    Err "Instalalo desde https://nodejs.org/  (recomendado: LTS)"
    exit 1
}
Ok "Node $((node --version) -join '')"

$npx = Get-Command npx -ErrorAction SilentlyContinue
if (-not $npx) { Err "npx no esta disponible (deberia venir con Node)."; exit 1 }
Ok "npx disponible"

# ----- 2) Validacion del bundle -----------------------------------------
Say "Validando estructura del proyecto..."
$required = @(
    "index.html",
    "css/styles.css","css/phones.css","css/alerts.css","css/pricing.css",
    "js/main.js","js/config.js","js/phones.js","js/gifts.js","js/paddle.js",
    "data/gifts.json",
    "functions/api/paddle-webhook.js","functions/api/verify-subscription.js",
    "db/schema.sql",
    "_headers","_redirects"
)
foreach ($f in $required) {
    if (-not (Test-Path (Join-Path $DeployDir $f))) {
        Err "Falta archivo requerido: $f"; exit 1
    }
}
Ok "Archivos requeridos presentes"

# Tamano aprox
$bytes = (Get-ChildItem $DeployDir -Recurse -File -Exclude "node_modules",".wrangler" |
          Measure-Object -Property Length -Sum).Sum
$mb    = [math]::Round($bytes / 1MB, 2)
Ok "Tamano aproximado del bundle: $mb MB"

# Conteo de assets
$ssCount  = (Get-ChildItem (Join-Path $DeployDir "assets/screenshots") -File -ErrorAction SilentlyContinue).Count
$gifCount = (Get-ChildItem (Join-Path $DeployDir "assets/gifs")        -File -ErrorAction SilentlyContinue).Count
Ok "Assets: $ssCount capturas, $gifCount gifs/imgs de demo"

# ----- 3) Aviso si config.js apunta a placeholder -----------------------
$configPath = Join-Path $DeployDir "js/config.js"
if ((Get-Content $configPath -Raw) -match "https://example.com") {
    Warn "js/config.js todavia apunta a https://example.com/tikboostts.apk"
    Warn "Edita 'downloadUrl' antes de un deploy de produccion."
    if ($Branch -eq "main" -and -not $Yes) {
        $ans = Read-Host "Continuar de todas formas? [y/N]"
        if ($ans.ToLower() -ne "y" -and $ans.ToLower() -ne "yes") {
            Err "Cancelado."; exit 1
        }
    }
}

# ----- 4) Cloudflare auth -----------------------------------------------
Say "Verificando autenticacion con Cloudflare..."
$null = npx --yes wrangler whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Warn "No hay sesion activa de Cloudflare. Abriendo navegador para login..."
    npx --yes wrangler login
}
Ok "Autenticado en Cloudflare"

# ----- 5) Inyectar secrets desde .dev.vars en config.js ----------------
Say "Inyectando secrets en js/config.js desde .dev.vars..."
$devVarsPath = Join-Path $DeployDir ".dev.vars"
$configPath  = Join-Path $DeployDir "js/config.js"
$configOrig  = Get-Content $configPath -Raw -Encoding UTF8

if (-not (Test-Path $devVarsPath)) {
    Warn ".dev.vars no encontrado - los placeholders __XXXX__ se desplegaran sin reemplazar."
    $devVars = @{}
} else {
    $devVars = @{}
    Get-Content $devVarsPath | Where-Object { $_ -match '^[A-Z_]+=.+' } | ForEach-Object {
        $parts      = $_ -split '=', 2
        $key        = $parts[0].Trim()
        $val        = $parts[1].Trim()
        $devVars[$key] = $val
    }
    Ok ".dev.vars leido ($($devVars.Count) variables)"
}

$configInjected = $configOrig
foreach ($key in $devVars.Keys) {
    $configInjected = $configInjected -replace "__${key}__", $devVars[$key]
}

# Escribir config temporal con valores reales
Set-Content $configPath $configInjected -Encoding UTF8
Ok "Placeholders reemplazados en js/config.js"

# ----- 6) Secrets server-side en Cloudflare Pages ----------------------
# Estos van a las Pages Functions (no al cliente), via wrangler secret put.
# Solo los que esten en .dev.vars se sincronizan.
$serverSecrets = @('PADDLE_WEBHOOK_SECRET', 'PADDLE_PRO_PRICE_ID', 'PADDLE_ELITE_PRICE_ID')
if ($devVars.Count -gt 0) {
    Say "Sincronizando secrets server-side con Cloudflare Pages..."
    foreach ($secretName in $serverSecrets) {
        if ($devVars.ContainsKey($secretName)) {
            $val = $devVars[$secretName]
            # wrangler pages secret put lee el valor de stdin
            $val | npx --yes wrangler pages secret put $secretName `
                --project-name $Project 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Ok "  $secretName configurado"
            } else {
                Warn "  $secretName - no se pudo configurar (puede requerir permiso de cuenta)"
            }
        }
    }
}

# ----- 6b) Confirmacion de produccion (antes del deploy) ----------------
if ($Branch -eq "main" -and -not $Yes) {
    Hr
    Warn "Estas por desplegar a PRODUCCION."
    $confirm = Read-Host "Escribe '$Project' para confirmar"
    if ($confirm -ne $Project) {
        Err "Confirmacion incorrecta. Cancelado."; exit 1
    }
}

# ----- 7) Deploy --------------------------------------------------------

Hr
Say "Desplegando a Cloudflare Pages..."
Push-Location $DeployDir
try {
    npx --yes wrangler pages deploy . `
        --project-name $Project `
        --branch $Branch `
        --commit-dirty=true
    if ($LASTEXITCODE -ne 0) { throw "wrangler deploy fallo (exit $LASTEXITCODE)" }
}
finally {
    # Restaurar config.js exactamente como esta en git (evita diff de CRLF/LF)
    git checkout -- js/config.js 2>$null
    if ($LASTEXITCODE -eq 0) {
        Ok "js/config.js restaurado desde git (secrets eliminados del disco)"
    } else {
        # Fallback si git no esta disponible
        Set-Content $configPath $configOrig -Encoding UTF8 -NoNewline:$false
        Ok "js/config.js restaurado (fallback Set-Content)"
    }
    Pop-Location
}

Hr
Ok "Deploy completado."
if ($Branch -eq "main") {
    Write-Host "URL de produccion: " -NoNewline
    Write-Host "https://tikboostts.com" -ForegroundColor Green
    Write-Host "   (alias)         " -NoNewline
    Write-Host "https://$Project.pages.dev" -ForegroundColor DarkGray
} else {
    Write-Host "URL de preview impresa arriba (en la salida de wrangler)."
    Write-Host "   Produccion: " -NoNewline
    Write-Host "https://tikboostts.com" -ForegroundColor DarkGray -NoNewline
    Write-Host " (cuando uses -Prod)"
}
Hr
