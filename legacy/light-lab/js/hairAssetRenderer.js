import { activeLights, dominantLightVector } from './lightingEngine.js';
import { mixHex } from './colorUtils.js';

const PROFILES = {
  '1a': { label:'1A', family:'Liso fino', wave:.018, freq:.55, width:.28, length:.80, density:20, shine:.94, frizz:1 },
  '1b': { label:'1B', family:'Liso con cuerpo', wave:.035, freq:.72, width:.31, length:.80, density:22, shine:.86, frizz:2 },
  '1c': { label:'1C', family:'Liso grueso', wave:.055, freq:.90, width:.34, length:.79, density:24, shine:.76, frizz:2 },
  '2a': { label:'2A', family:'Ondulado suave', wave:.095, freq:1.25, width:.36, length:.78, density:24, shine:.82, frizz:3 },
  '2b': { label:'2B', family:'Ondulado', wave:.135, freq:1.75, width:.39, length:.77, density:26, shine:.76, frizz:4 },
  '2c': { label:'2C', family:'Ondulado profundo', wave:.170, freq:2.20, width:.42, length:.76, density:28, shine:.70, frizz:5 },
  '3a': { label:'3A', family:'Rizo suelto', wave:.200, freq:2.80, width:.43, length:.74, density:30, shine:.68, frizz:5 },
  '3b': { label:'3B', family:'Rizado', wave:.220, freq:3.60, width:.46, length:.72, density:32, shine:.62, frizz:6 },
  '3c': { label:'3C', family:'Rizo apretado', wave:.235, freq:4.75, width:.49, length:.69, density:35, shine:.56, frizz:7 },
  '4a': { label:'4A', family:'Coil definido', wave:.245, freq:5.90, width:.51, length:.66, density:38, shine:.52, frizz:8 },
  '4b': { label:'4B', family:'Patron Z', wave:.235, freq:7.10, width:.53, length:.63, density:42, shine:.48, frizz:9, zigzag:true },
  '4c': { label:'4C', family:'Zigzag denso', wave:.225, freq:8.60, width:.56, length:.60, density:46, shine:.44, frizz:10, zigzag:true }
};

const VIEWS = {
  front: { label:'Frente', width:1.04, x:0, flow:.92 },
  side: { label:'Costado', width:.82, x:.07, flow:.84 },
  back: { label:'Atras', width:1, x:0, flow:1 }
};

const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const profileFor = (id) => PROFILES[String(id || '1b').toLowerCase()] || PROFILES['1b'];
const viewFor = (id) => VIEWS[String(id || 'back').toLowerCase()] || VIEWS.back;

function rgb(hex){
  const raw=String(hex||'#777777').replace('#','');
  const full=raw.length===3?raw.split('').map(c=>c+c).join(''):raw;
  if(!/^[0-9a-fA-F]{6}$/.test(full)) return {r:119,g:119,b:119};
  return {r:parseInt(full.slice(0,2),16),g:parseInt(full.slice(2,4),16),b:parseInt(full.slice(4,6),16)};
}
function rgba(hex,a=1){const c=rgb(hex);return `rgba(${c.r},${c.g},${c.b},${a})`;}
function colorAt(colors,i,f='#777777'){return colors?.[i]||colors?.[colors.length-1]||f;}
function triangle(v){const w=((v%1)+1)%1;return 1-4*Math.abs(w-.5);}

function geom(width,height,p,view){
  const min=Math.min(width,height);
  const vc=viewFor(view);
  return {
    cx:width*(.5+vc.x),
    top:height*.105,
    bottom:height*(.105+p.length),
    w:min*p.width*vc.width,
    min,
    view:String(view||'back')
  };
}

function waveUnit(p,t,phase=0){
  const arg=t*p.freq+phase;
  return p.zigzag?triangle(arg):Math.sin(arg*Math.PI*2);
}
function outerHalf(p,g,t){
  const bell=Math.pow(Math.sin(Math.PI*clamp(t)),.58);
  const root=.22+.78*bell;
  const taper=1-clamp((t-.70)/.30)*.62;
  return g.w*Math.max(.18,root*taper);
}
function center(p,g,t){
  return g.cx+Math.sin((t*1.08+.09)*Math.PI)*g.w*p.wave*.20;
}
function backEdge(p,g,t,side){
  const edgeRipple=waveUnit(p,t,.13)*g.w*p.wave*.18;
  return {x:center(p,g,t)+side*(outerHalf(p,g,t)+edgeRipple),y:g.top+(g.bottom-g.top)*t};
}

