import { activeLights, dominantLightVector } from './lightingEngine.js';
import { mixHex } from './colorUtils.js';
import { drawLightProjectorPattern, normalizeLightProjector } from '../../shared/lightPatterns.js?cache=projector-controls-v1-20260906';

const MATERIAL_TINTS = {
  gold: '#D6A93D',
  silver: '#C9CED7',
  steel: '#778494'
};

function colorAt(colors, index, fallback = '#777777') {
  return colors[index] || colors[colors.length - 1] || fallback;
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 119, g: 119, b: 119 };
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }
}

function tintPalette(colors, tint, amount) {
  return colors.map((hex) => mixHex(hex, tint, amount));
}

function shadowColor(colors) { return colorAt(colors, 0, '#261D2A'); }
function midColor(colors) { return colorAt(colors, 6, '#9D7882'); }
function lightColor(colors) { return colorAt(colors, 12, '#E8C9C8'); }
function highlightColor(colors) { return colorAt(colors, 13, '#FFF2EB'); }
function rimColor(colors) { return colorAt(colors, 14, '#B8D7FF'); }
function bounceColor(colors) { return colorAt(colors, 15, '#D48E79'); }

function normalizeAtmosphereEffectOpacity(
  value
){
  const number =
    Number(value || 0);

  return number > 1
    ? Math.max(
        0,
        Math.min(
          1,
          number / 100
        )
      )
    : Math.max(
        0,
        Math.min(
          1,
          number
        )
      );
}

