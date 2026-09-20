$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Main = Join-Path $Root "desktop\main.cjs"
$Preload = Join-Path $Root "desktop\preload.cjs"
$Task = Join-Path $Root "legacy\task-studio\app.js"
$BadgeDir = Join-Path $Root "desktop\badges"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU STUDIO - BADGE PENDIENTES V4" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host ""

$Branch = (git -C $Root branch --show-current).Trim()
if ($Branch -eq "main") {
    Write-Host "ERROR: Estas en main. Usa feat/taskbar-pending-badge." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Main) -or -not (Test-Path $Task)) {
    Write-Host "ERROR: No encuentro los archivos esperados." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$MainBackup = "$Main.v4bak"
$TaskBackup = "$Task.v4bak"
Copy-Item $Main $MainBackup -Force
Copy-Item $Task $TaskBackup -Force

try {
    # ---------------------------------------------------------
    # 1. Crear badges PNG 1..99 + 99+
    # ---------------------------------------------------------
    New-Item -ItemType Directory -Force -Path $BadgeDir | Out-Null
    Add-Type -AssemblyName System.Drawing

    function New-KaoruBadge([string]$Label, [string]$FileName) {
        $bmp = New-Object System.Drawing.Bitmap 64,64
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $g.Clear([System.Drawing.Color]::Transparent)

        $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(222,209,247))
        $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90,34,24,50)), 3
        $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36,27,49))

        $g.FillEllipse($fill,3,3,58,58)
        $g.DrawEllipse($pen,3,3,58,58)

        if ($Label.Length -eq 1) { $fontSize = 34 }
        elseif ($Label.Length -eq 2) { $fontSize = 28 }
        else { $fontSize = 20 }

        $font = New-Object System.Drawing.Font "Segoe UI", $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center

        $rect = New-Object System.Drawing.RectangleF 0,0,64,64
        $g.DrawString($Label,$font,$textBrush,$rect,$format)

        $bmp.Save((Join-Path $BadgeDir $FileName), [System.Drawing.Imaging.ImageFormat]::Png)

        $format.Dispose()
        $font.Dispose()
        $textBrush.Dispose()
        $pen.Dispose()
        $fill.Dispose()
        $g.Dispose()
        $bmp.Dispose()
    }

    1..99 | ForEach-Object { New-KaoruBadge "$_" "$_.png" }
    New-KaoruBadge "99+" "99plus.png"

    Write-Host "[OK] Badges 1..99 generados." -ForegroundColor Green

    # ---------------------------------------------------------
    # 2. Preload: escucha el postMessage de Task Studio
    # ---------------------------------------------------------
@'
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function normalizeCount(value) {
  const count = Math.floor(Number(value) || 0);
  return Math.max(0, count);
}

window.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type !== 'kaoru:task-count') return;
  if (!Object.prototype.hasOwnProperty.call(data, 'attentionCount')) return;

  ipcRenderer.send(
    'kaoru:set-pending-badge',
    normalizeCount(data.attentionCount)
  );
});

contextBridge.exposeInMainWorld('kaoruDesktop', {
  setPendingBadge(count) {
    ipcRenderer.send(
      'kaoru:set-pending-badge',
      normalizeCount(count)
    );
  }
});
'@ | Set-Content $Preload -Encoding UTF8

    # ---------------------------------------------------------
    # 3. Parchear main.cjs y Task Studio
    # ---------------------------------------------------------
    $Patcher = @'
const fs = require('fs');

const mainFile = process.argv[2];
const taskFile = process.argv[3];

let main = fs.readFileSync(mainFile, 'utf8');
let task = fs.readFileSync(taskFile, 'utf8');

function replaceExact(text, from, to, label) {
  if (!text.includes(from)) {
    throw new Error('No encontre: ' + label);
  }
  return text.replace(from, to);
}