function buildBackPath(ctx,p,g){
  const steps=p.freq>5?110:84;
  ctx.beginPath();
  for(let i=0;i<=steps;i++){const t=i/steps;const q=backEdge(p,g,t,-1);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}
  for(let i=steps;i>=0;i--){const t=i/steps;const q=backEdge(p,g,t,1);ctx.lineTo(q.x,q.y);}
  ctx.closePath();
}

function buildFrontPath(ctx,p,g){
  const crownY=g.top+g.min*.035;
  const faceTop=g.top+g.min*.095;
  const faceBottom=g.top+g.min*.50;
  const faceW=g.w*.56;
  const outerW=g.w*1.04;
  ctx.beginPath();
  ctx.moveTo(g.cx,crownY);
  ctx.bezierCurveTo(g.cx-outerW*.58,g.top,g.cx-outerW,g.top+g.min*.14,g.cx-outerW*.94,g.top+g.min*.34);
  ctx.bezierCurveTo(g.cx-outerW*1.02,g.top+g.min*.54,g.cx-outerW*.82,g.bottom-g.min*.08,g.cx-outerW*.22,g.bottom);
  ctx.bezierCurveTo(g.cx-outerW*.05,g.bottom-g.min*.20,g.cx-faceW*.72,faceBottom,g.cx-faceW*.65,faceTop);
  ctx.bezierCurveTo(g.cx-faceW*.30,g.top+g.min*.10,g.cx-faceW*.13,g.top+g.min*.07,g.cx,crownY);
  ctx.bezierCurveTo(g.cx+faceW*.13,g.top+g.min*.07,g.cx+faceW*.30,g.top+g.min*.10,g.cx+faceW*.65,faceTop);
  ctx.bezierCurveTo(g.cx+faceW*.72,faceBottom,g.cx+outerW*.05,g.bottom-g.min*.20,g.cx+outerW*.22,g.bottom);
  ctx.bezierCurveTo(g.cx+outerW*.82,g.bottom-g.min*.08,g.cx+outerW*1.02,g.top+g.min*.54,g.cx+outerW*.94,g.top+g.min*.34);
  ctx.bezierCurveTo(g.cx+outerW,g.top+g.min*.14,g.cx+outerW*.58,g.top,g.cx,crownY);
  ctx.closePath();
}

function buildSidePath(ctx,p,g){
  const s=1;
  const back=g.cx+g.w*.48;
  const front=g.cx-g.w*.62;
  ctx.beginPath();
  ctx.moveTo(g.cx-g.w*.22,g.top+g.min*.025);
  ctx.bezierCurveTo(g.cx-g.w*.70,g.top+g.min*.06,front,g.top+g.min*.22,g.cx-g.w*.38,g.top+g.min*.35);
  ctx.bezierCurveTo(g.cx-g.w*.16,g.top+g.min*.44,g.cx-g.w*.17,g.top+g.min*.60,g.cx-g.w*.08,g.bottom);
  ctx.bezierCurveTo(g.cx+g.w*.62,g.bottom-g.min*.04,g.cx+g.w*.92,g.top+g.min*.55,back,g.top+g.min*.28);
  ctx.bezierCurveTo(g.cx+g.w*.40,g.top+g.min*.09,g.cx+g.w*.06,g.top,g.cx-g.w*.22,g.top+g.min*.025);
  ctx.closePath();
}
function buildPath(ctx,p,g,view){
  if(view==='front') return buildFrontPath(ctx,p,g);
  if(view==='side') return buildSidePath(ctx,p,g);
  return buildBackPath(ctx,p,g);
}
function clipHair(ctx,p,g,view){buildPath(ctx,p,g,view);ctx.clip();}

