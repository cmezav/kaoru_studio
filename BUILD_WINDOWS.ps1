$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '============================================================' -ForegroundColor DarkMagenta
Write-Host ' KAORU STUDIO - GENERADOR DE INSTALADOR WINDOWS' -ForegroundColor Magenta
Write-Host '============================================================' -ForegroundColor DarkMagenta
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js no está instalado.' -ForegroundColor Red
    Write-Host 'Instala Node.js LTS y vuelve a ejecutar este archivo.' -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path (Join-Path $PSScriptRoot 'index.html'))) {
    Write-Host 'Este script debe estar en la raíz de kaoru_studio (junto a index.html).' -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot

Write-Host ('Node: ' + (node --version)) -ForegroundColor Gray
Write-Host ('npm : ' + (npm --version)) -ForegroundColor Gray
Write-Host ''

Write-Host '[1/2] Instalando dependencias de escritorio...' -ForegroundColor Cyan
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '[2/2] Creando Kaoru Studio Setup.exe...' -ForegroundColor Cyan
npm run dist:win
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$dist = Join-Path $PSScriptRoot 'dist-desktop'
$installer = Get-ChildItem -Path $dist -Filter 'Kaoru-Studio-Setup-*.exe' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1

Write-Host ''
if ($installer) {
    Write-Host 'LISTO.' -ForegroundColor Green
    Write-Host ('Instalador: ' + $installer.FullName) -ForegroundColor Green
    Start-Process explorer.exe -ArgumentList ('/select,"' + $installer.FullName + '"')
} else {
    Write-Host 'La compilación terminó, pero no encontré el .exe esperado.' -ForegroundColor Yellow
    Start-Process explorer.exe -ArgumentList $dist
}
