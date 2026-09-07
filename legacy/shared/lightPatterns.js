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

function radialFill(ctx,x,y,r,colorA,colorB){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,colorA);
  g.addColorStop(.55,colorB);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;
  ctx.fillRect(x-r,y-r,r*2,r*2);
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

  ctx.save();
  ctx.translate(width*.5+ox,height*.5+oy);
  ctx.rotate(p.angle*Math.PI/180);
  ctx.scale(s,s);
  ctx.globalAlpha=alpha;

  if(p.type==='glow'||p.type==='flash'||p.type==='rim'){
    const radius=Math.max(width,height)*.46;
    const g=ctx.createRadialGradient(0,0,0,0,0,radius);
    g.addColorStop(0,p.colorA);
    g.addColorStop(p.type==='rim'?.38:.24,p.colorA);
    g.addColorStop(.7,p.colorB);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.fillRect(-width,-height,width*2,height*2);
  }

  if(p.type==='split'||p.type==='neon'){
    const g=ctx.createLinearGradient(-width*.55,0,width*.55,0);
    g.addColorStop(0,p.colorA);
    g.addColorStop(.44,p.type==='neon'?'#120815':p.colorA);
    g.addColorStop(.56,p.type==='neon'?'#081315':p.colorB);
    g.addColorStop(1,p.colorB);
    ctx.fillStyle=g;
    ctx.fillRect(-width,-height,width*2,height*2);
  }

  if(p.type==='stripe'){
    ctx.fillStyle=p.colorA;
    ctx.fillRect(-width*.085,-height,width*.17,height*2);
  }

  if(p.type==='window'){
    const w=width*.24;
    const h=height*.72;
    ctx.fillStyle=p.colorA;
    ctx.fillRect(-w*1.06,-h*.5,w,h);
    ctx.fillRect(w*.06,-h*.5,w,h);
    ctx.fillStyle=p.colorB;
    ctx.fillRect(-width*.035,-h*.5,width*.07,h);
    ctx.fillRect(-w*1.06,-height*.035,w*2.12,height*.07);
  }

  if(p.type==='leaves'){
    const leafCount=Math.round(6+density*30);
    for(let i=0;i<leafCount;i++){
      const x=((i*37)%100)/100*width-width*.5;
      const y=((i*61+17)%100)/100*height-height*.5;
      ctx.fillStyle=i%3===0?p.colorB:p.colorA;
      ctx.beginPath();
      ctx.ellipse(x,y,width*.032,height*.073,(i*.67)%Math.PI,0,Math.PI*2);
      ctx.fill();
    }
  }

  if(p.type==='blinds'){
    ctx.fillStyle=p.colorA;
    const gap=Math.max(10,height*(.16-density*.11));
    const beam=Math.max(5,gap*(.22+density*.28));
    for(let y=-height;y<height;y+=gap){
      ctx.fillRect(-width,y,width*2,beam);
    }
  }

  if(p.type==='bokeh'||p.type==='circles'){
    const circleCount=Math.round(5+density*25);
    for(let i=0;i<circleCount;i++){
      const x=((i*43+9)%100)/100*width-width*.5;
      const y=((i*71+13)%100)/100*height-height*.5;
      const r=(.025+((i*17)%28)/1000)*Math.min(width,height);
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,i%2?p.colorA:p.colorB);
      g.addColorStop(.62,i%2?p.colorA:p.colorB);
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
    }
  }

  if(p.type==='sparkles'){
    const sparkleCount=Math.round(8+density*42);
    for(let i=0;i<sparkleCount;i++){
      const x=((i*47+11)%100)/100*width-width*.5;
      const y=((i*67+23)%100)/100*height-height*.5;
      const r=(i%5===0?Math.min(width,height)*.035:Math.min(width,height)*.009);
      ctx.fillStyle=i%3===0?p.colorB:p.colorA;
      if(i%5===0){
        starPath(ctx,x,y,r,r*.18,4);
        ctx.fill();
      }else{
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fill();
      }
    }
  }

  if(p.type==='iridescent'){
    const g=ctx.createLinearGradient(-width*.45,-height*.35,width*.45,height*.35);
    g.addColorStop(0,'#FF4FA3');
    g.addColorStop(.28,'#8F5BFF');
    g.addColorStop(.56,'#5DEBFF');
    g.addColorStop(.78,'#A8FF9E');
    g.addColorStop(1,'#FFF1A1');
    ctx.strokeStyle=g;
    ctx.lineWidth=Math.max(24,width*.12);
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(-width*.34,-height*.46);
    ctx.lineTo(width*.34,height*.46);
    ctx.stroke();
  }

  if(p.type==='rainbow'){
    const colors=['#FF4D5A','#FF9F43','#FFE85A','#55D86A','#4FD7FF','#6F70FF','#B45BFF'];
    const band=Math.max(7,width*.026);
    const start=-band*colors.length*.5;
    colors.forEach((color,index)=>{
      ctx.fillStyle=color;
      ctx.fillRect(start+index*band,-height,band,height*2);
    });
  }

  if(p.type==='underwater'||p.type==='caustics'){
    ctx.lineCap='round';
    const rowCount=Math.round(4+density*12);
    for(let row=0;row<rowCount;row++){
      const y=-height*.44+row*(height*.88/Math.max(1,rowCount-1));
      ctx.strokeStyle=row%2?p.colorA:p.colorB;
      ctx.lineWidth=Math.max(3,width*.012);
      ctx.beginPath();
      for(let step=0;step<=10;step++){
        const x=-width*.55+step*width*.11;
        const yy=y+Math.sin(step*.95+row*1.37)*height*.028;
        if(step===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
  return true;
}
