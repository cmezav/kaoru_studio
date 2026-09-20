$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Main = Join-Path $Root "desktop\main.cjs"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU STUDIO - MANTENER BADGE AL CERRAR" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host ""

if (-not (Test-Path $Main)) {
    Write-Host "ERROR: No encuentro desktop\main.cjs." -ForegroundColor Red
    exit 1
}

$Branch = (git -C $Root branch --show-current).Trim()

if ($Branch -eq "main") {
    Write-Host "ERROR: Estas en main." -ForegroundColor Red
    Write-Host "Crea una rama primero, por ejemplo:" -ForegroundColor Yellow
    Write-Host "  git switch -c fix/keep-badge-on-close" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$Backup = "$Main.keep-badge.bak"
Copy-Item $Main $Backup -Force

try {
    $patcher = @'
const fs = require('fs');

const file = process.argv[2];
let s = fs.readFileSync(file, 'utf8');

function mustReplace(from, to, label) {
  if (!s.includes(from)) {
    throw new Error('No encontre: ' + label);
  }
  s = s.replace(from, to);
}

// Importar Tray y Menu
if (!s.includes('Tray, Menu')) {
  mustReplace(
    "const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require('electron');",
    "const { app, BrowserWindow, dialog, ipcMain, nativeImage, Tray, Menu } = require('electron');",
    'import Electron'
  );
}

// Variable global del tray
if (!s.includes('let tray = null;')) {
  mustReplace(
    "let updateCheckStarted = false;",
    "let updateCheckStarted = false;\nlet tray = null;",
    'updateCheckStarted'
  );
}

// Funciones para restaurar ventana + tray
if (!s.includes('function showMainWindow()')) {
  mustReplace(
    "function configureAutoUpdates() {",
`function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function ensureTray(rootDir) {
  if (tray && !tray.isDestroyed()) return;

  const trayImage = nativeImage
    .createFromPath(path.join(rootDir, 'logo.png'))
    .resize({ width: 16, height: 16, quality: 'best' });

  tray = new Tray(trayImage);
  tray.setToolTip('Kaoru Studio');

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Abrir Kaoru Studio',
        click: () => showMainWindow()
      },
      { type: 'separator' },
      {
        label: 'Salir completamente',
        click: () => {
          quitting = true;
          app.quit();
        }
      }
    ])
  );

  tray.on('click', () => {
    showMainWindow();
  });

  tray.on('double-click', () => {
    showMainWindow();
  });
}

function configureAutoUpdates() {`,
    'configureAutoUpdates'
  );
}

// Crear tray al crear ventana
if (!s.includes('ensureTray(rootDir);')) {
  mustReplace(
    "function createWindow(origin, rootDir) {\n  mainWindow = new BrowserWindow({",
    "function createWindow(origin, rootDir) {\n  ensureTray(rootDir);\n\n  mainWindow = new BrowserWindow({",
    'createWindow'
  );
}

// Interceptar X: minimizar, no destruir
if (!s.includes('[Kaoru] Cerrar -> minimizar')) {
  mustReplace(
`  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {`,
`  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // [Kaoru] Cerrar -> minimizar.
  // Esto mantiene el proceso y el HWND vivos, por lo que Windows
  // conserva el overlay del contador sobre el icono de la barra.
  mainWindow.on('close', (event) => {
    if (quitting) return;

    event.preventDefault();
    mainWindow.minimize();
  });

  mainWindow.on('closed', () => {`,
    'ready-to-show'
  );
}

// Al activar desde Windows, restaurar correctamente
if (!s.includes("showMainWindow();\n    return;\n  }\n  if (staticServer")) {
  s = s.replace(
`app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    return;
  }`,
`app.on('activate', () => {
  if (mainWindow) {
    showMainWindow();
    return;
  }`
  );
}

fs.writeFileSync(file, s, 'utf8');
console.log('Parche aplicado.');
'@

    $Temp = Join-Path $env:TEMP ("kaoru-keep-badge-" + [guid]::NewGuid().ToString() + ".cjs")
    Set-Content $Temp $patcher -Encoding UTF8

    node $Temp $Main

    if ($LASTEXITCODE -ne 0) {
        throw "El parche fallo."
    }

    node --check $Main

    if ($LASTEXITCODE -ne 0) {
        throw "desktop\main.cjs no paso node --check."
    }

    Write-Host ""
    Write-Host "[OK] Cierre inteligente instalado." -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora:" -ForegroundColor Cyan
    Write-Host "  X = minimiza Kaoru y conserva el badge"
    Write-Host "  El icono de bandeja puede volver a abrirla"
    Write-Host "  Bandeja > Salir completamente = cierra Kaoru de verdad"
    Write-Host "  Las actualizaciones siguen pudiendo reiniciar la app"
    Write-Host ""
    Write-Host "Prueba con:" -ForegroundColor Yellow
    Write-Host "  npm.cmd start" -ForegroundColor White
    Write-Host ""

    Remove-Item $Backup -Force -ErrorAction SilentlyContinue
    Remove-Item $Temp -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Restaurando desktop\main.cjs..." -ForegroundColor Yellow

    if (Test-Path $Backup) {
        Copy-Item $Backup $Main -Force
    }

    exit 1
}