function renderAtmosphereEffect(
  ctx,
  width,
  height,
  effect
){
  if(
    !effect ||
    effect.type === 'none'
  ){
    return;
  }

  const colorA =
    effect.colorA ||
    '#FFFFFF';

  const colorB =
    effect.colorB ||
    '#7C3AED';

  const opacity =
    normalizeAtmosphereEffectOpacity(
      effect.opacity
    );

  const scaleRaw =
    Number(
      effect.scale ?? 100
    );

  const scale =
    scaleRaw <= 3
      ? scaleRaw
      : scaleRaw / 100;

  const angle =
    Number(
      effect.angle || 0
    ) *
    Math.PI /
    180;

  ctx.save();
  ctx.globalAlpha =
    opacity;

  if(
    effect.type === 'glow' ||
    effect.type === 'rim'
  ){
    const glow =
      ctx.createRadialGradient(
        width*.20,
        height*.20,
        0,
        width*.20,
        height*.20,
        width*.78*scale
      );

    glow.addColorStop(
      0,
      rgba(colorA,.92)
    );

    glow.addColorStop(
      .42,
      rgba(colorA,.24)
    );

    glow.addColorStop(
      1,
      rgba(colorB,0)
    );

    ctx.fillStyle=glow;
    ctx.fillRect(
      0,0,width,height
    );
  }

  if(
    effect.type === 'split' ||
    effect.type === 'neon'
  ){
    const gradient =
      ctx.createLinearGradient(
        0,0,width,0
      );

    gradient.addColorStop(
      0,
      rgba(colorA,.92)
    );

    gradient.addColorStop(
      .47,
      rgba(colorA,.08)
    );

    gradient.addColorStop(
      .53,
      rgba(colorB,.08)
    );

    gradient.addColorStop(
      1,
      rgba(colorB,.92)
    );

    ctx.fillStyle=gradient;
    ctx.fillRect(
      0,0,width,height
    );
  }

  if(effect.type === 'stripe'){
    const stripeWidth =
      Math.max(
        30,
        width*.12*scale
      );

    ctx.translate(
      width*.5,
      height*.5
    );

    ctx.rotate(angle);

    ctx.fillStyle =
      rgba(colorA,.92);

    ctx.fillRect(
      -stripeWidth*.5,
      -height,
      stripeWidth,
      height*2
    );
  }

  if(effect.type === 'window'){
    ctx.translate(
      width*.5,
      height*.5
    );

    ctx.rotate(angle);

    ctx.fillStyle =
      rgba(colorA,.62);

    const beamW =
      width*.20*scale;

    const beamH =
      height*.66;

    ctx.fillRect(
      -beamW*.5,
      -beamH*.5,
      beamW,
      beamH
    );

    ctx.fillRect(
      -width*.34,
      -height*.07,
      width*.68,
      height*.14
    );

    ctx.fillStyle =
      rgba(colorB,.38);

    ctx.fillRect(
      -width*.025,
      -beamH*.5,
      width*.05,
      beamH
    );

    ctx.fillRect(
      -width*.34,
      -height*.025,
      width*.68,
      height*.05
    );
  }

  if(effect.type === 'leaves'){
    const count=14;

    for(
      let index=0;
      index<count;
      index++
    ){
      const x =
        width *
        (
          .08 +
          (
            (index*37)%84
          )/100
        );

      const y =
        height *
        (
          .06 +
          (
            (index*53)%70
          )/100
        );

      ctx.fillStyle =
        rgba(
          index%2
            ? colorA
            : colorB,
          .50
        );

      ctx.beginPath();

      ctx.ellipse(
        x,
        y,
        width*.035*scale,
        height*.075*scale,
        angle+
        index*.31,
        0,
        Math.PI*2
      );

      ctx.fill();
    }
  }

  if(effect.type === 'blinds'){
    ctx.translate(
      width*.5,
      height*.5
    );

    ctx.rotate(angle);

    const gap =
      Math.max(
        18,
        height*.09*scale
      );

    const beam =
      Math.max(
        7,
        gap*.34
      );

    ctx.fillStyle =
      rgba(colorA,.68);

    for(
      let y=-height;
      y<height;
      y+=gap
    ){
      ctx.fillRect(
        -width,
        y,
        width*2,
        beam
      );
    }
  }

  if(
    effect.type ===
    'iridescent'
  ){
    const gradient =
      ctx.createLinearGradient(
        width*.10,
        height*.08,
        width*.88,
        height*.90
      );

    gradient.addColorStop(
      0,
      rgba('#FF4FA3',.88)
    );

    gradient.addColorStop(
      .32,
      rgba('#8F5BFF',.82)
    );

    gradient.addColorStop(
      .66,
      rgba('#5DEBFF',.84)
    );

    gradient.addColorStop(
      1,
      rgba('#FFF1A1',.72)
    );

    ctx.strokeStyle=gradient;
    ctx.lineWidth=
      Math.max(
        24,
        width*.11*scale
      );

    ctx.lineCap='round';
    ctx.beginPath();

    ctx.moveTo(
      width*.18,
      height*.12
    );

    ctx.lineTo(
      width*.74,
      height*.88
    );

    ctx.stroke();
  }

  if(effect.type === 'rainbow'){
    const colors=[
      '#FF4D5A',
      '#FF9F43',
      '#FFE85A',
      '#55D86A',
      '#4FD7FF',
      '#6F70FF',
      '#B45BFF'
    ];

    ctx.save();

    ctx.translate(
      width*.5,
      height*.5
    );

    ctx.rotate(angle);

    const band =
      Math.max(
        10,
        width*.018*scale
      );

    const start =
      -band*
      colors.length*
      .5;

    colors.forEach(
      (color,index)=>{
        ctx.fillStyle =
          rgba(color,.90);

        ctx.fillRect(
          start+
          index*band,
          -height,
          band,
          height*2
        );
      }
    );

    ctx.restore();
  }

  if(effect.type === 'underwater'){
    const spacing =
      Math.max(
        24,
        height*.075*scale
      );

    for(
      let y=0;
      y<height;
      y+=spacing
    ){
      const wave =
        ctx.createLinearGradient(
          0,
          y,
          width,
          y+
          spacing*.4
        );

      wave.addColorStop(
        0,
        rgba(colorA,0)
      );

      wave.addColorStop(
        .48,
        rgba(colorA,.72)
      );

      wave.addColorStop(
        1,
        rgba(colorB,0)
      );

      ctx.fillStyle=wave;

      ctx.fillRect(
        0,
        y,
        width,
        Math.max(
          5,
          spacing*.22
        )
      );
    }
  }

  ctx.restore();
}
function renderBackdrop(ctx,width,height,lighting=null){
  const atmosphere=
    lighting?.atmosphere?.backdrop;

  if(atmosphere){
    const sky=
      ctx.createLinearGradient(
        0,0,0,height
      );

    sky.addColorStop(
      0,
      atmosphere.top||'#7FAED0'
    );
    sky.addColorStop(
      .52,
      atmosphere.mid||'#AAB7C0'
    );
    sky.addColorStop(
      1,
      atmosphere.bottom||'#6E7778'
    );

    ctx.fillStyle=sky;
    ctx.fillRect(0,0,width,height);

    const glow=
      ctx.createRadialGradient(
        width*.26,
        height*.24,
        0,
        width*.26,
        height*.24,
        width*.66
      );

    glow.addColorStop(
      0,
      rgba(
        atmosphere.accent||'#FFFFFF',
        .34
      )
    );

    glow.addColorStop(
      .5,
      rgba(
        atmosphere.accent||'#FFFFFF',
        .08
      )
    );

    glow.addColorStop(
      1,
      rgba(
        atmosphere.accent||'#FFFFFF',
        0
      )
    );

    ctx.fillStyle=glow;
    ctx.fillRect(0,0,width,height);

    /*
      El patron creativo ya no se pinta sobre el fondo.
      Se proyecta como luz dentro de la figura.
    */

    if(
      atmosphere.weather==='rain'||
      atmosphere.weather==='storm'
    ){
      ctx.save();

      ctx.strokeStyle=
        rgba(
          '#D9F3FF',
          atmosphere.weather==='storm'
            ?.22
            :.14
        );

      ctx.lineWidth=
        Math.max(
          1,
          width*.0015
        );

      const gap=
        Math.max(
          24,
          width/34
        );

      for(
        let x=-height;
        x<width+height;
        x+=gap
      ){
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(
          x-height*.34,
          height
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    if(atmosphere.weather==='fog'){
      ctx.fillStyle=
        'rgba(245,248,246,.20)';

      ctx.fillRect(
        0,0,width,height
      );
    }

    return;
  }

  const dark=
    document.documentElement
      .dataset.theme==='night';

  const backdrop=
    ctx.createRadialGradient(
      width*.5,
      height*.38,
      0,
      width*.5,
      height*.5,
      width*.78
    );

  backdrop.addColorStop(
    0,
    dark
      ?'#2B2733'
      :'#FFFFFF'
  );

  backdrop.addColorStop(
    .55,
    dark
      ?'#1C1921'
      :'#F7F3F8'
  );

  backdrop.addColorStop(
    1,
    dark
      ?'#100F13'
      :'#E9E5EB'
  );

  ctx.fillStyle=backdrop;
  ctx.fillRect(0,0,width,height);
}
function renderGroundShadow(ctx, cx, cy, rx, ry, color = '#000000') {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  gradient.addColorStop(0, rgba(color, .32));
  gradient.addColorStop(.6, rgba(color, .14));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.scale(1, ry / rx);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy * (rx / ry), rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderProjectedLightPattern(
  ctx,
  cx,
  cy,
  rx,
  ry,
  lighting
){
  const projector=
    normalizeLightProjector(
      lighting?.projector||{}
    );

  if(!projector.enabled)return;

  const width=ctx.canvas.width;
  const height=ctx.canvas.height;

  const layer=
    document.createElement(
      'canvas'
    );

  layer.width=width;
  layer.height=height;

  const layerCtx=
    layer.getContext('2d');

  if(!layerCtx)return;

  drawLightProjectorPattern(
    layerCtx,
    width,
    height,
    projector,
    {cookie:false}
  );

  const lights=
    activeLights(lighting);

  const source=
    lights.find(
      (light)=>
        light.id===
        projector.lightId
    )||
    lights[0];

  const direction=
    Number(
      source?.direction||0
    )*
    Math.PI/180;

  const elevation=
    Number(
      source?.elevation||0
    )*
    Math.PI/180;

  const lightX=
    cx+
    Math.sin(direction)*
    rx*.58;

  const lightY=
    cy-
    Math.sin(elevation)*
    ry*.48;

  const falloff=
    layerCtx.createRadialGradient(
      lightX,
      lightY,
      0,
      lightX,
      lightY,
      Math.max(rx,ry)*1.48
    );

  falloff.addColorStop(
    0,
    'rgba(255,255,255,1)'
  );

  falloff.addColorStop(
    .62,
    'rgba(255,255,255,.88)'
  );

  falloff.addColorStop(
    1,
    'rgba(255,255,255,0)'
  );

  layerCtx.globalCompositeOperation=
    'destination-in';

  layerCtx.fillStyle=falloff;
  layerCtx.fillRect(
    0,0,width,height
  );

  layerCtx.globalCompositeOperation=
    'source-over';

  ctx.save();

  ctx.globalCompositeOperation=
    'screen';

  ctx.globalAlpha=
    Math.max(
      .08,
      Math.min(
        1,
        projector.intensity/100
      )
    );

  const blurPx=
    Math.round(
      projector.blur*
      .09
    );

  if(blurPx>0){
    ctx.filter=
      `blur(${blurPx}px)`;
  }

  ctx.drawImage(
    layer,
    0,
    0
  );

  ctx.restore();
}

/*
  Dibuja las luces reales encima del volumen.
  Antes el preview reducía todas las luces a una sola dirección
  promedio; por eso azul + naranja terminaba viéndose morado.
*/
function renderColoredLights(ctx, drawShape, cx, cy, rx, ry, lighting) {
  const lights = activeLights(lighting);

  if (!lights.length) return;

  ctx.save();
  drawShape();
  ctx.clip();

  lights.slice(0, 8).forEach((light) => {
    const direction =
      Number(light.direction || 0) *
      Math.PI / 180;

    const elevation =
      Number(light.elevation || 0) *
      Math.PI / 180;

    const intensity =
      Math.max(
        .12,
        Math.min(
          1,
          Number(light.intensity || 0) / 100
        )
      );

    const softness =
      Math.max(
        0,
        Math.min(
          1,
          Number(light.softness || 0) / 100
        )
      );

    /*
      La dirección determina qué lado recibe el color.
      Azul + naranja queda físicamente separado.
    */
    const lightX =
      cx +
      Math.sin(direction) *
      rx *
      .92;

    const lightY =
      cy -
      Math.sin(elevation) *
      ry *
      .62 -
      Math.cos(direction) *
      ry *
      .08;

    const spread =
      Math.max(rx, ry) *
      (
        .30 +
        softness * .24 +
        intensity * .12
      );

    const coreAlpha =
      Math.min(
        .88,
        .44 +
        intensity * .38
      );

    const middleAlpha =
      Math.min(
        .52,
        .16 +
        intensity * .24
      );

    const glow =
      ctx.createRadialGradient(
        lightX,
        lightY,
        0,
        lightX,
        lightY,
        spread
      );

    glow.addColorStop(
      0,
      rgba(light.color, coreAlpha)
    );

    glow.addColorStop(
      .20,
      rgba(light.color, middleAlpha)
    );

    glow.addColorStop(
      .48,
      rgba(light.color, middleAlpha * .46)
    );

    glow.addColorStop(
      .78,
      rgba(light.color, middleAlpha * .10)
    );

    glow.addColorStop(
      1,
      rgba(light.color, 0)
    );

    ctx.fillStyle = glow;

    ctx.fillRect(
      cx - rx - spread,
      cy - ry - spread,
      (rx + spread) * 2,
      (ry + spread) * 2
    );

    /*
      Pequeño brillo de la misma luz para que el color también
      aparezca en las zonas claras y no solo como una mancha.
    */
    const specX =
      cx +
      Math.sin(direction) *
      rx *
      .58;

    const specY =
      cy -
      Math.sin(elevation) *
      ry *
      .48;

    const spec =
      ctx.createRadialGradient(
        specX,
        specY,
        0,
        specX,
        specY,
        spread * .24
      );

    spec.addColorStop(
      0,
      rgba('#FFFFFF', .10 + intensity * .12)
    );

    spec.addColorStop(
      .24,
      rgba(light.color, .18 + intensity * .16)
    );

    spec.addColorStop(
      1,
      rgba(light.color, 0)
    );

    ctx.fillStyle = spec;

    ctx.fillRect(
      cx - rx,
      cy - ry,
      rx * 2,
      ry * 2
    );
  });

  renderProjectedLightPattern(
    ctx,
    cx,
    cy,
    rx,
    ry,
    lighting
  );

  ctx.restore();
}

function renderLightGuides(ctx, width, height, lighting) {
  const lights = activeLights(lighting);
  if (!lights.length) return;

  const cx = width * .5;
  const cy = height * .48;
  const orbitX = width * .38;
  const orbitY = height * .34;

  ctx.save();
  lights.slice(0, 8).forEach((light, index) => {
    const direction = Number(light.direction || 0) * Math.PI / 180;
    const elevation = Number(light.elevation || 0) * Math.PI / 180;
    const x = cx + Math.sin(direction) * orbitX;
    const y = cy - Math.sin(elevation) * orbitY - Math.cos(direction) * orbitY * .16;
    const intensity = Math.max(.18, Math.min(1, Number(light.intensity || 0) / 100));
    const selected = lighting?.selectedLightId === light.id;

    ctx.save();
    ctx.setLineDash([10, 9]);
    ctx.strokeStyle = rgba(light.color, selected ? .68 : .34);
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.restore();

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 + 26 * intensity);
    glow.addColorStop(0, rgba(light.color, .92));
    glow.addColorStop(.22, rgba(light.color, .48));
    glow.addColorStop(1, rgba(light.color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 28 + 26 * intensity, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = light.color;
    ctx.beginPath();
    ctx.arc(x, y, selected ? 10 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeStyle = selected ? '#FFFFFF' : rgba('#FFFFFF', .7);
    ctx.stroke();

    ctx.fillStyle = document.documentElement.dataset.theme === 'night' ? '#FFFFFF' : '#211D25';
    ctx.font = `${Math.round(Math.max(11, width * .012))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1), x, y - 17);
  });
  ctx.restore();
}

function renderSphere(ctx, width, height, colors, lightingOrVector) {
  const lighting =
    lightingOrVector?.lights
      ? lightingOrVector
      : null;

  const lightVector =
    lighting
      ? dominantLightVector(lighting)
      : lightingOrVector;

  const radius =
    Math.min(width, height) * .29;

  const cx = width * .5;
  const cy = height * .47;

  renderGroundShadow(
    ctx,
    cx,
    cy + radius * 1.12,
    radius * .88,
    radius * .18,
    shadowColor(colors)
  );

  ctx.save();

  ctx.shadowColor =
    rgba(shadowColor(colors), .40);

  ctx.shadowBlur =
    radius * .20;

  ctx.shadowOffsetY =
    radius * .08;

  const highlightX =
    cx +
    lightVector.x *
    radius *
    .62;

  const highlightY =
    cy +
    lightVector.y *
    radius *
    .62;

  const gradient =
    ctx.createRadialGradient(
      highlightX,
      highlightY,
      radius *
        (
          .025 +
          lightVector.softness * .09
        ),
      cx,
      cy,
      radius
    );

  /*
    Más colores de la paleta participan en el volumen.
    Esto evita la esfera plana de solo 4 o 5 tonos.
  */
  gradient.addColorStop(
    0,
    colorAt(colors, 15, highlightColor(colors))
  );

  gradient.addColorStop(
    .08,
    colorAt(colors, 13, highlightColor(colors))
  );

  gradient.addColorStop(
    .18,
    colorAt(colors, 12, lightColor(colors))
  );

  gradient.addColorStop(
    .31,
    colorAt(colors, 11, lightColor(colors))
  );

  gradient.addColorStop(
    .44,
    colorAt(colors, 9, midColor(colors))
  );

  gradient.addColorStop(
    .58,
    colorAt(colors, 7, midColor(colors))
  );

  gradient.addColorStop(
    .70,
    colorAt(colors, 5, midColor(colors))
  );

  gradient.addColorStop(
    .80,
    colorAt(colors, 3, shadowColor(colors))
  );

  gradient.addColorStop(
    .91,
    colorAt(colors, 1, shadowColor(colors))
  );

  gradient.addColorStop(
    1,
    shadowColor(colors)
  );

  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();

  /*
    Aquí está el cambio importante:
    cada luz conserva su HEX y su lado.
  */
  renderColoredLights(
    ctx,
    () => {
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        radius,
        0,
        Math.PI * 2
      );
    },
    cx,
    cy,
    radius * .96,
    radius * .96,
    lighting
  );

  ctx.save();

  const rim =
    ctx.createLinearGradient(
      cx - radius,
      0,
      cx + radius,
      0
    );

  rim.addColorStop(
    0,
    rgba(
      rimColor(colors),
      lightVector.x > 0
        ? .12
        : .72
    )
  );

  rim.addColorStop(
    .16,
    'transparent'
  );

  rim.addColorStop(
    .84,
    'transparent'
  );

  rim.addColorStop(
    1,
    rgba(
      bounceColor(colors),
      lightVector.x > 0
        ? .72
        : .12
    )
  );

  ctx.fillStyle = rim;

  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius * .99,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

function renderCylinder(ctx, width, height, colors, lightVector) {
  const x = width * .27;
  const y = height * .17;
  const w = width * .46;
  const h = height * .66;
  const capH = h * .12;
  renderGroundShadow(ctx, width * .5, y + h + capH * .45, w * .54, capH * .72, shadowColor(colors));

  const leftToRight = lightVector.x >= 0;
  const body = leftToRight
    ? ctx.createLinearGradient(x, 0, x + w, 0)
    : ctx.createLinearGradient(x + w, 0, x, 0);
  body.addColorStop(0, shadowColor(colors));
  body.addColorStop(.18, colorAt(colors, 3, shadowColor(colors)));
  body.addColorStop(.43, midColor(colors));
  body.addColorStop(.62, lightColor(colors));
  body.addColorStop(.77, highlightColor(colors));
  body.addColorStop(1, colorAt(colors, 2, shadowColor(colors)));

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(colors), .34);
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = body;
  ctx.fillRect(x, y + capH / 2, w, h - capH);

  const top = ctx.createRadialGradient(
    width * (.5 + lightVector.x * .08),
    y + capH * .46,
    2,
    width * .5, y + capH * .5, w * .46
  );
  top.addColorStop(0, highlightColor(colors));
  top.addColorStop(.48, lightColor(colors));
  top.addColorStop(1, colorAt(colors, 3, shadowColor(colors)));
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(width * .5, y + capH * .5, w / 2, capH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const bottom = ctx.createLinearGradient(x, 0, x + w, 0);
  bottom.addColorStop(0, shadowColor(colors));
  bottom.addColorStop(.5, midColor(colors));
  bottom.addColorStop(1, colorAt(colors, 2, shadowColor(colors)));
  ctx.fillStyle = bottom;
  ctx.beginPath();
  ctx.ellipse(width * .5, y + h - capH * .5, w / 2, capH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderPlane(ctx, width, height, colors, lightVector) {
  const x = width * .15;
  const y = height * .16;
  const w = width * .70;
  const h = height * .62;

  renderGroundShadow(ctx, width * .5, height * .78, width * .32, height * .065, shadowColor(colors));

  const startX = lightVector.x >= 0 ? x : x + w;
  const startY = lightVector.y >= 0 ? y : y + h;
  const gradient = ctx.createLinearGradient(
    startX, startY,
    x + w - (startX - x),
    y + h - (startY - y)
  );
  [0, 3, 6, 10, 13].forEach((index, i) => gradient.addColorStop(i / 4, colorAt(colors, index)));

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.transform(1, -.12, -.18, .92, 0, 0);
  ctx.shadowColor = rgba(shadowColor(colors), .34);
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, -w / 2, -h / 2, w, h, 24);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = .2;
  ctx.strokeStyle = highlightColor(colors);
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * i / 5, -h / 2);
    ctx.lineTo(-w / 2 + w * i / 5, h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSkin(ctx, width, height, colors, lightingOrVector) {
  const lighting =
    lightingOrVector?.lights
      ? lightingOrVector
      : null;

  const lightVector =
    lighting
      ? dominantLightVector(lighting)
      : lightingOrVector;

  const x = width * .20;
  const y = height * .17;
  const w = width * .60;
  const h = height * .64;

  const cx =
    x + w * .5;

  const cy =
    y + h * .5;

  const corner =
    Math.min(w, h) * .20;

  renderGroundShadow(
    ctx,
    cx,
    y + h + 24,
    w * .38,
    30,
    shadowColor(colors)
  );

  ctx.save();

  ctx.shadowColor =
    rgba(shadowColor(colors), .28);

  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 16;

  const gradient =
    ctx.createRadialGradient(
      cx +
        lightVector.x *
        w *
        .22,
      cy +
        lightVector.y *
        h *
        .25,
      8,
      cx,
      cy,
      w * .58
    );

  gradient.addColorStop(
    0,
    colorAt(colors, 15, highlightColor(colors))
  );

  gradient.addColorStop(
    .12,
    colorAt(colors, 13, highlightColor(colors))
  );

  gradient.addColorStop(
    .26,
    colorAt(colors, 11, lightColor(colors))
  );

  gradient.addColorStop(
    .42,
    colorAt(colors, 9, lightColor(colors))
  );

  gradient.addColorStop(
    .58,
    colorAt(colors, 7, midColor(colors))
  );

  gradient.addColorStop(
    .73,
    colorAt(colors, 5, midColor(colors))
  );

  gradient.addColorStop(
    .86,
    colorAt(colors, 2, shadowColor(colors))
  );

  gradient.addColorStop(
    1,
    shadowColor(colors)
  );

  roundedRect(
    ctx,
    x,
    y,
    w,
    h,
    corner
  );

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.restore();

  renderColoredLights(
    ctx,
    () => {
      roundedRect(
        ctx,
        x,
        y,
        w,
        h,
        corner
      );
    },
    cx,
    cy,
    w * .54,
    h * .46,
    lighting
  );

  ctx.save();

  const blush =
    ctx.createRadialGradient(
      cx - w * .16,
      cy + h * .04,
      0,
      cx - w * .16,
      cy + h * .04,
      w * .18
    );

  blush.addColorStop(
    0,
    rgba(
      bounceColor(colors),
      .34
    )
  );

  blush.addColorStop(
    1,
    rgba(
      bounceColor(colors),
      0
    )
  );

  ctx.fillStyle = blush;

  roundedRect(
    ctx,
    x,
    y,
    w,
    h,
    corner
  );

  ctx.fill();

  ctx.globalAlpha = .20;
  ctx.fillStyle =
    highlightColor(colors);

  for (let i = 0; i < 20; i++) {
    const px =
      x +
      w *
      (
        .12 +
        ((i * 37) % 76) / 100
      );

    const py =
      y +
      h *
      (
        .14 +
        ((i * 53) % 70) / 100
      );

    ctx.beginPath();

    ctx.arc(
      px,
      py,
      1.2 +
      (i % 3) * .4,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.restore();
}

function metalGradient(ctx, x, y, w, h, colors, lightVector) {
  const leftToRight = lightVector.x >= 0;
  const gradient = leftToRight
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x + w, y, x, y);
  const sequence = [0, 2, 7, 12, 13, 5, 1, 11, 13, 6, 2, 0];
  sequence.forEach((index, i) => gradient.addColorStop(i / (sequence.length - 1), colorAt(colors, index)));
  return gradient;
}

function renderMetal(ctx, width, height, colors, lightVector, tint = null) {
  const palette = tint ? tintPalette(colors, tint, .34) : colors;
  const x = width * .14;
  const y = height * .24;
  const w = width * .72;
  const h = height * .34;

  renderGroundShadow(ctx, width * .5, y + h + 48, width * .29, 30, shadowColor(palette));

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(palette), .4);
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = metalGradient(ctx, x, y, w, h, palette, lightVector);
  ctx.fill();

  const shine = ctx.createLinearGradient(0, y, 0, y + h);
  shine.addColorStop(0, 'rgba(255,255,255,.62)');
  shine.addColorStop(.24, 'rgba(255,255,255,.08)');
  shine.addColorStop(.72, 'rgba(0,0,0,.16)');
  shine.addColorStop(1, 'rgba(255,255,255,.24)');
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  const ringX = width * .5;
  const ringY = height * .69;
  const outer = Math.min(width, height) * .12;
  ctx.lineWidth = outer * .35;
  ctx.strokeStyle = metalGradient(ctx, ringX - outer, ringY, outer * 2, 1, palette, lightVector);
  ctx.beginPath();
  ctx.arc(ringX, ringY, outer, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(highlightColor(palette), .68);
  ctx.beginPath();
  ctx.arc(ringX - outer * .10, ringY - outer * .10, outer * .86, Math.PI * 1.06, Math.PI * 1.78);
  ctx.stroke();
  ctx.restore();
}

function headPath(ctx, cx, cy, scale) {
  const w = scale * .72;
  const h = scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * .52);
  ctx.bezierCurveTo(cx - w * .50, cy - h * .49, cx - w * .58, cy - h * .10, cx - w * .47, cy + h * .18);
  ctx.bezierCurveTo(cx - w * .38, cy + h * .40, cx - w * .18, cy + h * .54, cx, cy + h * .59);
  ctx.bezierCurveTo(cx + w * .18, cy + h * .54, cx + w * .38, cy + h * .40, cx + w * .47, cy + h * .18);
  ctx.bezierCurveTo(cx + w * .58, cy - h * .10, cx + w * .50, cy - h * .49, cx, cy - h * .52);
  ctx.closePath();
}

function renderHead(ctx, width, height, colors, lightVector) {
  const scale = Math.min(width, height) * .56;
  const cx = width * .5;
  const cy = height * .46;
  renderGroundShadow(ctx, cx, cy + scale * .72, scale * .30, scale * .08, shadowColor(colors));

  ctx.save();
  ctx.fillStyle = colorAt(colors, 4, shadowColor(colors));
  roundedRect(ctx, cx - scale * .17, cy + scale * .39, scale * .34, scale * .38, scale * .12);
  ctx.fill();

  const face = ctx.createRadialGradient(
    cx + lightVector.x * scale * .26,
    cy + lightVector.y * scale * .26,
    scale * .03,
    cx, cy, scale * .58
  );
  face.addColorStop(0, highlightColor(colors));
  face.addColorStop(.2, lightColor(colors));
  face.addColorStop(.52, midColor(colors));
  face.addColorStop(.78, colorAt(colors, 3, shadowColor(colors)));
  face.addColorStop(1, shadowColor(colors));

  ctx.shadowColor = rgba(shadowColor(colors), .32);
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  headPath(ctx, cx, cy, scale);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = rgba(shadowColor(colors), .40);
  ctx.beginPath(); ctx.ellipse(cx - scale * .16, cy - scale * .05, scale * .10, scale * .045, -.10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + scale * .16, cy - scale * .05, scale * .10, scale * .045, .10, 0, Math.PI * 2); ctx.fill();

  const nose = ctx.createLinearGradient(cx - scale * .08, 0, cx + scale * .08, 0);
  nose.addColorStop(0, colorAt(colors, 3, shadowColor(colors)));
  nose.addColorStop(.55, lightColor(colors));
  nose.addColorStop(1, midColor(colors));
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(cx, cy - scale * .05);
  ctx.lineTo(cx - scale * .075, cy + scale * .18);
  ctx.lineTo(cx + scale * .06, cy + scale * .20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rgba(colorAt(colors, 3, shadowColor(colors)), .65);
  ctx.lineWidth = Math.max(2, scale * .012);
  ctx.beginPath();
  ctx.moveTo(cx - scale * .10, cy + scale * .31);
  ctx.quadraticCurveTo(cx, cy + scale * .35, cx + scale * .10, cy + scale * .31);
  ctx.stroke();

  ctx.fillStyle = rgba(rimColor(colors), .36);
  headPath(ctx, cx + (lightVector.x >= 0 ? scale * .018 : -scale * .018), cy, scale * .99);
  ctx.globalCompositeOperation = 'screen';
  ctx.fill();
  ctx.restore();
}

function renderFacetedHead(ctx, width, height, colors, lightVector, asaro = false) {
  const scale = Math.min(width, height) * .58;
  const cx = width * .5;
  const cy = height * .46;
  const sx = scale * .46;
  const sy = scale * .55;
  const px = (x) => cx + x * sx;
  const py = (y) => cy + y * sy;

  renderGroundShadow(ctx, cx, cy + sy * 1.25, sx * .70, sy * .14, shadowColor(colors));

  const points = {
    top: [0, -1], lt: [-.62, -.77], rt: [.62, -.77],
    ltemple: [-.82, -.32], rtemple: [.82, -.32],
    lcheek: [-.72, .22], rcheek: [.72, .22],
    ljaw: [-.48, .70], rjaw: [.48, .70], chin: [0, .98],
    brow: [0, -.33], nose: [0, .25], mouth: [0, .58]
  };
  const p = (name) => [px(points[name][0]), py(points[name][1])];

  const facets = [
    [['top','lt','brow'], 12], [['top','brow','rt'], 10],
    [['lt','ltemple','brow'], 6], [['rt','brow','rtemple'], 8],
    [['ltemple','lcheek','nose','brow'], 3], [['rtemple','brow','nose','rcheek'], 7],
    [['lcheek','ljaw','mouth','nose'], 4], [['rcheek','nose','mouth','rjaw'], 9],
    [['ljaw','chin','mouth'], 1], [['rjaw','mouth','chin'], 5],
    [['brow','nose','mouth'], 11]
  ];

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(colors), .32);
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 15;

  facets.forEach(([names, baseIndex], index) => {
    const sideBoost = lightVector.x > 0 ? index % 2 : (index + 1) % 2;
    const colorIndex = Math.min(colors.length - 1, Math.max(0, baseIndex + (sideBoost ? 1 : -1)));
    ctx.beginPath();
    names.forEach((name, pointIndex) => {
      const [x, y] = p(name);
      if (!pointIndex) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = colorAt(colors, colorIndex, midColor(colors));
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba(highlightColor(colors), asaro ? .22 : .12);
    ctx.lineWidth = asaro ? 1.5 : 1;
    ctx.stroke();
  });

  if (asaro) {
    ctx.fillStyle = rgba(shadowColor(colors), .48);
    ctx.beginPath(); ctx.ellipse(cx - sx * .32, cy - sy * .18, sx * .20, sy * .08, -.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + sx * .32, cy - sy * .18, sx * .20, sy * .08, .12, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = rgba(highlightColor(colors), .45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, py(-.96));
    ctx.lineTo(cx, py(.92));
    ctx.stroke();

    ctx.strokeStyle = rgba(rimColor(colors), .45);
    ctx.beginPath();
    ctx.moveTo(px(-.62), py(-.75));
    ctx.lineTo(px(-.80), py(-.30));
    ctx.lineTo(px(-.70), py(.22));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px(.62), py(-.75));
    ctx.lineTo(px(.80), py(-.30));
    ctx.lineTo(px(.70), py(.22));
    ctx.stroke();
  }
  ctx.restore();
}

function renderModeLabel(ctx, width, height, mode) {
  const labels = {
    sphere: 'ESFERA',
    cylinder: 'CILINDRO',
    plane: 'PLANO',
    skin: 'PIEL',
    metal: 'METAL',
    gold: 'ORO',
    silver: 'PLATA',
    steel: 'ACERO',
    head: 'CABEZA',
    planes: 'CABEZA POR PLANOS',
    asaro: 'ASARO 2D'
  };
  const text = labels[mode];
  if (!text) return;
  ctx.save();
  ctx.font = `600 ${Math.max(11, Math.round(width * .011))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = document.documentElement.dataset.theme === 'night' ? 'rgba(255,255,255,.62)' : 'rgba(40,31,45,.52)';
  ctx.fillText(text, width * .025, height * .055);
  ctx.restore();
}

export function renderBasicPreview(canvas, colors, mode = 'sphere', lighting = null) {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(360, Math.round(bounds.width * ratio));
  const height = Math.max(260, Math.round(bounds.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  renderBackdrop(ctx, width, height, lighting);

  const lightVector = dominantLightVector(lighting);
  const safeColors = Array.isArray(colors) && colors.length ? colors : ['#777777'];

  switch (mode) {
    case 'cylinder':
      renderCylinder(ctx, width, height, safeColors, lightVector);
      break;
    case 'plane':
      renderPlane(ctx, width, height, safeColors, lightVector);
      break;
    case 'skin':
      renderSkin(ctx, width, height, safeColors, lighting || lightVector);
      break;
    case 'metal':
    case 'band':
      renderMetal(ctx, width, height, safeColors, lightVector);
      break;
    case 'gold':
      renderMetal(ctx, width, height, safeColors, lightVector, MATERIAL_TINTS.gold);
      break;
    case 'silver':
      renderMetal(ctx, width, height, safeColors, lightVector, MATERIAL_TINTS.silver);
      break;
    case 'steel':
      renderMetal(ctx, width, height, safeColors, lightVector, MATERIAL_TINTS.steel);
      break;
    case 'head':
      renderHead(ctx, width, height, safeColors, lightVector);
      break;
    case 'planes':
      renderFacetedHead(ctx, width, height, safeColors, lightVector, false);
      break;
    case 'asaro':
      renderFacetedHead(ctx, width, height, safeColors, lightVector, true);
      break;
    default:
      renderSphere(ctx, width, height, safeColors, lighting || lightVector);
      break;
  }

  renderLightGuides(ctx, width, height, lighting);
  renderModeLabel(ctx, width, height, mode);
}
