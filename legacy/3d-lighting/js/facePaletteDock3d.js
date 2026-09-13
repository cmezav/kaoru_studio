const KAORU_3D_FACE_PRESETS = [
  {
    id: 'club-blue-magenta',
    name: 'Club Blue Magenta',
    effect: 'Magenta sobre frente, nariz y labios; azul profundo hunde media cara y marca mandÃ­bula.',
    lights: [
      { color:'#FF1F8F', intensity:1.35, softness:.20, position:{x:-.28,y:-.30} },
      { color:'#173DFF', intensity:1.15, softness:.62, position:{x:.55,y:-.08} },
      { color:'#4FD8FF', intensity:.52, softness:.18, position:{x:.78,y:-.18} }
    ],
    palette: [
      ['Deep Night','#0A0B4F'],
      ['Electric Blue','#1C3BEB'],
      ['Club Violet','#2A0A78'],
      ['Hot Magenta','#D21478'],
      ['Blue Beam','#53B5FF']
    ]
  },
  {
    id: 'pink-green-editorial',
    name: 'Pink Green Editorial',
    effect: 'El magenta esculpe pÃ³mulos, nariz y labios; verde lateral separa sien, nariz y contorno.',
    lights: [
      { color:'#FF1EC8', intensity:1.55, softness:.24, position:{x:.16,y:-.36} },
      { color:'#72FF63', intensity:.72, softness:.32, position:{x:-.60,y:-.06} },
      { color:'#4A014A', intensity:.32, softness:.82, position:{x:0,y:.42} }
    ],
    palette: [
      ['Neon Fuchsia','#FF14B8'],
      ['Beauty Pink','#DB007C'],
      ['Acid Green','#74FF5C'],
      ['Plum Room','#3A0933'],
      ['Soft Skin','#F8B0B7']
    ]
  },
  {
    id: 'electric-blue-rim',
    name: 'Electric Blue Rim',
    effect: 'Luz de borde: dibuja nariz, labios, mentÃ³n, mandÃ­bula, cuello y silueta del cabello.',
    lights: [
      { color:'#1F63FF', intensity:1.60, softness:.26, position:{x:-.82,y:-.08} },
      { color:'#0A173D', intensity:.18, softness:.70, position:{x:.30,y:.08} }
    ],
    palette: [
      ['Electric Rim','#0C56F3'],
      ['Royal Blue','#1037A8'],
      ['Deep Navy','#09122D'],
      ['Blue Glow','#4776FF'],
      ['Pale Ice','#C9DFF9']
    ]
  },
  {
    id: 'icy-wet-portrait',
    name: 'Icy Wet Portrait',
    effect: 'Frontal frÃ­o que aclara piel; sombras finas del cabello atraviesan ojos, nariz y labios.',
    lights: [
      { color:'#E8F8FF', intensity:1.45, softness:.42, position:{x:.04,y:-.42} },
      { color:'#8FD3FF', intensity:.60, softness:.28, position:{x:0,y:-.72} },
      { color:'#356DFF', intensity:.24, softness:.46, position:{x:-.36,y:-.02} }
    ],
    palette: [
      ['Icy White','#EAF8FF'],
      ['Cool Mist','#C8ECF9'],
      ['Soft Cyan','#89B7D9'],
      ['Wet Shadow','#0D1525'],
      ['Lip Tint','#E9CAD3']
    ]
  }
];

function qsa(selector, root=document){
  try { return [...root.querySelectorAll(selector)]; }
  catch { return []; }
}

function normalizeText(value){
  return String(value || '').replace(/\s+/g,' ').trim().toLowerCase();
}

function textContains(el, value){
  return normalizeText(el?.textContent).includes(normalizeText(value));
}

function findProjectAnchor(){
  const candidates = qsa('button,div,span,strong,p,h1,h2,h3,h4,label');
  return candidates.find(el =>
    textContains(el,'guardar en galeria') ||
    textContains(el,'guardar en galerÃ­a')
  ) || candidates.find(el => textContains(el,'proyecto'));
}

function scoreRightPanel(el){
  if(!el || el === document.body || el === document.documentElement) return -999;
  const rect = el.getBoundingClientRect();
  if(rect.width < 220 || rect.width > 520 || rect.height < 300) return -999;

  let score = 0;
  if(rect.left > window.innerWidth * .62) score += 5;
  if(rect.right > window.innerWidth * .90) score += 4;
  if(/auto|scroll/.test(getComputedStyle(el).overflowY)) score += 3;
  if(textContains(el,'proyecto')) score += 4;
  if(textContains(el,'exportar')) score += 2;
  if(textContains(el,'galeria') || textContains(el,'galerÃ­a')) score += 2;
  return score;
}

