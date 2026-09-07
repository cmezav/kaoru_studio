const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

const cleanHex=(value,fallback)=>{
  const text=String(value||'').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(text)?text:fallback;
};

export const LIGHT_PROJECTOR_TYPES=[
  'none','glow','flash','split','neon','stripe','window','leaves','blinds',
  'bokeh','circles','sparkles','rim','iridescent','rainbow','underwater','caustics'
];

export function normalizeLightProjector(value={}){
  const type=LIGHT_PROJECTOR_TYPES.includes(String(value.type||'none'))
    ?String(value.type||'none')
    :'none';

  const rawIntensity=Number(value.intensity??value.opacity??0);
  const intensity=rawIntensity<=1?rawIntensity*100:rawIntensity;
  const rawScale=Number(value.scale??100);
  const scale=rawScale<=3?rawScale*100:rawScale;

  return{
    enabled:value.enabled!==false&&type!=='none'&&intensity>0,
    type,
    colorA:cleanHex(value.colorA,'#FFFFFF'),
    colorB:cleanHex(value.colorB,'#7C3AED'),
    intensity:clamp(intensity,0,100),
    angle:clamp(value.angle??0,-180,180),
    scale:clamp(scale,20,300),
    blur:clamp(value.blur??8,0,100),
    offsetX:clamp(value.offsetX??0,-100,100),
    offsetY:clamp(value.offsetY??0,-100,100),
    contrast:clamp(value.contrast??70,0,100),
    density:clamp(value.density??50,0,100),
    lightId:value.lightId||null
  };
}

export function projectorFromEffect(effect={}){
  return normalizeLightProjector({
    ...effect,
    intensity:effect.intensity??effect.opacity??0
  });
}

export function projectorIsMulticolor(type){
  return[
    'split','neon','iridescent','rainbow','underwater','caustics'
  ].includes(type);
}

export function lightProjectorSignature(value={}){
  const p=normalizeLightProjector(value);
  return JSON.stringify([
    p.enabled,p.type,p.colorA,p.colorB,p.intensity,p.angle,p.scale,
    p.blur,p.offsetX,p.offsetY,p.contrast,p.density,p.lightId
  ]);
}

