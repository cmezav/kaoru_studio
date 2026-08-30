/* ============================================================
   RENDERER.JS — Dibuja un TextBlock (layout + transform + estilo)
   sobre un canvas.

   Fase 2: el relleno ya no es solo un color. Para que un degradado
   se vea CONTINUO a lo largo de todo el texto (y no repetido letra
   por letra) y para poder recortar imágenes con la silueta del
   texto, primero se construye un único Path2D con TODOS los glifos
   ya posicionados en espacio local del bloque (0,0 = esquina del
   bloque, antes de aplicar rotación/escala/inclinación). Luego se
   aplica la transformación del bloque una sola vez y se rellena
   ese path unificado.

   Esto también deja lista la base para contorno/sombra/glow
   (fases 3-4): todas se aplican sobre este mismo path.
   ============================================================ */

/**
 * Construye un Path2D único con todos los glifos de todas las líneas, en
 * espacio local del bloque (texto recto, sin curvar).
 *
 * @param {object} [deform] Configuración de deformación libre (Fase 7,
 *   ver deformSystem.js). Si `deform.enabled` es true, cada punto del
 *   contorno de cada glifo se desplaza según la malla de puntos de
 *   control en lugar de limitarse a colocar el glifo con una matriz.
 */
function buildBlockPath(layout, deform) {
  const combined = new Path2D();
  const useDeform = !!(deform && deform.enabled && deform.points && window.DeformSystem && window.PathUtils);

  for (const line of layout.lines) {
    const baseY = line.baselineY + layout.ascender;
    for (const g of line.glyphs) {
      const originX = g.x + (line.offsetX || 0);

      if (useDeform) {
        const mapped = g.path.commands.map((cmd) => PathUtils.mapCommand(cmd, (px, py) => {
          const x = originX + px;
          const y = baseY + py;
          const d = DeformSystem.sampleDisplacement(deform, layout, x, y);
          return { x: x + d.dx, y: y + d.dy };
        }));
        PathUtils.appendCommandsToPath2D(combined, mapped);
      } else {
        const glyphPath2D = new Path2D(g.path.toPathData(3));
        const matrix = new DOMMatrix().translate(originX, baseY);
        combined.addPath(glyphPath2D, matrix);
      }
    }
  }
  return combined;
}

