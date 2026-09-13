const KEY='kaoru.eyedropper.history.v1';
const MAX=12;
const is3d=()=>location.pathname.includes('/3d-lighting/');
const panel=()=>is3d()
  ? document.querySelector('.three-panel.three-status,.three-status')
  : document.querySelector('.status-panel');
const canvas=()=>document.getElementById(is3d()?'threeCanvas':'previewCanvas');

function hex(v){
  v=String(v||'').trim().toUpperCase();
  if(/^#[0-9A-F]{6}$/.test(v)) return v;
  if(/^#[0-9A-F]{3}$/.test(v)) return '#'+[1,2,3].map(i=>v[i]+v[i]).join('');
  return null;
}
function rgb(r,g,b){
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function history(){
  try{return (JSON.parse(localStorage.getItem(KEY)||'[]')||[]).map(hex).filter(Boolean).slice(0,MAX)}
  catch{return []}
}
function save(h){try{localStorage.setItem(KEY,JSON.stringify(h.slice(0,MAX)))}catch{}}
function add(c){c=hex(c);if(!c)return;save([c,...history().filter(x=>x!==c)])}
async function copy(v){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(v);return true}}catch{}
  try{const t=document.createElement('textarea');t.value=v;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();return true}catch{return false}
}

function style(){
  if(document.getElementById('kaoru-eyedropper-css'))return;
  const s=document.createElement('style');
  s.id='kaoru-eyedropper-css';
  s.textContent=`
  .k-eye{margin:14px 0;padding:13px 0;border-top:1px solid var(--line,rgba(130,120,145,.18));border-bottom:1px solid var(--line,rgba(130,120,145,.18));color:inherit}
  .k-eye-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
  .k-eye-key{padding:3px 6px;border:1px solid var(--line,rgba(130,120,145,.22));border-radius:6px;background:rgba(127,90,240,.08);font-size:9px}
  .k-eye-p{margin:0 0 9px;font-size:9px;line-height:1.4;opacity:.65}
  .k-eye-btn{width:100%;min-height:34px;border:1px solid var(--lab-accent,var(--accent,#8b68ff));border-radius:9px;background:var(--lab-accent-soft,rgba(127,90,240,.12));color:inherit;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
  .k-eye-btn.active{background:rgba(127,90,240,.24)}
  .k-eye-current{width:100%;display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:9px;margin-top:9px;padding:7px;border:1px solid var(--line,rgba(130,120,145,.16));border-radius:9px;background:rgba(127,90,240,.035);color:inherit;cursor:pointer;text-align:left}
  .k-eye-current[hidden]{display:none!important}.k-eye-swatch{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.2)}
  .k-eye-label{font-size:9px;opacity:.65}.k-eye-hex{font-size:12px;font-weight:900;letter-spacing:.035em}
  .k-eye-small{margin:10px 0 5px;font-size:9px;font-weight:800;opacity:.65}
  .k-eye-history{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
  .k-eye-chip{position:relative;height:38px;padding:0;border:1px solid var(--line,rgba(130,120,145,.14));border-radius:8px;overflow:hidden;cursor:pointer}
  .k-eye-chip span:first-child{position:absolute;inset:0}.k-eye-chip b{position:absolute;left:3px;right:3px;bottom:3px;padding:2px;border-radius:4px;background:rgba(0,0,0,.58);color:#fff;font-size:7px;line-height:1;text-align:center}
  .k-eye-status{min-height:14px;margin-top:7px;font-size:8.5px;opacity:.66}
  .k-eye-sampling{cursor:crosshair!important}
  `;
  document.head.appendChild(s);
}

function mount(){
  if(document.getElementById('kaoruEyedropper'))return true;
  const p=panel();if(!p)return false;
  const e=document.createElement('section');
  e.id='kaoruEyedropper';e.className='k-eye';
  e.innerHTML=`
    <div class="k-eye-h"><span>Cuentagotas</span><span class="k-eye-key">I</span></div>
    <p class="k-eye-p">Actívalo y haz clic sobre la visualización. Clic en una muestra = copiar HEX.</p>
    <button id="kEyeBtn" class="k-eye-btn" type="button">◉ Activar cuentagotas</button>
    <button id="kEyeCurrent" class="k-eye-current" type="button" hidden>
      <span class="k-eye-swatch"></span><span class="k-eye-label">Último color</span><span class="k-eye-hex">#000000</span>
    </button>
    <div class="k-eye-small">Muestras recientes</div>
    <div id="kEyeHistory" class="k-eye-history"></div>
    <div id="kEyeStatus" class="k-eye-status">Tecla I para activar.</div>`;
  if(is3d()){
    const a=p.querySelector('.project-actions');
    a?a.insertAdjacentElement('afterend',e):p.prepend(e);
  }else{
    const c=document.getElementById('copyAllBtn');
    if(c&&c.parentElement===p)p.insertBefore(e,c);
    else{
      const lib=p.querySelector('#phase6Library');
      lib?lib.insertAdjacentElement('afterend',e):p.prepend(e);
    }
  }
  return true;
}

const E=()=>({
  root:document.getElementById('kaoruEyedropper'),
  btn:document.getElementById('kEyeBtn'),
  cur:document.getElementById('kEyeCurrent'),
  hist:document.getElementById('kEyeHistory'),
  status:document.getElementById('kEyeStatus')
});
const status=t=>{const e=E().status;if(e)e.textContent=t};

function renderCurrent(c){
  c=hex(c);const e=E().cur;if(!c||!e)return;
  e.hidden=false;e.dataset.hex=c;
  e.querySelector('.k-eye-swatch').style.background=c;
  e.querySelector('.k-eye-hex').textContent=c;
}
function renderHistory(){
  const w=E().hist;if(!w)return;w.replaceChildren();
  history().forEach(c=>{
    const b=document.createElement('button');b.type='button';b.className='k-eye-chip';b.title='Copiar '+c;
    b.innerHTML=`<span style="background:${c}"></span><b>${c}</b>`;
    b.onclick=async()=>status(await copy(c)?`${c} copiado.`:`No pude copiar ${c}.`);
    w.appendChild(b);
  });
}
function accept(c){
  c=hex(c);if(!c)return;add(c);renderCurrent(c);renderHistory();status(`${c} capturado. Clic en la muestra para copiar.`);
}

function sampleCanvas(ev){
  const c=canvas();if(!c)return null;
  const r=c.getBoundingClientRect();
  const px=(ev.clientX-r.left)/r.width;
  const py=(ev.clientY-r.top)/r.height;
  try{
    const ctx=c.getContext('2d');
    if(ctx){
      const d=ctx.getImageData(Math.floor(px*c.width),Math.floor(py*c.height),1,1).data;
      return rgb(d[0],d[1],d[2]);
    }
  }catch{}
  try{
    const gl=c.getContext('webgl2')||c.getContext('webgl');
    if(gl){
      const x=Math.max(0,Math.min(gl.drawingBufferWidth-1,Math.floor(px*gl.drawingBufferWidth)));
      const y=Math.max(0,Math.min(gl.drawingBufferHeight-1,gl.drawingBufferHeight-1-Math.floor(py*gl.drawingBufferHeight)));
      const d=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,d);
      return rgb(d[0],d[1],d[2]);
    }
  }catch{}
  return null;
}