function drawHeadGuide(ctx,g,view){
  const night=document.documentElement.dataset.theme==='night';
  const skin=night?'#7D6F72':'#D8B7A5';
  const shadow=night?'#4C4247':'#B48775';
  ctx.save();
  if(view==='front'){
    const cy=g.top+g.min*.31;
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(g.cx,cy,g.w*.36,g.min*.25,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(g.cx,cy+g.min*.045,g.w*.24,g.min*.18,0,0,Math.PI*2);ctx.fill();
  }else if(view==='side'){
    const cy=g.top+g.min*.30;
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(g.cx-g.w*.38,cy,g.w*.31,g.min*.24,-.08,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(g.cx-g.w*.66,cy-g.min*.02);ctx.lineTo(g.cx-g.w*.82,cy+g.min*.03);ctx.lineTo(g.cx-g.w*.64,cy+g.min*.075);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

function drawBase(ctx,width,height,colors,p,g,view,light){
  const shadow=colorAt(colors,2,'#241D22');
  const mid=colorAt(colors,7,colorAt(colors,6,'#777777'));
  const lightCol=colorAt(colors,11,mid);
  const hi=colorAt(colors,14,'#FFFFFF');
  const side=light?.x>=0?1:-1;
  const grad=ctx.createLinearGradient(g.cx-side*g.w,g.top,g.cx+side*g.w,g.bottom);
  grad.addColorStop(0,shadow);grad.addColorStop(.30,mixHex(shadow,mid,.52));grad.addColorStop(.56,mid);grad.addColorStop(.78,mixHex(mid,lightCol,.60));grad.addColorStop(.94,mixHex(lightCol,hi,.36));grad.addColorStop(1,lightCol);
  ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
}

function flowPoint(p,g,view,t,offset,phase){
  const y=g.top+(g.bottom-g.top)*t;
  if(view==='front'){
    const side=offset<0?-1:1;
    const o=Math.abs(offset);
    const rootX=g.cx+side*g.w*(.10+o*.12);
    const spread=g.w*(.22+o*.60)*Math.pow(Math.sin(Math.PI*clamp(t)),.60);
    const wave=waveUnit(p,t,phase)*g.w*p.wave*.62;
    return {x:rootX+side*spread+wave,y};
  }
  if(view==='side'){
    const spread=g.w*(.12+offset*.70)*Math.pow(Math.sin(Math.PI*clamp(t)),.60);
    const wave=waveUnit(p,t,phase)*g.w*p.wave*.72;
    return {x:g.cx+spread+wave,y};
  }
  const hw=outerHalf(p,g,t);
  const wave=waveUnit(p,t,phase)*g.w*p.wave*.72;
  return {x:center(p,g,t)+offset*hw*.82+wave,y};
}
function traceFlow(ctx,p,g,view,offset,phase,start=.02,end=.985){
  const steps=Math.max(52,Math.round(62+p.freq*8));ctx.beginPath();
  for(let i=0;i<=steps;i++){const t=start+(end-start)*(i/steps);const q=flowPoint(p,g,view,t,offset,phase);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}
}

function drawTexture(ctx,colors,p,g,view,light){
  const side=light?.x>=0?1:-1;
  ctx.save();clipHair(ctx,p,g,view);ctx.lineCap='round';ctx.lineJoin='round';
  const ribbons=Math.round(p.density*.62);
  for(let i=0;i<ribbons;i++){
    const u=i/Math.max(1,ribbons-1);const offset=-.92+u*1.84;const lit=(offset*side+1)*.5;
    const idx=lit<.25?3:lit<.50?6:lit<.76?9:11;
    traceFlow(ctx,p,g,view,offset,.11+i*.083);
    ctx.strokeStyle=rgba(colorAt(colors,idx),.28+(1-Math.abs(offset))*.22);
    ctx.lineWidth=Math.max(3.2,g.min*(.0068+(1-Math.abs(offset))*.004));ctx.stroke();
  }
  const fibers=p.density;
  for(let i=0;i<fibers;i++){
    const offset=-.94+(i/Math.max(1,fibers-1))*1.88;const lit=(offset*side+1)*.5;const idx=lit<.34?4:lit<.68?8:12;
    traceFlow(ctx,p,g,view,offset,.31+i*.117,.035,.96);
    ctx.strokeStyle=rgba(colorAt(colors,idx),.12+(i%4)*.028);ctx.lineWidth=Math.max(.7,g.min*.0015);ctx.stroke();
  }
  ctx.restore();
}

function drawSpecular(ctx,colors,p,g,view,light){
  const side=light?.x>=0?1:-1;const bands=p.freq<1?4:p.freq<3?5:p.freq<6?6:7;
  ctx.save();clipHair(ctx,p,g,view);ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.shadowColor=rgba(colorAt(colors,14,'#FFFFFF'),.30);ctx.shadowBlur=Math.max(5,g.min*.018);
  for(let i=0;i<bands;i++){
    const offset=view==='front'?(i%2?-1:1)*(.28+(i%3)*.15):side*(.20+i*(.55/Math.max(1,bands-1)));
    const start=.13+(i%3)*.07;const seg=p.freq<1?.46:p.freq<3?.31:p.freq<6?.20:.12;
    traceFlow(ctx,p,g,view,offset,1.7+i*.27,start,Math.min(.91,start+seg));
    ctx.strokeStyle=rgba(i%2?colorAt(colors,12):colorAt(colors,14),p.shine*(.34+(i%3)*.09));ctx.lineWidth=Math.max(2.4,g.min*(.005+(i%2)*.0018));ctx.stroke();
  }
  ctx.restore();
}

function drawLights(ctx,width,height,p,g,view,lighting){
  const ls=activeLights(lighting||{}).slice(0,6);if(!ls.length)return;
  ctx.save();clipHair(ctx,p,g,view);ctx.globalCompositeOperation='screen';
  ls.forEach((l)=>{const d=Number(l.direction||0)*Math.PI/180;const e=Number(l.elevation||0)*Math.PI/180;const inten=clamp(Number(l.intensity||0)/100);const soft=clamp(Number(l.softness||0)/100);const x=g.cx+Math.sin(d)*g.w*.85;const y=g.top+(g.bottom-g.top)*(.36-Math.sin(e)*.22);const r=g.w*(.62+soft*.82+inten*.18);const gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,rgba(l.color||'#FFFFFF',.10+inten*.36));gr.addColorStop(.36,rgba(l.color||'#FFFFFF',.05+inten*.18));gr.addColorStop(1,rgba(l.color||'#FFFFFF',0));ctx.fillStyle=gr;ctx.fillRect(0,0,width,height);});
  ctx.restore();
}

function drawRim(ctx,colors,p,g,view,light,lighting){
  const ls=activeLights(lighting||{});const rim=ls[0]?.color||colorAt(colors,15,'#FFFFFF');
  ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=rgba(mixHex(rim,colorAt(colors,15,'#FFFFFF'),.45),.50);ctx.lineWidth=Math.max(1.8,g.min*.0042);buildPath(ctx,p,g,view);ctx.stroke();ctx.restore();
}

function drawFlyaways(ctx,colors,p,g,view){
  ctx.save();ctx.lineCap='round';const n=p.frizz;
  for(let i=0;i<n;i++){const s=i%2?1:-1;const t=.15+((i*19)%64)/100;let q;if(view==='back')q=backEdge(p,g,t,s);else q=flowPoint(p,g,view,t,s*.88,i*.13);const len=g.w*(.12+(i%4)*.04);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.quadraticCurveTo(q.x+s*len*.75,q.y-len*.25,q.x+s*len,q.y+len*.04);ctx.strokeStyle=rgba(colorAt(colors,10+(i%3)),.26);ctx.lineWidth=Math.max(.8,g.min*.0015);ctx.stroke();}
  ctx.restore();
}

function drawStudy(ctx,width,height,colors,p,g,view,light){
  const side=light?.x>=0?1:-1;const labels=[
    ['SOMBRA / OCLUSION',-.58,.28,colorAt(colors,2)],['BASE / MEDIO TONO',0,.50,colorAt(colors,7)],['HIGHLIGHT',side*.46,.31,colorAt(colors,14)],['LUZ DE REBOTE',-side*.24,.76,colorAt(colors,10)],['RIM LIGHT',side*.88,.58,colorAt(colors,15)]
  ];
  ctx.save();clipHair(ctx,p,g,view);ctx.globalCompositeOperation='screen';ctx.lineCap='round';
  labels.forEach((it,i)=>{traceFlow(ctx,p,g,view,it[1],1.1+i*.63,Math.max(.06,it[2]-.13),Math.min(.94,it[2]+.16));ctx.strokeStyle=rgba(it[3],i===2||i===4?.62:.34);ctx.lineWidth=Math.max(5,g.w*(i===0?.085:i===2?.055:.045));ctx.stroke();});ctx.restore();
  const night=document.documentElement.dataset.theme==='night';ctx.save();ctx.font=`700 ${Math.max(10,Math.round(width*.0105))}px Inter,system-ui,sans-serif`;ctx.textBaseline='middle';labels.forEach((it,i)=>{const q=flowPoint(p,g,view,it[2],it[1],1.1+i*.63);const right=i===2||i===4;const x=right?width*.965:width*.035;const text=it[0];const tw=ctx.measureText(text).width;const pad=8;const bx=right?x-tw-pad*2:x;const by=height*(.17+i*.13);ctx.strokeStyle=rgba(it[3],.72);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(right?bx+tw+pad*2:bx,by+13);ctx.stroke();ctx.fillStyle=night?'rgba(13,12,17,.90)':'rgba(255,255,255,.94)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,by,tw+pad*2,26,9);else ctx.rect(bx,by,tw+pad*2,26);ctx.fill();ctx.fillStyle=night?'#fff':'#211D25';ctx.fillText(text,bx+pad,by+13);});ctx.restore();
}

function drawHeader(ctx,width,height,p,view,study){
  const night=document.documentElement.dataset.theme==='night';ctx.save();ctx.fillStyle=night?'rgba(255,255,255,.88)':'rgba(34,28,39,.82)';ctx.font=`800 ${Math.max(13,Math.round(width*.015))}px Inter,system-ui,sans-serif`;ctx.fillText(`CABELLO ${p.label} - ${p.family.toUpperCase()} - ${viewFor(view).label.toUpperCase()}`,width*.028,height*.055);ctx.font=`500 ${Math.max(10,Math.round(width*.0105))}px Inter,system-ui,sans-serif`;ctx.globalAlpha=.72;ctx.fillText(study==='map'?'Mapa de estudio de luz sobre el cabello':'Vista completa recoloreable + iluminacion activa',width*.028,height*.086);ctx.restore();
}

export function renderCompleteHairAsset(ctx,width,height,colors,lighting,textureId='1b',studyMode='render',hairView='back'){
  const p=profileFor(textureId);const view=['front','side','back'].includes(hairView)?hairView:'back';const g=geom(width,height,p,view);const light=dominantLightVector(lighting||{});
  drawHeadGuide(ctx,g,view);
  const layer=document.createElement('canvas');layer.width=width;layer.height=height;const l=layer.getContext('2d');
  l.save();buildPath(l,p,g,view);l.clip();drawBase(l,width,height,colors,p,g,view,light);l.restore();
  l.save();clipHair(l,p,g,view);const root=l.createRadialGradient(g.cx,g.top,0,g.cx,g.top+g.min*.12,g.w*1.15);root.addColorStop(0,rgba(colorAt(colors,1,'#171419'),.72));root.addColorStop(.62,rgba(colorAt(colors,3,'#302A32'),.20));root.addColorStop(1,rgba(colorAt(colors,3,'#302A32'),0));l.fillStyle=root;l.fillRect(0,0,width,height);l.restore();
  drawTexture(l,colors,p,g,view,light);drawSpecular(l,colors,p,g,view,light);drawLights(l,width,height,p,g,view,lighting);drawRim(l,colors,p,g,view,light,lighting);
  ctx.save();ctx.shadowColor=rgba(colorAt(colors,1,'#171419'),.30);ctx.shadowBlur=Math.max(12,g.min*.045);ctx.shadowOffsetY=g.min*.018;ctx.drawImage(layer,0,0);ctx.restore();
  drawFlyaways(ctx,colors,p,g,view);if(studyMode==='map')drawStudy(ctx,width,height,colors,p,g,view,light);drawHeader(ctx,width,height,p,view,studyMode);
}