function applyBlockTransform(ctx, layout, transform) {
  const cx = layout.totalWidth / 2;
  const cy = layout.totalHeight / 2;
  ctx.translate(transform.x, transform.y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.transform(1, Math.tan((transform.skewY * Math.PI) / 180), Math.tan((transform.skewX * Math.PI) / 180), 1, 0, 0);
  ctx.scale(transform.scaleX, transform.scaleY);
  ctx.translate(-cx, -cy);
}

/**
 * Misma transformación que applyBlockTransform pero como DOMMatrix
 * independiente del canvas. Se usa fuera del renderizado para convertir
 * coordenadas del lienzo (puntero del ratón) al espacio local del bloque
 * y viceversa — por ejemplo para arrastrar los puntos de la curva
 * personalizada (Fase 6) exactamente bajo el cursor, incluso con
 * rotación/escala/inclinación aplicadas al bloque.
 */
function blockMatrix(layout, transform) {
  const cx = layout.totalWidth / 2;
  const cy = layout.totalHeight / 2;
  let m = new DOMMatrix();
  m = m.translate(transform.x, transform.y);
  m = m.rotate(transform.rotation);
  m = m.multiply(new DOMMatrix([1, Math.tan((transform.skewY * Math.PI) / 180), Math.tan((transform.skewX * Math.PI) / 180), 1, 0, 0]));
  m = m.scale(transform.scaleX, transform.scaleY);
  m = m.translate(-cx, -cy);
  return m;
}

/** Dibuja las capas de imagen recortadas por blockPath, cada una con su propia transformación local. */
function drawImageFill(ctx, blockPath, layout, imageFill) {
  ctx.save();
  ctx.clip(blockPath);
  for (const imgLayer of imageFill.images) {
    if (!imgLayer.image) continue;
    ctx.save();
    ctx.globalAlpha *= imgLayer.opacity;
    // Posición/escala/rotación de la imagen dentro del espacio local del bloque de texto.
    ctx.translate(imgLayer.x, imgLayer.y);
    ctx.rotate((imgLayer.rotation * Math.PI) / 180);
    const iw = imgLayer.image.naturalWidth * imgLayer.scale;
    const ih = imgLayer.image.naturalHeight * imgLayer.scale;
    ctx.drawImage(imgLayer.image, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }
  // Si no hay ninguna imagen aún, mostramos un gris neutro para que no desaparezca el texto.
  if (!imageFill.images.length) {
    ctx.fillStyle = '#cfcfd6';
    ctx.fillRect(0, 0, layout.totalWidth, layout.totalHeight);
  }
  ctx.restore();
}

/** Dibuja los contornos (de mayor a menor grosor, para que se apilen como anillos) por debajo del relleno. */
function renderStrokes(ctx, blockPath, layout, strokes) {
  const enabled = strokes.filter((s) => s.enabled).sort((a, b) => b.width - a.width);
  for (const s of enabled) {
    ctx.save();
    ctx.globalAlpha *= s.opacity;
    ctx.lineWidth = s.width * 2; // *2 porque el trazo de canvas se centra en el path: así el ancho visible == s.width hacia fuera
    ctx.lineJoin = 'round';
    if (s.fillType === 'gradient') {
      ctx.strokeStyle = s.gradientType === 'radial'
        ? FillSystem.buildRadialGradient(ctx, s.gradient, layout.totalWidth, layout.totalHeight)
        : FillSystem.buildCanvasGradient(ctx, s.gradient, layout.totalWidth, layout.totalHeight);
    } else {
      ctx.strokeStyle = s.color;
    }
    ctx.stroke(blockPath);
    ctx.restore();
  }
}

function gradientLineFor(angleDeg, w, h) {
  const c = FillSystem.angleToLineCoords(angleDeg, w, h);
  return [c.x0, c.y0, c.x1, c.y1];
}

/** Glow exterior: varias pasadas de shadowBlur sin offset, apiladas para dar intensidad. */
function renderOuterGlow(ctx, blockPath, glow) {
  if (!glow.enabled) return;
  ctx.save();
  ctx.globalAlpha *= glow.opacity;
  ctx.shadowColor = glow.color;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = glow.blur;
  ctx.fillStyle = glow.color;
  const passes = Math.max(1, Math.round(glow.intensity));
  for (let i = 0; i < passes; i++) ctx.fill(blockPath);
  ctx.restore();
}

/** Sombra paralela (drop shadow), sólida o con degradado lineal/radial propio. */
function renderDropShadow(ctx, blockPath, layout, shadow) {
  if (!shadow.enabled) return;
  ctx.save();
  ctx.globalAlpha *= shadow.opacity;
  ctx.translate(shadow.offsetX, shadow.offsetY);
  ctx.filter = shadow.blur > 0 ? `blur(${shadow.blur}px)` : 'none';

  if (shadow.fillType === 'gradient') {
    ctx.fillStyle =
      shadow.gradientType === 'radial'
        ? FillSystem.buildRadialGradient(ctx, shadow.gradient, layout.totalWidth, layout.totalHeight)
        : FillSystem.buildCanvasGradient(ctx, shadow.gradient, layout.totalWidth, layout.totalHeight);
  } else {
    ctx.fillStyle = shadow.color;
  }

  if (shadow.spread > 0) {
    ctx.lineWidth = shadow.spread * 2;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke(blockPath);
  }
  ctx.fill(blockPath);
  ctx.restore();
}

/**
 * Sombra interna / glow interior: usan el mismo truco (objeto real dibujado
 * MUY lejos, fuera del clip; su sombra —offset por la misma distancia en
 * sentido contrario más el offset deseado— cae exactamente dentro del
 * clip, produciendo un sombreado que nace en el borde interior de la letra).
 */
function renderInsetEffect(ctx, blockPath, layout, { offsetX = 0, offsetY = 0, blur, color, opacity }) {
  const FAR = Math.max(layout.totalWidth, layout.totalHeight) * 4 + 4000;
  const matrix = ctx.getTransform();
  // shadowOffset y shadowBlur se expresan en píxeles del lienzo. Convertimos
  // el vector local para que el efecto siga alineado al rotar o exportar.
  const transformedOffsetX = offsetX * matrix.a + offsetY * matrix.c;
  const transformedOffsetY = offsetX * matrix.b + offsetY * matrix.d;
  const scaleX = Math.hypot(matrix.a, matrix.b);
  const scaleY = Math.hypot(matrix.c, matrix.d);
  const effectScale = Math.max(0.0001, (scaleX + scaleY) / 2);

  ctx.save();
  ctx.clip(blockPath);
  ctx.globalAlpha *= opacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(0, blur) * effectScale;
  ctx.shadowOffsetX = FAR * matrix.a + transformedOffsetX;
  ctx.shadowOffsetY = FAR * matrix.b + transformedOffsetY;
  ctx.fillStyle = 'black';
  ctx.save();
  ctx.translate(-FAR, 0);
  ctx.fill(blockPath);
  ctx.restore();
  ctx.restore();
}

function renderInnerShadow(ctx, blockPath, layout, s) {
  if (!s.enabled) return;
  renderInsetEffect(ctx, blockPath, layout, {
    offsetX: s.offsetX * s.depth,
    offsetY: s.offsetY * s.depth,
    blur: s.blur,
    color: s.color,
    opacity: s.opacity,
  });
}

function renderInnerGlow(ctx, blockPath, layout, g) {
  if (!g.enabled) return;
  renderInsetEffect(ctx, blockPath, layout, { offsetX: 0, offsetY: 0, blur: g.blur, color: g.color, opacity: g.opacity });
}

/**
 * Extrusión / efecto 3D (Fase 5): apila copias del path a lo largo de un
 * ángulo, de la más lejana a la más cercana, simulando el "canto" lateral
 * del texto. Se dibuja ANTES del relleno principal para que la cara
 * frontal (y los contornos) queden por encima, tapando la copia a
 * distancia 0 y dejando visible solo el lateral extruido.
 */
function renderExtrude(ctx, blockPath, layout, extrude) {
  if (!extrude.enabled || extrude.depth <= 0) return;
  const rad = (extrude.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const step = Math.max(1, extrude.step);
  const steps = Math.max(1, Math.round(extrude.depth / step));
  ctx.save();
  for (let i = steps; i >= 1; i--) {
    const dist = i * step;
    const t = i / steps; // 1 = capa más lejana, ~0 = capa más cercana a la cara frontal
    const color = extrude.colorMode === 'gradient' ? FillSystem.mixHex(extrude.colorNear, extrude.colorFar, t) : extrude.color;
    ctx.save();
    ctx.translate(dx * dist, dy * dist);
    ctx.fillStyle = color;
    ctx.fill(blockPath);
    ctx.restore();
  }
  if (extrude.edgeEnabled) {
    ctx.save();
    ctx.translate(dx * extrude.depth, dy * extrude.depth);
    ctx.globalAlpha *= extrude.edgeOpacity;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = extrude.edgeColor;
    ctx.stroke(blockPath);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Bisel (Fase 5): reutiliza el truco de renderInsetEffect para generar
 * una luz y una sombra direccionales confinadas al interior de las
 * letras, en direcciones opuestas — el mismo mecanismo que la sombra
 * interna, aplicado dos veces con colores y sentidos distintos.
 */
function renderBevel(ctx, blockPath, layout, bevel) {
  if (!bevel.enabled) return;
  const rad = (bevel.angle * Math.PI) / 180;
  const dx = Math.cos(rad) * bevel.size;
  const dy = Math.sin(rad) * bevel.size;
  renderInsetEffect(ctx, blockPath, layout, {
    offsetX: -dx,
    offsetY: -dy,
    blur: bevel.softness,
    color: bevel.highlightColor,
    opacity: bevel.strength,
  });
  renderInsetEffect(ctx, blockPath, layout, {
    offsetX: dx,
    offsetY: dy,
    blur: bevel.softness,
    color: bevel.shadowColor,
    opacity: bevel.strength,
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} block  TextBlock (ver main.js) ya con block.layout calculado
 */
function renderLayer(ctx, layer, style, blockPath, layout) {
  if (!layer.visible || layer.opacity <= 0) return;
  const data = layer.kind === 'fill' && layer.active
    ? style
    : (layer.data || style[layer.kind]);

  ctx.save();
  ctx.globalAlpha *= layer.opacity == null ? 1 : layer.opacity;

  switch (layer.kind) {
    case 'glow': renderOuterGlow(ctx, blockPath, data); break;
    case 'shadow': renderDropShadow(ctx, blockPath, layout, data); break;
    case 'extrude': renderExtrude(ctx, blockPath, layout, data); break;
    case 'stroke': {
      const stroke = style.strokes.find((s) => s.id === layer.sourceId) || data;
      if (stroke) renderStrokes(ctx, blockPath, layout, [stroke]);
      break;
    }
    case 'fill': {
      const fill = data;
      ctx.globalAlpha *= fill.opacity == null ? 1 : fill.opacity;
      ctx.filter = 'none';
      if (fill.fillType === 'gradient') {
        ctx.fillStyle = FillSystem.buildCanvasGradient(ctx, fill.gradient, layout.totalWidth, layout.totalHeight);
        ctx.fill(blockPath);
      } else if (fill.fillType === 'image') {
        drawImageFill(ctx, blockPath, layout, fill.imageFill);
      } else {
        ctx.fillStyle = fill.fillColor;
        ctx.fill(blockPath);
      }
      break;
    }
    case 'innerShadow': renderInnerShadow(ctx, blockPath, layout, data); break;
    case 'innerGlow': renderInnerGlow(ctx, blockPath, layout, data); break;
    case 'bevel': renderBevel(ctx, blockPath, layout, data); break;
  }
  ctx.restore();
}

function renderTextBlock(ctx, block) {
  const { layout, transform, style } = block;
  if (!layout || !layout.lines.length) return;

  const curve = style.curve;
  const deform = style.deform;
  const blockPath =
    curve && curve.mode !== 'none' && window.CurveSystem
      ? CurveSystem.buildCurvedBlockPath(layout, curve, deform)
      : buildBlockPath(layout, deform);

  ctx.save();
  applyBlockTransform(ctx, layout, transform);

  if (Array.isArray(block.layers) && block.layers.length) {
    block.layers.forEach((layer) => renderLayer(ctx, layer, style, blockPath, layout));
  } else {
    if (style.glow) renderOuterGlow(ctx, blockPath, style.glow);
    if (style.shadow) renderDropShadow(ctx, blockPath, layout, style.shadow);
    if (style.extrude) renderExtrude(ctx, blockPath, layout, style.extrude);
    if (style.strokes && style.strokes.length) renderStrokes(ctx, blockPath, layout, style.strokes);
    ctx.globalAlpha *= style.opacity;
    ctx.filter = 'none';
    if (style.fillType === 'gradient') {
      ctx.fillStyle = FillSystem.buildCanvasGradient(ctx, style.gradient, layout.totalWidth, layout.totalHeight);
      ctx.fill(blockPath);
    } else if (style.fillType === 'image') drawImageFill(ctx, blockPath, layout, style.imageFill);
    else { ctx.fillStyle = style.fillColor; ctx.fill(blockPath); }
    if (style.innerShadow) renderInnerShadow(ctx, blockPath, layout, style.innerShadow);
    if (style.innerGlow) renderInnerGlow(ctx, blockPath, layout, style.innerGlow);
    if (style.bevel) renderBevel(ctx, blockPath, layout, style.bevel);
  }

  ctx.restore();
  return blockPath; // se reutiliza para hit-testing de imágenes, etc.
}

/** Limpia el canvas y dibuja un fondo tipo tablero de ajedrez (transparencia visible). */
function clearWithCheckerboard(ctx, w, h, cell = 12) {
  ctx.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const even = ((x / cell) + (y / cell)) % 2 === 0;
      ctx.fillStyle = even ? '#f0f0f3' : '#e2e2e8';
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

window.Renderer = { renderTextBlock, clearWithCheckerboard, buildBlockPath, applyBlockTransform, blockMatrix };

