$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Main = Join-Path $Root "desktop\main.cjs"
$Preload = Join-Path $Root "desktop\preload.cjs"
$Task = Join-Path $Root "legacy\task-studio\app.js"
$AppSrc = Join-Path $Root "app\src\app.tsx"
$AppDist = Join-Path $Root "app\dist\app.js"
$BadgeDir = Join-Path $Root "desktop\badges"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU STUDIO - BADGE PENDIENTES V3" -ForegroundColor Magenta
Write-Host "==================================================" -ForegroundColor DarkMagenta

$Branch = (git -C $Root branch --show-current).Trim()
if ($Branch -eq "main") {
  Write-Host "ERROR: No ejecutes esto en main." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $Main) -or -not (Test-Path $Task) -or -not (Test-Path $AppSrc) -or -not (Test-Path $AppDist)) {
  Write-Host "ERROR: Faltan archivos esperados del proyecto." -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

# Backups temporales
$Files = @($Main,$Task,$AppSrc,$AppDist)
foreach ($f in $Files) { Copy-Item $f "$f.v3bak" -Force }

try {
  # 1) Generar iconos 1..99 y 99+
  New-Item -ItemType Directory -Force -Path $BadgeDir | Out-Null
  Add-Type -AssemblyName System.Drawing

  function New-BadgePng([string]$Label, [string]$FileName) {
    $bmp = New-Object System.Drawing.Bitmap 64,64
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $fill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(222,209,247))
    $pen  = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90,34,24,50)), 3
    $text = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36,27,49))

    $g.FillEllipse($fill,3,3,58,58)
    $g.DrawEllipse($pen,3,3,58,58)

    if ($Label.Length -eq 1) { $size = 34 }
    elseif ($Label.Length -eq 2) { $size = 28 }
    else { $size = 20 }

    $font = New-Object System.Drawing.Font "Segoe UI", $size, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rect = New-Object System.Drawing.RectangleF 0,0,64,64
    $g.DrawString($Label,$font,$text,$rect,$format)
    $bmp.Save((Join-Path $BadgeDir $FileName), [System.Drawing.Imaging.ImageFormat]::Png)

    $format.Dispose(); $font.Dispose(); $text.Dispose(); $pen.Dispose(); $fill.Dispose(); $g.Dispose(); $bmp.Dispose()
  }

  1..99 | ForEach-Object { New-BadgePng "$_" "$_.png" }
  New-BadgePng "99+" "99plus.png"
  Write-Host "[OK] Iconos del badge generados." -ForegroundColor Green

  # 2) Preload seguro
@'
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kaoruDesktop', {
  setPendingBadge(count) {
    ipcRenderer.send('kaoru:set-pending-badge', count);
  }
});
'@ | Set-Content $Preload -Encoding UTF8

  # 3) Parchear archivos con Node
  $patcher = @'
const fs = require('fs');

const [mainFile, taskFile, srcFile, distFile] = process.argv.slice(2);

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); }
function mustReplace(s, re, replacement, label){
  if(!re.test(s)) throw new Error('No encontre: '+label);
  return s.replace(re,replacement);
}

// MAIN
let main = read(mainFile);

