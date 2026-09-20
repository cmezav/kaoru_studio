$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Main = Join-Path $Root "desktop\main.cjs"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU STUDIO - KEEP BADGE ON CLOSE V2" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host ""

if (-not (Test-Path $Main)) {
    Write-Host "ERROR: No encuentro desktop\main.cjs." -ForegroundColor Red
    exit 1
}

$Branch = (git -C $Root branch --show-current).Trim()

if ($Branch -eq "main") {
    Write-Host "ERROR: Estas en main." -ForegroundColor Red
    Write-Host "Usa una rama, por ejemplo:" -ForegroundColor Yellow
    Write-Host "  git switch -c fix/keep-badge-on-close" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$Backup = "$Main.keep-badge-v2.bak"
Copy-Item $Main $Backup -Force

try {
    $Patcher = @'
const fs = require('fs');

const file = process.argv[2];
let s = fs.readFileSync(file, 'utf8');

function replaceRequired(regex, replacement, label) {
  if (!regex.test(s)) {
    throw new Error('No encontre: ' + label);
  }
  s = s.replace(regex, replacement);
}

// 1. Electron imports
if (!/\bTray\b/.test(s) || !/\bMenu\b/.test(s)) {
  replaceRequired(
    /const\s*\{\s*app\s*,\s*BrowserWindow\s*,\s*dialog\s*,\s*ipcMain\s*,\s*nativeImage\s*\}\s*=\s*require\(\s*['"]electron['"]\s*\)\s*;/,
    "const { app, BrowserWindow, dialog, ipcMain, nativeImage, Tray, Menu } = require('electron');",
    'import de Electron'
  );
}

// 2. Variable global del tray
if (!/let\s+tray\s*=\s*null\s*;/.test(s)) {
  replaceRequired(
    /let\s+updateCheckStarted\s*=\s*false\s*;/,
    `let updateCheckStarted = false;
let tray = null;`,
    'updateCheckStarted'
  );
}

// 3. Funciones de restauracion y bandeja
if (!/function\s+showMainWindow\s*\(/.test(s)) {
  replaceRequired(
    /function\s+configureAutoUpdates\s*\(\s*\)\s*\{/,
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

// 4. Crear el tray al crear la ventana
if (!/function\s+createWindow\s*\(\s*origin\s*,\s*rootDir\s*\)\s*\{\s*ensureTray\s*\(\s*rootDir\s*\)\s*;/.test(s)) {
  replaceRequired(
    /function\s+createWindow\s*\(\s*origin\s*,\s*rootDir\s*\)\s*\{/,
`function createWindow(origin, rootDir) {
  ensureTray(rootDir);`,
    'createWindow'
  );
}

// 5. Al pulsar X, minimizar y conservar la ventana/badge
if (!/\[Kaoru\]\s*Cerrar\s*->\s*minimizar/.test(s)) {
  replaceRequired(
    /mainWindow\.once\s*\(\s*['"]ready-to-show['"]\s*,\s*\(\s*\)\s*=>\s*\{\s*mainWindow\.show\s*\(\s*\)\s*;\s*\}\s*\)\s*;/,
`mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // [Kaoru] Cerrar -> minimizar.
  // Mantener la ventana viva permite conservar el overlay de Windows.
  mainWindow.on('close', (event) => {
    if (quitting) return;

    event.preventDefault();
    mainWindow.minimize();
  });`,
    'ready-to-show'
  );
}

// 6. Segunda instancia: restaurar correctamente
s = s.replace(
  /if\s*\(\s*!mainWindow\s*\)\s*return\s*;\s*if\s*\(\s*mainWindow\.isMinimized\(\)\s*\)\s*mainWindow\.restore\(\)\s*;\s*mainWindow\.show\(\)\s*;\s*mainWindow\.focus\(\)\s*;/,
  `if (!mainWindow) return;
    showMainWindow();`
);

// 7. Evento activate: restaurar correctamente
s = s.replace(
  /app\.on\(\s*['"]activate['"]\s*,\s*\(\s*\)\s*=>\s*\{\s*if\s*\(\s*mainWindow\s*\)\s*\{\s*mainWindow\.show\(\)\s*;\s*return\s*;/,
  `app.on('activate', () => {
  if (mainWindow) {
    showMainWindow();
    return;`
);

fs.writeFileSync(file, s, 'utf8');
console.log('Parche V2 aplicado correctamente.');
'@

    $Temp = Join-Path $env:TEMP ("kaoru-keep-badge-v2-" + [guid]::NewGuid().ToString() + ".cjs")
    Set-Content $Temp $Patcher -Encoding UTF8

    node $Temp $Main

    if ($LASTEXITCODE -ne 0) {
        throw "El parche V2 fallo."
    }

    node --check $Main

    if ($LASTEXITCODE -ne 0) {
        throw "desktop\main.cjs no paso la verificacion de sintaxis."
    }

    Write-Host ""
    Write-Host "[OK] KEEP BADGE ON CLOSE V2 INSTALADO." -ForegroundColor Green
    Write-Host ""
    Write-Host "Comportamiento:" -ForegroundColor Cyan
    Write-Host "  X -> minimiza Kaoru, no mata el proceso"
    Write-Host "  El badge permanece en la barra de tareas"
    Write-Host "  Click en Kaoru -> vuelve a abrir/restaurar"
    Write-Host "  Bandeja del sistema -> Salir completamente"
    Write-Host ""
    Write-Host "Prueba ahora:" -ForegroundColor Yellow
    Write-Host "  npm.cmd start" -ForegroundColor White
    Write-Host ""

    Remove-Item $Backup -Force -ErrorAction SilentlyContinue
    Remove-Item $Temp -Force -ErrorAction SilentlyContinue

    # Limpieza del backup dejado por el intento anterior.
    Remove-Item "$Main.keep-badge.bak" -Force -ErrorAction SilentlyContinue
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