// ---------------- MAIN.CJS ----------------
if (!main.includes("kaoru:set-pending-badge")) {
  main = replaceExact(
    main,
    "const { app, BrowserWindow, dialog } = require('electron');",
    "const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require('electron');",
    'import Electron'
  );

  main = main.replace(
    /const DESKTOP_BUILD = '[^']+';/,
    "const DESKTOP_BUILD = () => app.getVersion();"
  );

  main = replaceExact(
    main,
    "let updateCheckStarted = false;",
`let updateCheckStarted = false;

function setPendingTaskbarBadge(value) {
  if (process.platform !== 'win32') return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const count = Math.max(0, Math.floor(Number(value) || 0));

  if (count === 0) {
    mainWindow.setOverlayIcon(
      null,
      'Sin tareas vencidas ni pendientes para hoy'
    );
    return;
  }

  const fileName = count > 99
    ? '99plus.png'
    : String(count) + '.png';

  const badgePath = path.join(__dirname, 'badges', fileName);
  const image = nativeImage.createFromPath(badgePath);

  if (image.isEmpty()) {
    console.warn('[Kaoru Pending Badge] No se pudo cargar:', badgePath);
    return;
  }

  const overlay = image.resize({
    width: 16,
    height: 16,
    quality: 'best'
  });

  const description = count === 1
    ? '1 tarea pendiente para hoy o vencida'
    : String(count) + ' tareas pendientes para hoy o vencidas';

  mainWindow.setOverlayIcon(overlay, description);
}

ipcMain.on('kaoru:set-pending-badge', (event, count) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (event.sender !== mainWindow.webContents) return;

  setPendingTaskbarBadge(count);
});`,
    'updateCheckStarted'
  );

  main = replaceExact(
    main,
    "    nodeIntegration: false,",
    "    preload: path.join(__dirname, 'preload.cjs'),\n      nodeIntegration: false,",
    'nodeIntegration'
  );

  main = main.replace(
    "encodeURIComponent(DESKTOP_BUILD)",
    "encodeURIComponent(DESKTOP_BUILD())"
  );
}

// ---------------- TASK STUDIO ----------------
if (!task.includes('attentionCount')) {
  const oldLine =
    "  if(EMBEDDED)window.parent.postMessage({type:'kaoru:task-count',count:c.pending.length},'*');";

  const newBlock =
`  const attentionCount=state.tasks.filter(t=>{
    if(!t||t.completed||!t.dueAt)return false;
    const d=parseDue(t.dueAt);
    return d!==null&&d<=endOfToday();
  }).length;
  if(EMBEDDED)window.parent.postMessage({
    type:'kaoru:task-count',
    count:c.pending.length,
    attentionCount
  },'*');`;

  task = replaceExact(
    task,
    oldLine,
    newBlock,
    'postMessage de Task Studio'
  );

  const marker = "function coursePendingCounts(course){";

  task = replaceExact(
    task,
    marker,
`// Recalcula tambien si cambia el dia mientras Kaoru sigue abierta.
setInterval(()=>updateCounts(),60000);

${marker}`,
    'coursePendingCounts'
  );
}

fs.writeFileSync(mainFile, main, 'utf8');
fs.writeFileSync(taskFile, task, 'utf8');

console.log('Parche V4 aplicado.');
'@

    $Temp = Join-Path $env:TEMP ("kaoru-badge-v4-" + [guid]::NewGuid().ToString() + ".cjs")
    Set-Content $Temp $Patcher -Encoding UTF8

    node $Temp $Main $Task
    if ($LASTEXITCODE -ne 0) {
        throw "El parche V4 fallo."
    }

    # ---------------------------------------------------------
    # 4. Verificaciones
    # ---------------------------------------------------------
    node --check $Main
    if ($LASTEXITCODE -ne 0) {
        throw "desktop\main.cjs tiene error de sintaxis."
    }

    node --check $Preload
    if ($LASTEXITCODE -ne 0) {
        throw "desktop\preload.cjs tiene error de sintaxis."
    }

    node --check $Task
    if ($LASTEXITCODE -ne 0) {
        throw "legacy\task-studio\app.js tiene error de sintaxis."
    }

    Write-Host ""
    Write-Host "[OK] BADGE V4 INSTALADO CORRECTAMENTE." -ForegroundColor Green
    Write-Host ""
    Write-Host "Cuenta:" -ForegroundColor Cyan
    Write-Host "  vencidas anteriores sin completar"
    Write-Host "  + las que vencen hoy sin completar"
    Write-Host ""
    Write-Host "No cuenta tareas futuras, completadas o sin fecha."
    Write-Host ""
    Write-Host "Prueba con:" -ForegroundColor Yellow
    Write-Host "  npm.cmd start" -ForegroundColor White
    Write-Host ""

    Remove-Item $MainBackup -Force -ErrorAction SilentlyContinue
    Remove-Item $TaskBackup -Force -ErrorAction SilentlyContinue
    Remove-Item $Temp -Force -ErrorAction SilentlyContinue

    # Limpia backups dejados por intentos V3 fallidos.
    Remove-Item "$Main.v3bak" -Force -ErrorAction SilentlyContinue
    Remove-Item "$Task.v3bak" -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $Root "app\src\app.tsx.v3bak") -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $Root "app\dist\app.js.v3bak") -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Restaurando archivos originales..." -ForegroundColor Yellow

    if (Test-Path $MainBackup) {
        Copy-Item $MainBackup $Main -Force
    }

    if (Test-Path $TaskBackup) {
        Copy-Item $TaskBackup $Task -Force
    }

    exit 1
}