function findRightProjectPanel(){
  const anchor = findProjectAnchor();
  const family = [];

  let node = anchor;
  for(let i=0; node && i<9; i++, node=node.parentElement){
    family.push(node);
  }

  const extras = [
    ...qsa('aside'),
    ...qsa('[class*="sidebar"]'),
    ...qsa('[class*="panel"]'),
    ...qsa('[class*="inspector"]')
  ];

  const unique = [...new Set([...family,...extras])];
  let best = null;
  let bestScore = -999;

  unique.forEach(el => {
    const score = scoreRightPanel(el);
    if(score > bestScore){
      best = el;
      bestScore = score;
    }
  });

  return bestScore >= 4 ? best : null;
}

function injectStyles(){
  if(document.getElementById('kaoru-3d-docked-palette-style')) return;

  const style = document.createElement('style');
  style.id = 'kaoru-3d-docked-palette-style';
  style.textContent = `
    #kaoru-3d-face-palette-dock{
      margin:18px 0 8px;
      padding:16px 0 2px;
      border-top:1px solid rgba(255,255,255,.10);
      color:inherit;
      font-family:inherit;
    }
    .k3d-pal-title{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:6px;
      font-size:12px;
      font-weight:900;
      text-transform:uppercase;
      letter-spacing:.05em;
    }
    .k3d-pal-sub{
      margin:0 0 12px;
      font-size:11px;
      line-height:1.4;
      opacity:.70;
    }
    .k3d-preset{
      border:1px solid rgba(255,255,255,.10);
      border-radius:12px;
      padding:9px;
      margin-bottom:9px;
      background:rgba(255,255,255,.035);
    }
    .k3d-preset-top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:7px;
    }
    .k3d-preset-name{
      font-size:11px;
      font-weight:800;
    }
    .k3d-apply{
      border:1px solid rgba(188,145,255,.32);
      background:rgba(156,95,255,.13);
      color:inherit;
      border-radius:8px;
      padding:4px 7px;
      font-size:10px;
      cursor:pointer;
    }
    .k3d-effect{
      font-size:10px;
      line-height:1.35;
      opacity:.72;
      margin-bottom:8px;
    }
    .k3d-swatches{
      display:grid;
      gap:5px;
    }
    .k3d-swatch{
      width:100%;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.035);
      color:inherit;
      border-radius:9px;
      padding:6px 7px;
      display:grid;
      grid-template-columns:17px minmax(0,1fr) auto;
      align-items:center;
      gap:7px;
      cursor:pointer;
      text-align:left;
    }
    .k3d-swatch:hover{
      border-color:rgba(188,145,255,.30);
      background:rgba(255,255,255,.07);
    }
    .k3d-dot{
      width:17px;height:17px;border-radius:50%;
      border:1px solid rgba(255,255,255,.22);
    }
    .k3d-color-name{
      font-size:10px;
      opacity:.68;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .k3d-hex{
      font-size:10px;
      font-weight:900;
      letter-spacing:.03em;
    }
    .k3d-status{
      min-height:15px;
      margin-top:8px;
      font-size:10px;
      color:#c8a4ff;
    }
    #kaoru-face-kit-panel{
      display:none !important;
    }
  `;
  document.head.appendChild(style);
}

async function copyHex(hex){
  try{
    await navigator.clipboard.writeText(hex);
    return true;
  }catch{}

  try{
    const input=document.createElement('textarea');
    input.value=hex;
    input.style.position='fixed';
    input.style.opacity='0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    return true;
  }catch{
    return false;
  }
}

function findAddLightButton(){
  const direct = document.querySelector(
    '#addLightBtn,[data-add-light],[data-action="add-light"],button[aria-label*="agregar luz" i],button[aria-label*="add light" i]'
  );
  if(direct) return direct;

  return qsa('button').find(btn => {
    const t=normalizeText(btn.textContent);
    return t.includes('agregar luz') || t.includes('aÃ±adir luz') || t.includes('add light') || t.includes('nueva luz');
  }) || null;
}

function findLightCards(){
  const selectors=[
    '#lightsList > *',
    '.lights-list > *',
    '.light-card',
    '.light-item',
    '.light-row',
    '[data-light-item]',
    '[data-light-row]'
  ];

  for(const selector of selectors){
    const items=qsa(selector);
    if(items.length) return items;
  }
  return [];
}

