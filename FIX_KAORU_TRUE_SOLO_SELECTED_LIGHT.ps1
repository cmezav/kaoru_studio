$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$ThreeMain = Join-Path $Root "legacy\3d-lighting\js\main.js"
$LightMain = Join-Path $Root "legacy\light-lab\js\main.js"

Write-Host ""
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host " KAORU - TRUE SOLO SELECTED LIGHT" -ForegroundColor Magenta
Write-Host " Base esperada: v2026.9.28" -ForegroundColor DarkGray
Write-Host "==================================================" -ForegroundColor DarkMagenta
Write-Host ""

if (-not (Test-Path $ThreeMain)) { throw "No encuentro legacy\3d-lighting\js\main.js" }
if (-not (Test-Path $LightMain)) { throw "No encuentro legacy\light-lab\js\main.js" }

$Branch = (git -C $Root branch --show-current).Trim()
if ($Branch -eq "main") {
    Write-Host "ERROR: Estas en main." -ForegroundColor Red
    Write-Host "Ejecuta primero: git switch -c fix/true-solo-selected-light" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Rama: $Branch" -ForegroundColor Green

$Backup3d = "$ThreeMain.true-solo.bak"
$BackupLight = "$LightMain.true-solo.bak"
Copy-Item $ThreeMain $Backup3d -Force
Copy-Item $LightMain $BackupLight -Force

try {
$Patcher = @'
const fs=require('fs');

function appendPatch(file, marker, code, required){
  let s=fs.readFileSync(file,'utf8');
  if(s.includes(marker)){
    console.log('[SKIP] Ya aplicado:',file);
    return;
  }
  for(const token of required){
    if(!s.includes(token)) throw new Error(`No encontre "${token}" en ${file}`);
  }
  if(!s.endsWith('\n')) s+='\n';
  s+='\n'+code.trim()+'\n';
  fs.writeFileSync(file,s,'utf8');
  console.log('[OK] Parche aplicado:',file);
}

const three=String.raw`
// ============================================================
// KAORU_TRUE_SOLO_SELECTED_LIGHT_V1
// ============================================================
let kaoruTrueSoloSnapshot3d=null;

function kaoruTrueSoloActivate3d(){
  const state=store.getState();
  const lighting=state?.lighting;
  const selectedId=lighting?.selectedLightId;
  const selected=lighting?.lights?.find(light=>light.id===selectedId);
  if(!lighting||!selected)return;

  kaoruTrueSoloSnapshot3d={
    lights:lighting.lights.map(light=>[light.id,Boolean(light.enabled)]),
    ambient:structuredClone(lighting.ambient),
    shadow:structuredClone(lighting.shadow),
    bounce:structuredClone(lighting.bounce),
    rim:structuredClone(lighting.rim),
    projector:lighting.projector?structuredClone(lighting.projector):null
  };

  kaoruSoloRestore3d=kaoruTrueSoloSnapshot3d.lights.map(([id,enabled])=>[id,enabled]);
  kaoruSoloActiveId3d=selectedId;
  kaoruApplyingSolo3d=true;

  try{
    store.setState(draft=>{
      const current=draft.lighting;
      current.enabled=true;
      current.selectedLightId=selectedId;
      current.lights=current.lights.map(light=>({...light,enabled:light.id===selectedId}));
      if(current.ambient)current.ambient={...current.ambient,intensity:0};
      if(current.shadow)current.shadow={...current.shadow,intensity:0};
      if(current.bounce)current.bounce={...current.bounce,intensity:0};
      if(current.rim)current.rim={...current.rim,intensity:0};
      if(current.projector)current.projector={...current.projector,enabled:false,intensity:0};
      return draft;
    });
  }finally{
    kaoruApplyingSolo3d=false;
  }
}

function kaoruTrueSoloRestore3d(){
  const snap=kaoruTrueSoloSnapshot3d;
  if(!snap)return;
  const enabledById=new Map(snap.lights);
  kaoruApplyingSolo3d=true;
  try{
    store.setState(draft=>{
      const current=draft.lighting;
      current.lights=current.lights.map(light=>enabledById.has(light.id)?{...light,enabled:enabledById.get(light.id)}:light);
      current.ambient=structuredClone(snap.ambient);
      current.shadow=structuredClone(snap.shadow);
      current.bounce=structuredClone(snap.bounce);
      current.rim=structuredClone(snap.rim);
      if(snap.projector)current.projector=structuredClone(snap.projector);
      return draft;
    });
  }finally{
    kaoruApplyingSolo3d=false;
    kaoruTrueSoloSnapshot3d=null;
    kaoruSoloRestore3d=null;
    kaoruSoloActiveId3d=null;
  }
}

document.getElementById('soloSelectedLight3d')?.addEventListener(
  'click',
  event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(kaoruTrueSoloSnapshot3d)kaoruTrueSoloRestore3d();
    else kaoruTrueSoloActivate3d();
  },
  true
);
`;

const light=String.raw`
// ============================================================
// KAORU_TRUE_SOLO_SELECTED_LIGHT_V1
// ============================================================
let kaoruTrueSoloSnapshotLight=null;

function kaoruTrueSoloActivateLight(){
  const state=store.getState();
  const lighting=state?.lighting;
  const selectedId=lighting?.selectedLightId;
  const selected=lighting?.lights?.find(light=>light.id===selectedId);
  if(!lighting||!selected)return;

  kaoruTrueSoloSnapshotLight={
    lights:lighting.lights.map(light=>[light.id,Boolean(light.enabled)]),
    ambient:structuredClone(lighting.ambient),
    shadow:structuredClone(lighting.shadow),
    bounce:structuredClone(lighting.bounce),
    rim:structuredClone(lighting.rim),
    projector:lighting.projector?structuredClone(lighting.projector):null
  };

  kaoruSoloRestoreLight=kaoruTrueSoloSnapshotLight.lights.map(([id,enabled])=>[id,enabled]);
  kaoruSoloActiveIdLight=selectedId;
  kaoruApplyingSoloLight=true;

  try{
    store.setState(draft=>{
      const current=draft.lighting;
      current.enabled=true;
      current.selectedLightId=selectedId;
      current.lights=current.lights.map(light=>({...light,enabled:light.id===selectedId}));
      if(current.ambient)current.ambient={...current.ambient,intensity:0};
      if(current.shadow)current.shadow={...current.shadow,intensity:0};
      if(current.bounce)current.bounce={...current.bounce,intensity:0};
      if(current.rim)current.rim={...current.rim,intensity:0};
      if(current.projector)current.projector={...current.projector,enabled:false,intensity:0};
      return draft;
    });
  }finally{
    kaoruApplyingSoloLight=false;
  }
}

function kaoruTrueSoloRestoreLight(){
  const snap=kaoruTrueSoloSnapshotLight;
  if(!snap)return;
  const enabledById=new Map(snap.lights);
  kaoruApplyingSoloLight=true;
  try{
    store.setState(draft=>{
      const current=draft.lighting;
      current.lights=current.lights.map(light=>enabledById.has(light.id)?{...light,enabled:enabledById.get(light.id)}:light);
      current.ambient=structuredClone(snap.ambient);
      current.shadow=structuredClone(snap.shadow);
      current.bounce=structuredClone(snap.bounce);
      current.rim=structuredClone(snap.rim);
      if(snap.projector)current.projector=structuredClone(snap.projector);
      return draft;
    });
  }finally{
    kaoruApplyingSoloLight=false;
    kaoruTrueSoloSnapshotLight=null;
    kaoruSoloRestoreLight=null;
    kaoruSoloActiveIdLight=null;
  }
}

document.getElementById('soloSelectedLight')?.addEventListener(
  'click',
  event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(kaoruTrueSoloSnapshotLight)kaoruTrueSoloRestoreLight();
    else kaoruTrueSoloActivateLight();
  },
  true
);
`;

appendPatch(
  process.argv[2],
  'KAORU_TRUE_SOLO_SELECTED_LIGHT_V1',
  three,
  ['kaoruSoloRestore3d','kaoruSoloActiveId3d','kaoruApplyingSolo3d','soloSelectedLight3d']
);
appendPatch(
  process.argv[3],
  'KAORU_TRUE_SOLO_SELECTED_LIGHT_V1',
  light,
  ['kaoruSoloRestoreLight','kaoruSoloActiveIdLight','kaoruApplyingSoloLight','soloSelectedLight']
);
'@

$Temp = Join-Path $env:TEMP ("kaoru-true-solo-" + [guid]::NewGuid().ToString() + ".cjs")
Set-Content $Temp $Patcher -Encoding UTF8
node $Temp $ThreeMain $LightMain
if ($LASTEXITCODE -ne 0) { throw "El parche Node fallo." }

node --check $ThreeMain
if ($LASTEXITCODE -ne 0) { throw "3D main.js no paso node --check." }

node --check $LightMain
if ($LASTEXITCODE -ne 0) { throw "Light Lab main.js no paso node --check." }

git -C $Root diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check encontro problemas." }

Write-Host ""
Write-Host "[OK] TRUE SOLO SELECTED LIGHT INSTALADO." -ForegroundColor Green
Write-Host "3D + Light Lab ahora aislan la luz seleccionada y silencian el ambiente." -ForegroundColor Cyan
Write-Host "Al restaurar, vuelven exactamente las luces y el ambiente anteriores." -ForegroundColor Cyan
Write-Host ""
Write-Host "Prueba con: npm.cmd start" -ForegroundColor Yellow

Remove-Item $Backup3d -Force -ErrorAction SilentlyContinue
Remove-Item $BackupLight -Force -ErrorAction SilentlyContinue
Remove-Item $Temp -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Restaurando archivos..." -ForegroundColor Yellow
    if (Test-Path $Backup3d) { Copy-Item $Backup3d $ThreeMain -Force }
    if (Test-Path $BackupLight) { Copy-Item $BackupLight $LightMain -Force }
    exit 1
}