function hashSeed(text){
  let hash=2166136261;
  for(const char of String(text||'')){
    hash^=char.charCodeAt(0);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

function seededRandom(seed){
  let state=seed>>>0;
  return()=>{
    state+=0x6D2B79F5;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return((value^(value>>>14))>>>0)/4294967296;
  };
}

function starPath(ctx,x,y,outer,inner,points=4){
  ctx.beginPath();
  for(let i=0;i<points*2;i++){
    const radius=i%2?inner:outer;
    const angle=-Math.PI/2+i*Math.PI/points;
    const px=x+Math.cos(angle)*radius;
    const py=y+Math.sin(angle)*radius;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();
}

function drawSoftDisc(ctx,x,y,r,color,hardness=.55){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);
  g.addColorStop(clamp(hardness,.1,.9),color);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;
  ctx.fillRect(x-r,y-r,r*2,r*2);
}

function drawLeaf(ctx,x,y,rx,ry,rotation,color,cutout=false){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rotation);
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(-rx,0);
  ctx.bezierCurveTo(-rx*.42,-ry,rx*.48,-ry,rx,0);
  ctx.bezierCurveTo(rx*.42,ry,-rx*.48,ry,-rx,0);
  ctx.closePath();
  ctx.fill();

  if(cutout){
    ctx.globalCompositeOperation='destination-out';
    ctx.globalAlpha=.22;
    ctx.fillStyle='#000000';
    ctx.fillRect(-rx*.04,-ry*.72,rx*.08,ry*1.44);
  }

  ctx.restore();
}

function drawFeatheredStripe(ctx,width,height,color,ratio=.17){
  const half=width*ratio*.5;
  const g=ctx.createLinearGradient(-half*1.8,0,half*1.8,0);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(.20,color);
  g.addColorStop(.80,color);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;
  ctx.fillRect(-half*1.8,-height,half*3.6,height*2);
}

function applyCookieFeather(ctx,width,height,p){
  const ox=(p.offsetX/100)*width*.14;
  const oy=(p.offsetY/100)*height*.14;
  const radius=Math.max(width,height)*.70;
  const g=ctx.createRadialGradient(
    width*.5+ox,
    height*.5+oy,
    Math.min(width,height)*.16,
    width*.5+ox,
    height*.5+oy,
    radius
  );
  g.addColorStop(0,'#FFFFFF');
  g.addColorStop(.62,'#FFFFFF');
  g.addColorStop(.88,'#707070');
  g.addColorStop(1,'#000000');

  ctx.save();
  ctx.globalCompositeOperation='multiply';
  ctx.fillStyle=g;
  ctx.fillRect(0,0,width,height);
  ctx.restore();
}

function drawCausticCurves(ctx,width,height,p,density,rand){
  const rows=Math.round(5+density*11);
  ctx.lineCap='round';
  ctx.lineJoin='round';

  for(let row=0;row<rows;row++){
    const baseY=-height*.43+row*(height*.86/Math.max(1,rows-1));
    ctx.strokeStyle=row%2?p.colorA:p.colorB;
    ctx.lineWidth=Math.max(2.5,width*(.006+density*.009));
    ctx.globalAlpha=.48+rand()*.44;
    ctx.beginPath();

    const segments=8;
    let x=-width*.56;
    let y=baseY+(rand()-.5)*height*.035;
    ctx.moveTo(x,y);

    for(let step=1;step<=segments;step++){
      const nextX=-width*.56+step*(width*1.12/segments);
      const nextY=baseY+Math.sin(step*.86+row*1.31)*height*(.018+.018*rand());
      const cpX=(x+nextX)*.5;
      const cpY=baseY+(rand()-.5)*height*.10;
      ctx.quadraticCurveTo(cpX,cpY,nextX,nextY);
      x=nextX;
      y=nextY;
    }

    ctx.stroke();
  }

  ctx.globalAlpha=1;
}

export function drawLightProjectorPattern(ctx,width,height,value={},options={}){
  const p=normalizeLightProjector(value);
  if(!p.enabled)return false;

  const cookie=options.cookie===true;
  if(cookie){
    ctx.save();
    ctx.fillStyle='#000000';
    ctx.fillRect(0,0,width,height);
    ctx.restore();
  }

  const s=p.scale/100;
  const ox=(p.offsetX/100)*width*.42;
  const oy=(p.offsetY/100)*height*.42;
  const alpha=Math.max(.18,p.contrast/100);
  const density=p.density/100;
  const rand=seededRandom(
    hashSeed(`${p.type}|${p.colorA}|${p.colorB}|${Math.round(p.density)}`)
  );

  ctx.save();
  ctx.translate(width*.5+ox,height*.5+oy);
  ctx.rotate(p.angle*Math.PI/180);
  ctx.scale(s,s);
  ctx.globalAlpha=alpha;

  if(p.type==='glow'||p.type==='flash'||p.type==='rim'){
    const radius=Math.max(width,height)*(p.type==='flash'?.34:.48);
    const g=ctx.createRadialGradient(0,0,0,0,0,radius);
    g.addColorStop(0,p.colorA);
    g.addColorStop(p.type==='flash'?.16:p.type==='rim'?.38:.24,p.colorA);
    g.addColorStop(p.type==='flash'?.48:.70,p.colorB);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.fillRect(-width,-height,width*2,height*2);
  }

  if(p.type==='split'||p.type==='neon'){
    const g=ctx.createLinearGradient(-width*.56,0,width*.56,0);
    g.addColorStop(0,p.colorA);
    g.addColorStop(.36,p.colorA);
    g.addColorStop(.49,p.type==='neon'?'#08070A':'rgba(0,0,0,0)');
    g.addColorStop(.51,p.type==='neon'?'#080A0A':'rgba(0,0,0,0)');
    g.addColorStop(.64,p.colorB);
    g.addColorStop(1,p.colorB);
    ctx.fillStyle=g;
    ctx.fillRect(-width,-height,width*2,height*2);
  }

  if(p.type==='stripe'){
    drawFeatheredStripe(ctx,width,height,p.colorA,.17);
  }

  if(p.type==='window'){
    const paneW=width*.235;
    const paneH=height*.72;
    const gapX=width*.055;
    const gapY=height*.055;
    ctx.shadowColor=p.colorA;
    ctx.shadowBlur=Math.max(4,width*.018);
    ctx.fillStyle=p.colorA;
    for(const sx of [-1,1]){
      for(const sy of [-1,1]){
        ctx.fillRect(
          sx*(gapX*.5+paneW*.5)-paneW*.5,
          sy*(gapY*.5+paneH*.25)-paneH*.25,
          paneW,
          paneH*.5-gapY*.5
        );
      }
    }
    ctx.shadowBlur=0;
    ctx.globalAlpha*=.52;
    ctx.fillStyle=p.colorB;
    ctx.fillRect(-width*.025,-paneH*.5,width*.05,paneH);
    ctx.fillRect(-paneW-gapX*.5,-height*.025,paneW*2+gapX,height*.05);
  }

  if(p.type==='leaves'){
    const count=Math.round(7+density*34);
    for(let i=0;i<count;i++){
      const x=(rand()-.5)*width*.94;
      const y=(rand()-.5)*height*.92;
      const rx=width*(.018+rand()*.036);
      const ry=height*(.040+rand()*.070);
      const rotation=rand()*Math.PI*2;
      ctx.globalAlpha=alpha*(.45+rand()*.55);
      drawLeaf(
        ctx,x,y,rx,ry,rotation,
        rand()>.34?p.colorA:p.colorB,
        rand()>.72
      );
    }
    ctx.globalAlpha=alpha;
  }

  if(p.type==='blinds'){
    const gap=Math.max(12,height*(.17-density*.115));
    const beam=Math.max(6,gap*(.20+density*.28));
    for(let y=-height;y<height;y+=gap){
      const g=ctx.createLinearGradient(0,y-beam,0,y+beam*2);
      g.addColorStop(0,'rgba(0,0,0,0)');
      g.addColorStop(.28,p.colorA);
      g.addColorStop(.72,p.colorA);
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;
      ctx.fillRect(-width,y-beam,width*2,beam*3);
    }
  }

  if(p.type==='bokeh'||p.type==='circles'){
    const count=Math.round(5+density*26);
    for(let i=0;i<count;i++){
      const x=(rand()-.5)*width*.94;
      const y=(rand()-.5)*height*.94;
      const r=(.022+rand()*.062)*Math.min(width,height);
      const color=rand()>.45?p.colorA:p.colorB;
      ctx.globalAlpha=alpha*(.46+rand()*.48);
      if(p.type==='bokeh'){
        drawSoftDisc(ctx,x,y,r,color,.54+rand()*.18);
      }else{
        ctx.strokeStyle=color;
        ctx.lineWidth=Math.max(2,r*.16);
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha=alpha;
  }

  if(p.type==='sparkles'){
    const count=Math.round(8+density*44);
    for(let i=0;i<count;i++){
      const x=(rand()-.5)*width*.96;
      const y=(rand()-.5)*height*.96;
      const large=rand()>.80;
      const r=(large?.020:.0045)*Math.min(width,height)*(1+rand()*.8);
      const color=rand()>.42?p.colorA:p.colorB;
      ctx.globalAlpha=alpha*(.50+rand()*.50);
      drawSoftDisc(ctx,x,y,r*(large?2.4:2),color,.20);
      ctx.fillStyle=color;
      if(large){
        starPath(ctx,x,y,r,r*.18,4);
        ctx.fill();
      }else{
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fill();
      }
    }
    ctx.globalAlpha=alpha;
  }

  if(p.type==='iridescent'){
    const g=ctx.createLinearGradient(-width*.45,-height*.35,width*.45,height*.35);
    g.addColorStop(0,'rgba(255,79,163,0)');
    g.addColorStop(.12,'#FF4FA3');
    g.addColorStop(.32,'#8F5BFF');
    g.addColorStop(.54,'#5DEBFF');
    g.addColorStop(.76,'#A8FF9E');
    g.addColorStop(.90,'#FFF1A1');
    g.addColorStop(1,'rgba(255,241,161,0)');
    ctx.strokeStyle=g;
    ctx.lineWidth=Math.max(28,width*.14);
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(-width*.40,-height*.50);
    ctx.lineTo(width*.40,height*.50);
    ctx.stroke();
  }

  if(p.type==='rainbow'){
    const colors=['#FF4D5A','#FF9F43','#FFE85A','#55D86A','#4FD7FF','#6F70FF','#B45BFF'];
    const band=Math.max(7,width*.025);
    const start=-band*colors.length*.5;
    ctx.save();
    ctx.shadowColor='#FFFFFF';
    ctx.shadowBlur=Math.max(4,width*.012);
    colors.forEach((color,index)=>{
      ctx.fillStyle=color;
      ctx.fillRect(start+index*band,-height,band,height*2);
    });
    ctx.restore();
  }

  if(p.type==='underwater'||p.type==='caustics'){
    drawCausticCurves(ctx,width,height,p,density,rand);

    if(p.type==='underwater'){
      ctx.globalAlpha=alpha*.34;
      for(let i=0;i<Math.round(3+density*6);i++){
        const x=(rand()-.5)*width*.92;
        const y=(rand()-.5)*height*.92;
        const r=(.03+rand()*.07)*Math.min(width,height);
        drawSoftDisc(ctx,x,y,r,p.colorA,.28);
      }
      ctx.globalAlpha=alpha;
    }
  }

  ctx.restore();

  if(cookie){
    applyCookieFeather(ctx,width,height,p);
  }

  return true;
}
