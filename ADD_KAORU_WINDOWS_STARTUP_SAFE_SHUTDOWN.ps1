$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Main = Join-Path $Root "desktop\main.cjs"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU - STARTUP + SAFE WINDOWS SHUTDOWN" -ForegroundColor Magenta
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
    Write-Host "  git switch -c feat/windows-startup" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$Backup = "$Main.startup-shutdown.bak"
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

// ------------------------------------------------------------
// 1) node:fs para guardar una marca de configuracion inicial
// ------------------------------------------------------------
if (!/require\(['"]node:fs['"]\)/.test(s)) {
  replaceRequired(
    /const\s+path\s*=\s*require\(['"]node:path['"]\)\s*;/,
    `const path = require('node:path');
const fs = require('node:fs');`,
    'require node:path'
  );
}

// ------------------------------------------------------------
// 2) Argumento especial usado cuando Windows inicia Kaoru
// ------------------------------------------------------------
if (!/const\s+STARTUP_ARG\s*=/.test(s)) {
  replaceRequired(
    /const\s+APP_ID\s*=\s*['"]com\.cmezav\.kaorustudio['"]\s*;/,
    `const APP_ID = 'com.cmezav.kaorustudio';
const STARTUP_ARG = '--kaoru-startup';`,
    'APP_ID'
  );
}

// ------------------------------------------------------------
// 3) Funciones de inicio con Windows
// ------------------------------------------------------------
if (!/function\s+setStartupEnabled\s*\(/.test(s)) {
  replaceRequired(
    /function\s+showMainWindow\s*\(\s*\)\s*\{/,
`function startupOptions() {
  return {
    path: process.execPath,
    args: [STARTUP_ARG]
  };
}

function startupSupported() {
  return process.platform === 'win32' && app.isPackaged;
}

function isStartupEnabled() {
  if (!startupSupported()) return false;

  try {
    const options = startupOptions();
    const settings = app.getLoginItemSettings(options);
    return Boolean(
      settings.openAtLogin ||
      settings.executableWillLaunchAtLogin
    );
  } catch (error) {
    console.error('[Kaoru Startup] No se pudo leer la configuracion:', error);
    return false;
  }
}

function setStartupEnabled(enabled) {
  if (!startupSupported()) return;

  try {
    const options = startupOptions();

    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: options.path,
      args: options.args,
      enabled: Boolean(enabled),
      name: 'Kaoru Studio'
    });
  } catch (error) {
    console.error('[Kaoru Startup] No se pudo cambiar la configuracion:', error);
  }
}

function configureStartupDefaultOnce() {
  if (!startupSupported()) return;

  const marker = path.join(
    app.getPath('userData'),
    '.kaoru-startup-configured-v1'
  );

  if (fs.existsSync(marker)) return;

  setStartupEnabled(true);

  try {
    fs.writeFileSync(
      marker,
      new Date().toISOString(),
      'utf8'
    );
  } catch (error) {
    console.error('[Kaoru Startup] No se pudo guardar la marca:', error);
  }
}

function showMainWindow() {`,
    'showMainWindow'
  );
}

// ------------------------------------------------------------
// 4) Menu de bandeja con toggle Abrir con Windows
// ------------------------------------------------------------
if (!/Abrir Kaoru al iniciar Windows/.test(s)) {
  replaceRequired(
    /\{\s*label:\s*['"]Abrir Kaoru Studio['"]\s*,\s*click:\s*\(\)\s*=>\s*showMainWindow\(\)\s*\}\s*,\s*\{\s*type:\s*['"]separator['"]\s*\}\s*,/,
`{
        label: 'Abrir Kaoru Studio',
        click: () => showMainWindow()
      },
      {
        label: 'Abrir Kaoru al iniciar Windows',
        type: 'checkbox',
        checked: isStartupEnabled(),
        enabled: startupSupported(),
        click: (menuItem) => {
          setStartupEnabled(menuItem.checked);
        }
      },
      { type: 'separator' },`,
    'menu Abrir Kaoru Studio'
  );
}

// ------------------------------------------------------------
// 5) Si Windows esta apagando/reiniciando/cerrando sesion,
//    NO interceptar el cierre con nuestra logica de minimizar.
// ------------------------------------------------------------
if (!/query-session-end/.test(s)) {
  replaceRequired(
    /\/\/ \[Kaoru\]\s*Cerrar\s*->\s*minimizar\.\s*[\s\S]*?mainWindow\.on\(\s*['"]close['"]\s*,\s*\(event\)\s*=>\s*\{/,
`// Windows esta terminando la sesion: respetar apagado/reinicio/logoff.
  mainWindow.on('query-session-end', () => {
    quitting = true;
  });

  mainWindow.on('session-end', () => {
    quitting = true;
  });

  // [Kaoru] Cerrar -> minimizar.
  // Mantener la ventana viva permite conservar el overlay de Windows.
  mainWindow.on('close', (event) => {`,
    'close handler'
  );
}

// ------------------------------------------------------------
// 6) Si fue iniciado por Windows, arrancar minimizado.
//    Manualmente sigue abriendo normal.
// ------------------------------------------------------------
replaceRequired(
  /mainWindow\.once\(\s*['"]ready-to-show['"]\s*,\s*\(\)\s*=>\s*\{\s*mainWindow\.show\(\)\s*;\s*\}\s*\)\s*;/,
`mainWindow.once('ready-to-show', () => {
    if (process.argv.includes(STARTUP_ARG)) {
      // Mostrar inactivo y minimizar para conservar el boton de taskbar
      // y permitir que aparezca el badge sin robar foco al iniciar Windows.
      mainWindow.showInactive();
      mainWindow.minimize();
      return;
    }

    mainWindow.show();
  });`,
  'ready-to-show'
);

// ------------------------------------------------------------
// 7) Activar por defecto una sola vez en la app instalada
// ------------------------------------------------------------
if (!/configureStartupDefaultOnce\(\);/.test(s)) {
  replaceRequired(
    /app\.whenReady\(\)\.then\(async\s*\(\)\s*=>\s*\{\s*await\s+boot\(\)\s*;/,
`app.whenReady().then(async () => {
  configureStartupDefaultOnce();
  await boot();`,
    'app.whenReady'
  );
}

fs.writeFileSync(file, s, 'utf8');
console.log('Parche startup + shutdown aplicado.');
'@

    $Temp = Join-Path $env:TEMP ("kaoru-startup-shutdown-" + [guid]::NewGuid().ToString() + ".cjs")
    Set-Content $Temp $Patcher -Encoding UTF8

    node $Temp $Main

    if ($LASTEXITCODE -ne 0) {
        throw "El parche fallo."
    }

    node --check $Main

    if ($LASTEXITCODE -ne 0) {
        throw "desktop\main.cjs no paso node --check."
    }

    Write-Host ""
    Write-Host "[OK] STARTUP + CIERRE SEGURO INSTALADOS." -ForegroundColor Green
    Write-Host ""
    Write-Host "Comportamiento final:" -ForegroundColor Cyan
    Write-Host "  X -> minimiza Kaoru y conserva el badge"
    Write-Host "  Apagar/reiniciar Windows -> Kaoru NO bloquea el cierre"
    Write-Host "  Inicio de Windows -> Kaoru arranca minimizada"
    Write-Host "  Bandeja -> puedes activar/desactivar 'Abrir Kaoru al iniciar Windows'"
    Write-Host "  Bandeja -> 'Salir completamente' sigue cerrando Kaoru de verdad"
    Write-Host ""
    Write-Host "IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "  La opcion de inicio automatico solo se registra en la app instalada."
    Write-Host "  npm.cmd start sirve para comprobar sintaxis/comportamiento, pero no registra inicio."
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
