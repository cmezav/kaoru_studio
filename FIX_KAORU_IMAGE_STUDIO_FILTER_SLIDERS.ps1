$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Ui = Join-Path $Root "legacy\image-studio\js\ui.js"
$Main = Join-Path $Root "legacy\image-studio\js\main.js"
$Index = Join-Path $Root "legacy\image-studio\index.html"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU - FIX IMAGE STUDIO FILTER SLIDERS" -ForegroundColor Magenta
Write-Host " Base esperada: v2026.9.29" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host ""

foreach ($File in @($Ui,$Main,$Index)) {
    if (-not (Test-Path $File)) {
        Write-Host "ERROR: No encuentro $File" -ForegroundColor Red
        exit 1
    }
}

$Branch = (git -C $Root branch --show-current).Trim()
if (-not $Branch) {
    Write-Host "ERROR: No pude detectar la rama." -ForegroundColor Red
    exit 1
}

if ($Branch -eq "main") {
    Write-Host "ERROR: Estas en main." -ForegroundColor Red
    Write-Host "Primero ejecuta:" -ForegroundColor Yellow
    Write-Host "  git switch -c fix/image-studio-filter-sliders" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$BackupUi = "$Ui.slider-fix.bak"
$BackupMain = "$Main.slider-fix.bak"
$BackupIndex = "$Index.slider-fix.bak"

Copy-Item $Ui $BackupUi -Force
Copy-Item $Main $BackupMain -Force
Copy-Item $Index $BackupIndex -Force

try {
    $Patcher = @'
const fs = require('fs');

const uiPath = process.argv[2];
const mainPath = process.argv[3];
const indexPath = process.argv[4];

function requireContains(text, token, label) {
  if (!text.includes(token)) {
    throw new Error(`No encontre ${label}: ${token}`);
  }
}

let ui = fs.readFileSync(uiPath, 'utf8');
let main = fs.readFileSync(mainPath, 'utf8');
let index = fs.readFileSync(indexPath, 'utf8');

const marker = 'KAORU_IMAGE_SLIDER_STATE_FIX_V1';

if (!ui.includes(marker)) {
  requireContains(ui, "function build(container,state,onInput,onCommit)", 'firma antigua ImageUI.build');

  const start = ui.indexOf("function build(container,state,onInput,onCommit)");
  const end = ui.indexOf("\n  function sync(state)", start);
  if (start < 0 || end < 0) throw new Error('No pude aislar ImageUI.build');

  const replacement = `/* ${marker} */
  function resolveState(stateSource){
    return typeof stateSource==='function'?stateSource():stateSource
  }
  function build(container,stateSource,onInput,onCommit){
    container.innerHTML='';
    const key=container.dataset.group,defs=groups[key]||[];
    defs.forEach(def=>{
      const[label,path,min,max,step,suffix]=def,row=document.createElement('label');
      row.className='range-row';
      row.innerHTML=\`<span>\${label}</span><input type="range" min="\${min}" max="\${max}" step="\${step}" data-path="\${path}" data-no-exact-number="true"><output></output>\`;
      const input=row.querySelector('input'),output=row.querySelector('output');
      const initialState=resolveState(stateSource);
      input.value=get(initialState,path);
      output.textContent=fmt(input.value,suffix,step);
      input.addEventListener('input',()=>{
        const currentState=resolveState(stateSource);
        const value=Number(input.value);
        set(currentState,path,value);
        output.textContent=fmt(value,suffix,step);
        onInput(path,value)
      });
      input.addEventListener('change',()=>onCommit(path,Number(input.value)));
      container.appendChild(row)
    })
  }`;

  ui = ui.slice(0,start) + replacement + ui.slice(end);
}

if (!main.includes("ImageUI.build(el,()=>state")) {
  requireContains(
    main,
    "ImageUI.build(el,state,()=>previewFast(),path=>commit(`Ajuste: ${path}`))",
    'binding dinamico de sliders'
  );

  main = main.replace(
    "ImageUI.build(el,state,()=>previewFast(),path=>commit(`Ajuste: ${path}`))",
    "ImageUI.build(el,()=>state,()=>previewFast(),path=>commit(`Ajuste: ${path}`))"
  );
}

index = index.replace(
  "./js/ui.js?cache=image-import-recovery-v4-20260907",
  "./js/ui.js?cache=image-slider-state-fix-v1-20260927"
);

index = index.replace(
  "./js/main.js?cache=image-contour-blur-v2-20260907",
  "./js/main.js?cache=image-slider-state-fix-v1-20260927"
);

fs.writeFileSync(uiPath, ui, 'utf8');
fs.writeFileSync(mainPath, main, 'utf8');
fs.writeFileSync(indexPath, index, 'utf8');
console.log('Parche aplicado correctamente.');
'@

    $Temp = Join-Path $env:TEMP ("kaoru-image-slider-fix-" + [guid]::NewGuid().ToString() + ".cjs")
    Set-Content $Temp $Patcher -Encoding UTF8

    node $Temp $Ui $Main $Index
    if ($LASTEXITCODE -ne 0) { throw "El parche Node fallo." }

    node --check $Ui
    if ($LASTEXITCODE -ne 0) { throw "ui.js no paso node --check." }

    node --check $Main
    if ($LASTEXITCODE -ne 0) { throw "main.js no paso node --check." }

    git -C $Root diff --check
    if ($LASTEXITCODE -ne 0) { throw "git diff --check encontro problemas." }

    Write-Host ""
    Write-Host "[OK] IMAGE STUDIO FILTER SLIDERS CORREGIDOS." -ForegroundColor Green
    Write-Host ""
    Write-Host "Problema corregido:" -ForegroundColor Cyan
    Write-Host "  Los sliders conservaban una referencia al estado inicial."
    Write-Host "  Al importar/recuperar una imagen, Image Studio reemplazaba ese estado."
    Write-Host "  Por eso el numero del slider cambiaba, pero el renderer recibia otro estado."
    Write-Host ""
    Write-Host "Ahora:" -ForegroundColor Cyan
    Write-Host "  - Brillo / contraste / saturacion / exposicion actualizan el estado ACTUAL"
    Write-Host "  - Escala de grises / monocromo / sepia / invertir tambien"
    Write-Host "  - Nitidez, blur, grano y Lens Blur usan la misma referencia dinamica"
    Write-Host "  - Undo/Redo y recuperar proyecto no rompen otra vez los sliders"
    Write-Host ""
    Write-Host "Prueba con: npm.cmd start" -ForegroundColor Yellow
    Write-Host "Test rapido: Brillo +100 debe blanquear fuertemente la imagen." -ForegroundColor Yellow

    Remove-Item $BackupUi -Force -ErrorAction SilentlyContinue
    Remove-Item $BackupMain -Force -ErrorAction SilentlyContinue
    Remove-Item $BackupIndex -Force -ErrorAction SilentlyContinue
    Remove-Item $Temp -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Restaurando archivos..." -ForegroundColor Yellow
    if (Test-Path $BackupUi) { Copy-Item $BackupUi $Ui -Force }
    if (Test-Path $BackupMain) { Copy-Item $BackupMain $Main -Force }
    if (Test-Path $BackupIndex) { Copy-Item $BackupIndex $Index -Force }
    exit 1
}