function setValue(input,value){
  if(!input) return false;
  input.value=String(value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

function labeledInput(card, patterns, types=[]){
  const inputs=qsa('input,select,textarea',card);

  const exact=inputs.find(input=>{
    const meta=[
      input.name,input.id,input.placeholder,
      input.dataset?.field,input.dataset?.label,
      input.getAttribute('aria-label')
    ].filter(Boolean).join(' ').toLowerCase();

    return patterns.some(rx=>rx.test(meta)) &&
      (!types.length || types.includes((input.type||'').toLowerCase()));
  });

  if(exact) return exact;

  return inputs.find(input =>
    !types.length || types.includes((input.type||'').toLowerCase())
  ) || null;
}

function applyCard(card,light){
  let touched=false;

  const color=card.querySelector('input[type="color"]') ||
    labeledInput(card,[/color|colour|hex/],['color','text']);
  if(color) touched=setValue(color,light.color)||touched;

  const intensity=labeledInput(card,[/intensity|power|strength|brightness|energ/],['range','number','text']);
  if(intensity) touched=setValue(intensity,light.intensity)||touched;

  const softness=labeledInput(card,[/soft|spread|radius|blur|falloff|size/],['range','number','text']);
  if(softness) touched=setValue(softness,light.softness)||touched;

  const x=labeledInput(card,[/posx|horizontal|\bx\b|left|right/],['range','number','text']);
  const y=labeledInput(card,[/posy|vertical|\by\b|top|bottom|up|down/],['range','number','text']);

  if(x) touched=setValue(x,light.position.x)||touched;
  if(y) touched=setValue(y,light.position.y)||touched;

  return touched;
}

function applyPreset(preset){
  let cards=findLightCards();
  const add=findAddLightButton();

  let guard=0;
  while(cards.length<preset.lights.length && add && guard<8){
    add.click();
    cards=findLightCards();
    guard++;
  }

  let touched=false;
  preset.lights.forEach((light,index)=>{
    if(cards[index]) touched=applyCard(cards[index],light)||touched;
  });

  try{
    window.__KAORU_PENDING_3D_FACE_PRESET__=preset;
    window.dispatchEvent(new CustomEvent('kaoru-3d-face-preset-applied',{detail:{preset}}));
  }catch{}

  return touched;
}

function makePresetCard(preset,status){
  const card=document.createElement('div');
  card.className='k3d-preset';

  const top=document.createElement('div');
  top.className='k3d-preset-top';

  const name=document.createElement('div');
  name.className='k3d-preset-name';
  name.textContent=preset.name;

  const apply=document.createElement('button');
  apply.type='button';
  apply.className='k3d-apply';
  apply.textContent='Aplicar';
  apply.addEventListener('click',()=>{
    const ok=applyPreset(preset);
    status.textContent=ok
      ? `Preset aplicado: ${preset.name}`
      : `Preset seleccionado: ${preset.name}. Si no cambia, baja a la secciÃ³n de luces y pruÃ©balo otra vez.`;
  });

  top.append(name,apply);

  const effect=document.createElement('div');
  effect.className='k3d-effect';
  effect.textContent=preset.effect;

  const swatches=document.createElement('div');
  swatches.className='k3d-swatches';

  preset.palette.forEach(([label,hex])=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='k3d-swatch';
    btn.title=`Copiar ${hex}`;

    btn.innerHTML=`
      <span class="k3d-dot" style="background:${hex}"></span>
      <span class="k3d-color-name">${label}</span>
      <span class="k3d-hex">${hex}</span>
    `;

    btn.addEventListener('click',async()=>{
      const ok=await copyHex(hex);
      status.textContent=ok ? `Copiado ${hex}` : `HEX: ${hex}`;
    });

    swatches.appendChild(btn);
  });

  card.append(top,effect,swatches);
  return card;
}

function mount(){
  injectStyles();

  const old=document.getElementById('kaoru-3d-face-palette-dock');
  if(old) old.remove();

  const right=findRightProjectPanel();

  if(!right){
    setTimeout(mount,700);
    return;
  }

  const dock=document.createElement('section');
  dock.id='kaoru-3d-face-palette-dock';

  const title=document.createElement('div');
  title.className='k3d-pal-title';
  title.innerHTML='<span>Luces + Paletas</span><span>HEX</span>';

  const sub=document.createElement('p');
  sub.className='k3d-pal-sub';
  sub.textContent='Presets de iluminaciÃ³n facial. Haz clic en cualquier color para copiar su HEX.';

  const status=document.createElement('div');
  status.className='k3d-status';

  dock.append(title,sub);

  KAORU_3D_FACE_PRESETS.forEach(preset=>{
    dock.appendChild(makePresetCard(preset,status));
  });

  dock.appendChild(status);
  right.appendChild(dock);

  try{
    right.scrollTop=right.scrollHeight;
  }catch{}
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,250),{once:true});
}else{
  setTimeout(mount,250);
}

window.addEventListener('load',()=>setTimeout(mount,450),{once:true});