function fallback(){
  const c=canvas();if(!c){status('No encontré el canvas de visualización.');return}
  const b=E().btn;b?.classList.add('active');c.classList.add('k-eye-sampling');status('Cuentagotas activo: haz clic sobre la visualización.');
  const done=()=>{b?.classList.remove('active');c.classList.remove('k-eye-sampling')};
  const click=ev=>{
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    const color=sampleCanvas(ev);done();
    color?accept(color):status('No pude leer ese píxel. Usa Chrome/Opera actualizado.');
  };
  c.addEventListener('click',click,{once:true,capture:true});
}

async function openPicker(){
  const b=E().btn;
  if(!('EyeDropper' in window)){fallback();return}
  try{
    b?.classList.add('active');status('Cuentagotas activo: haz clic sobre un color de la visualización.');
    const out=await new EyeDropper().open();
    if(out?.sRGBHex)accept(out.sRGBHex);
  }catch(err){
    if(err?.name!=='AbortError'){console.warn(err);fallback()}else status('Cuentagotas cancelado.');
  }finally{b?.classList.remove('active')}
}

function editable(t){return t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t?.isContentEditable}
function bind(){
  const e=E();if(!e.root||e.root.dataset.bound)return false;
  e.root.dataset.bound='1';renderHistory();const h=history();if(h[0])renderCurrent(h[0]);
  e.btn.onclick=openPicker;
  e.cur.onclick=async()=>{const c=e.cur.dataset.hex;if(c)status(await copy(c)?`${c} copiado.`:`No pude copiar ${c}.`)};
  document.addEventListener('keydown',ev=>{
    if(editable(ev.target)||ev.ctrlKey||ev.metaKey||ev.altKey)return;
    if(ev.key.toLowerCase()!=='i')return;
    ev.preventDefault();openPicker();
  });
  return true;
}

function boot(){
  style();
  const run=()=>mount()&&bind();
  if(run())return;
  const obs=new MutationObserver(()=>{if(run())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  let n=0;const timer=setInterval(()=>{n++;if(run()||n>40){clearInterval(timer);obs.disconnect()}},250);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