if(!main.includes("kaoru:set-pending-badge")){
  main = mustReplace(
    main,
    /const\s*\{\s*app,\s*BrowserWindow,\s*dialog\s*\}\s*=\s*require\(['"]electron['"]\);/,
    "const { app, BrowserWindow, dialog, ipcMain, nativeImage } = require('electron');",
    'import Electron main'
  );

  main = main.replace(
    /const\s+DESKTOP_BUILD\s*=\s*['"][^'"]+['"]\s*;/,
    "const DESKTOP_BUILD = () => app.getVersion();"
  );

  main = mustReplace(
    main,
    /let\s+updateCheckStarted\s*=\s*false\s*;/,
`let updateCheckStarted = false;

function setPendingTaskbarBadge(value) {
  if (process.platform !== 'win32') return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const count = Math.max(0, Math.floor(Number(value) || 0));

  if (count === 0) {
    mainWindow.setOverlayIcon(null, 'Sin tareas vencidas ni pendientes para hoy');
    return;
  }

  const fileName = count > 99 ? '99plus.png' : String(count) + '.png';
  const badgePath = path.join(__dirname, 'badges', fileName);
  const image = nativeImage.createFromPath(badgePath);

  if (image.isEmpty()) {
    console.warn('[Kaoru Pending Badge] No se pudo cargar:', badgePath);
    return;
  }

  mainWindow.setOverlayIcon(
    image.resize({ width: 16, height: 16, quality: 'best' }),
    count + (count === 1 ? ' tarea pendiente para hoy o vencida' : ' tareas pendientes para hoy o vencidas')
  );
}

ipcMain.on('kaoru:set-pending-badge', (event, count) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return;
  setPendingTaskbarBadge(count);
});`,
    'updateCheckStarted'
  );

  main = mustReplace(
    main,
    /webPreferences:\s*\{\s*nodeIntegration:\s*false,/,
`webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,`,
    'webPreferences'
  );

  main = main.replace(
    /encodeURIComponent\(DESKTOP_BUILD\)/g,
    'encodeURIComponent(DESKTOP_BUILD())'
  );
}
write(mainFile,main);

// TASK STUDIO
let task = read(taskFile);
if(!task.includes('attentionCount')){
  task = mustReplace(
    task,
    /if\(EMBEDDED\)window\.parent\.postMessage\(\{type:'kaoru:task-count',count:c\.pending\.length\},'\*'\);/,
`const attentionCount=state.tasks.filter(t=>{
    if(!t||t.completed||!t.dueAt)return false;
    const d=parseDue(t.dueAt);
    return d!==null&&d<=endOfToday();
  }).length;
  if(EMBEDDED)window.parent.postMessage({type:'kaoru:task-count',count:c.pending.length,attentionCount},'*');`,
    'postMessage task-count'
  );

  task = mustReplace(
    task,
    /\nfunction coursePendingCounts\(course\)\{/,
`\n// Mantiene el badge correcto si Kaoru queda abierta al cambiar de dia.
setInterval(()=>updateCounts(),60000);

function coursePendingCounts(course){`,
    'coursePendingCounts'
  );
}
write(taskFile,task);

// APP SRC
let src = read(srcFile);
if(!src.includes('setPendingBadge')){
  src = mustReplace(
    src,
    /else if\(data\.type==='kaoru:task-count'\)\{const count=Number\(data\.count\)\|\|0;document\.title=count>0\?'\('\+count\+'\) kaoru\\\\'s studio':'kaoru\\\\'s studio';\}/,
`else if(data.type==='kaoru:task-count'){
      const count=Number(data.count)||0;
      const attentionCount=Math.max(0,Number(data.attentionCount)||0);
      document.title=count>0?'('+count+') kaoru\\'s studio':'kaoru\\'s studio';
      try{(window as any).kaoruDesktop?.setPendingBadge?.(attentionCount)}catch(_){}
    }`,
    'app/src task-count'
  );
}
write(srcFile,src);

// APP DIST
let dist = read(distFile);
if(!dist.includes('setPendingBadge')){
  dist = mustReplace(
    dist,
    /else if \(data\.type === 'kaoru:task-count'\) \{\s*const count = Number\(data\.count\) \|\| 0;\s*document\.title = count > 0 \? '\(' \+ count \+ '\) kaoru\\\\'s studio' : 'kaoru\\\\'s studio';\s*\}/,
`else if (data.type === 'kaoru:task-count') {
            const count = Number(data.count) || 0;
            const attentionCount = Math.max(0, Number(data.attentionCount) || 0);
            document.title = count > 0 ? '(' + count + ') kaoru\\'s studio' : 'kaoru\\'s studio';
            try {
                window.kaoruDesktop?.setPendingBadge?.(attentionCount);
            }
            catch (_) { }
        }`,
    'app/dist task-count'
  );
}
write(distFile,dist);

console.log('Parche V3 aplicado.');
'@

  $temp = Join-Path $env:TEMP ("kaoru-badge-v3-" + [guid]::NewGuid().ToString() + ".cjs")
  Set-Content $temp $patcher -Encoding UTF8

  node $temp $Main $Task $AppSrc $AppDist
  if ($LASTEXITCODE -ne 0) { throw "El parche V3 fallo." }

  node --check $Main
  if ($LASTEXITCODE -ne 0) { throw "desktop\main.cjs tiene error de sintaxis." }

  node --check $Preload
  if ($LASTEXITCODE -ne 0) { throw "desktop\preload.cjs tiene error de sintaxis." }

  node --check $Task
  if ($LASTEXITCODE -ne 0) { throw "Task Studio tiene error de sintaxis." }

  node --check $AppDist
  if ($LASTEXITCODE -ne 0) { throw "app\dist\app.js tiene error de sintaxis." }

  Write-Host ""
  Write-Host "[OK] V3 instalado correctamente." -ForegroundColor Green
  Write-Host "Badge = vencidas anteriores + las que vencen hoy, siempre que no esten completadas." -ForegroundColor Cyan
  Write-Host "Se actualiza al cambiar tareas y tambien cada minuto." -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Ahora ejecuta:" -ForegroundColor Yellow
  Write-Host "npm.cmd start" -ForegroundColor White

  foreach ($f in $Files) { Remove-Item "$f.v3bak" -Force -ErrorAction SilentlyContinue }
  Remove-Item $temp -Force -ErrorAction SilentlyContinue
}
catch {
  Write-Host ""
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Restaurando archivos..." -ForegroundColor Yellow
  foreach ($f in $Files) {
    if (Test-Path "$f.v3bak") {
      Copy-Item "$f.v3bak" $f -Force
    }
  }
  exit 1
}
