/* ============================================================
   EXPORTSYSTEM.JS — Fase 9
   Render final independiente de la previsualización, PNG con
   transparencia/recorte, SVG vectorial híbrido y PDF según DPI.
   ============================================================ */

(function () {
  const MAX_PIXELS = 80000000;

  function assertSize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('La resolución de exportación no es válida.');
    if (width * height > MAX_PIXELS) throw new Error('La exportación supera 80 megapíxeles. Reduce el ancho, el alto o la escala.');
  }

  function renderDesignCanvas(design, baseWidth, baseHeight, width, height) {
    width = Math.round(width); height = Math.round(height);
    assertSize(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(width / baseWidth, height / baseHeight);
    design.blocks.filter((block) => block.visible && block.layout).forEach((block) => {
      ctx.save();
      ctx.globalAlpha *= block.opacity == null ? 1 : block.opacity;
      Renderer.renderTextBlock(ctx, block);
      ctx.restore();
    });
    return canvas;
  }

  function alphaBounds(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      const row = y * width * 4;
      for (let x = 0; x < width; x++) {
        if (pixels[row + x * 4 + 3] === 0) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return { x: 0, y: 0, width, height, empty: true };
    const pad = Math.max(1, Math.round(Math.max(width, height) * 0.003));
    const x = Math.max(0, minX - pad), y = Math.max(0, minY - pad);
    return { x, y, width: Math.min(width, maxX + pad + 1) - x, height: Math.min(height, maxY + pad + 1) - y, empty: false };
  }

  function cropCanvas(source, bounds) {
    if (!bounds || (bounds.x === 0 && bounds.y === 0 && bounds.width === source.width && bounds.height === source.height)) return source;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, bounds.width); canvas.height = Math.max(1, bounds.height);
    canvas.getContext('2d').drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    return canvas;
  }

  function addBackground(source, color) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  function renderFinalCanvas(design, options) {
    let canvas = renderDesignCanvas(design, options.baseWidth, options.baseHeight, options.width, options.height);
    if (options.crop) {
      let bounds;
      if (canvas.width * canvas.height > 20000000) {
        const probe = renderDesignCanvas(design, options.baseWidth, options.baseHeight, options.baseWidth, options.baseHeight);
        const small = alphaBounds(probe);
        const sx = canvas.width / probe.width, sy = canvas.height / probe.height;
        const x = Math.max(0, Math.floor(small.x * sx)), y = Math.max(0, Math.floor(small.y * sy));
        bounds = { x, y, width: Math.min(canvas.width - x, Math.ceil(small.width * sx)), height: Math.min(canvas.height - y, Math.ceil(small.height * sy)) };
      } else bounds = alphaBounds(canvas);
      canvas = cropCanvas(canvas, bounds);
    }
    if (!options.transparent) canvas = addBackground(canvas, options.backgroundColor);
    return canvas;
  }

  function canvasBlob(canvas, type = 'image/png', quality) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('El navegador no pudo codificar la imagen.')), type, quality));
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function safeName(name, fallback) {
    return (name || fallback).trim().replace(/[^\p{L}\p{N}_-]+/gu, '-') || fallback;
  }

  function activeLayerData(block, layer) {
    if (layer.kind === 'fill') return layer.active ? block.style : layer.data;
    if (layer.kind === 'stroke') return block.style.strokes.find((stroke) => stroke.id === layer.sourceId) || layer.data;
    return layer.data || block.style[layer.kind];
  }

  function isVectorSafe(block) {
    if (!block.layout || block.style.curve?.mode !== 'none' || block.style.deform?.enabled) return false;
    const layers = block.layers || [];
    for (const layer of layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      const data = activeLayerData(block, layer);
      if (layer.kind === 'fill' && data.fillType === 'image') return false;
      if (!['fill', 'stroke'].includes(layer.kind) && data?.enabled) return false;
    }
    return true;
  }

  function n(value) { return Number(value || 0).toFixed(4).replace(/\.?0+$/, ''); }
  function xml(value) { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function gradientDef(model, id, width, height, radial) {
    const stops = [...model.stops].sort((a, b) => a.pos - b.pos).map((stop) =>
      `<stop offset="${n(stop.pos)}%" stop-color="${xml(stop.color)}" stop-opacity="${n(stop.alpha)}"/>`
    ).join('');
    if (radial) return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(width / 2)}" cy="${n(height / 2)}" r="${n(Math.max(width, height) / 2)}">${stops}</radialGradient>`;
    const line = FillSystem.angleToLineCoords(model.angle || 0, width, height);
    return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(line.x0)}" y1="${n(line.y0)}" x2="${n(line.x1)}" y2="${n(line.y1)}">${stops}</linearGradient>`;
  }

  function glyphMarkup(block, attributes) {
    const paths = [];
    for (const line of block.layout.lines) {
      const baseY = line.baselineY + block.layout.ascender;
      for (const glyph of line.glyphs) {
        const x = glyph.x + (line.offsetX || 0);
        paths.push(`<path d="${glyph.path.toPathData(3)}" transform="translate(${n(x)} ${n(baseY)})" ${attributes}/>`);
      }
    }
    return paths.join('');
  }

  function vectorBlockMarkup(block, uid, defs) {
    const matrix = Renderer.blockMatrix(block.layout, block.transform);
    const transform = `matrix(${n(matrix.a)} ${n(matrix.b)} ${n(matrix.c)} ${n(matrix.d)} ${n(matrix.e)} ${n(matrix.f)})`;
    const parts = [];
    const layers = block.layers?.length ? block.layers : [{ kind: 'fill', visible: true, opacity: 1, active: true, data: block.style }];
    layers.forEach((layer, index) => {
      if (!layer.visible || layer.opacity <= 0 || !['fill', 'stroke'].includes(layer.kind)) return;
      const data = activeLayerData(block, layer);
      if (layer.kind === 'fill') {
        let fill = xml(data.fillColor || '#000000');
        if (data.fillType === 'gradient') {
          const id = `${uid}_fill_${index}`;
          defs.push(gradientDef(data.gradient, id, block.layout.totalWidth, block.layout.totalHeight, false));
          fill = `url(#${id})`;
        }
        const opacity = (block.opacity ?? 1) * (layer.opacity ?? 1) * (data.opacity ?? 1);
        parts.push(`<g opacity="${n(opacity)}">${glyphMarkup(block, `fill="${fill}"`)}</g>`);
      } else {
        if (!data?.enabled) return;
        let stroke = xml(data.color || '#000000');
        if (data.fillType === 'gradient') {
          const id = `${uid}_stroke_${index}`;
          defs.push(gradientDef(data.gradient, id, block.layout.totalWidth, block.layout.totalHeight, data.gradientType === 'radial'));
          stroke = `url(#${id})`;
        }
        const opacity = (block.opacity ?? 1) * (layer.opacity ?? 1) * (data.opacity ?? 1);
        parts.push(`<g opacity="${n(opacity)}">${glyphMarkup(block, `fill="none" stroke="${stroke}" stroke-width="${n(data.width * 2)}" stroke-linejoin="round"`)}</g>`);
      }
    });
    return `<g transform="${transform}">${parts.join('')}</g>`;
  }

  function rasterBlockData(block, baseWidth, baseHeight, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(baseWidth * scale); canvas.height = Math.round(baseHeight * scale);
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);
    ctx.globalAlpha *= block.opacity == null ? 1 : block.opacity;
    Renderer.renderTextBlock(ctx, block);
    return canvas.toDataURL('image/png');
  }

  function previewBoundsInBaseUnits(design, baseWidth, baseHeight) {
    const canvas = renderDesignCanvas(design, baseWidth, baseHeight, baseWidth, baseHeight);
    const b = alphaBounds(canvas);
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }

  function buildSvg(design, options) {
    const bounds = options.crop ? previewBoundsInBaseUnits(design, options.baseWidth, options.baseHeight) : { x: 0, y: 0, width: options.baseWidth, height: options.baseHeight };
    const outWidth = Math.max(1, Math.round(options.width * bounds.width / options.baseWidth));
    const outHeight = Math.max(1, Math.round(options.height * bounds.height / options.baseHeight));
    const defs = [], content = [];
    let vectorBlocks = 0, rasterBlocks = 0;
    if (!options.transparent) content.push(`<rect x="${n(bounds.x)}" y="${n(bounds.y)}" width="${n(bounds.width)}" height="${n(bounds.height)}" fill="${xml(options.backgroundColor || '#ffffff')}"/>`);
    const rasterScale = Math.min(4, Math.max(2, options.width / options.baseWidth, options.height / options.baseHeight));
    design.blocks.filter((block) => block.visible && block.layout).forEach((block, index) => {
      if (isVectorSafe(block)) {
        content.push(vectorBlockMarkup(block, `b${index}`, defs)); vectorBlocks++;
      } else {
        const href = rasterBlockData(block, options.baseWidth, options.baseHeight, rasterScale);
        content.push(`<image x="0" y="0" width="${options.baseWidth}" height="${options.baseHeight}" href="${href}"/>`); rasterBlocks++;
      }
    });
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${outWidth}" height="${outHeight}" viewBox="${n(bounds.x)} ${n(bounds.y)} ${n(bounds.width)} ${n(bounds.height)}" preserveAspectRatio="${options.lockRatio === false ? 'none' : 'xMidYMid meet'}"><defs>${defs.join('')}</defs>${content.join('')}</svg>`;
    return { svg, width: outWidth, height: outHeight, vectorBlocks, rasterBlocks };
  }

  async function exportPng(design, options) {
    const canvas = renderFinalCanvas(design, options);
    const blob = await canvasBlob(canvas, 'image/png');
    downloadBlob(blob, `${safeName(options.name, 'text-effects-studio')}.png`);
    return { width: canvas.width, height: canvas.height };
  }

  async function exportSvg(design, options) {
    const result = buildSvg(design, options);
    downloadBlob(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeName(options.name, 'text-effects-studio')}.svg`);
    return result;
  }

  function bytesFromBase64(base64) {
    const binary = atob(base64), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function simplePdfBlob(canvas, widthPt, heightPt) {
    const opaque = addBackground(canvas, '#ffffff');
    const jpeg = bytesFromBase64(opaque.toDataURL('image/jpeg', 0.98).split(',')[1]);
    const encoder = new TextEncoder();
    const chunks = [], offsets = [0];
    let length = 0;
    const push = (value) => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length; };
    push('%PDF-1.4\n%TES9\n');
    const object = (id, bodyParts) => {
      offsets[id] = length; push(`${id} 0 obj\n`);
      bodyParts.forEach(push); push('\nendobj\n');
    };
    object(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    object(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
    object(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(widthPt)} ${n(heightPt)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
    object(4, [`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream']);
    const content = `q ${n(widthPt)} 0 0 ${n(heightPt)} 0 0 cm /Im0 Do Q`;
    object(5, [`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`]);
    const xref = length;
    push('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  async function exportPdf(design, options) {
    const canvas = renderFinalCanvas(design, options);
    const dpi = Math.max(36, Number(options.dpi) || 300);
    const widthPt = canvas.width / dpi * 72;
    const heightPt = canvas.height / dpi * 72;
    const fileName = `${safeName(options.name, 'text-effects-studio')}.pdf`;
    if (window.jspdf?.jsPDF) {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: widthPt >= heightPt ? 'landscape' : 'portrait', unit: 'pt', format: [widthPt, heightPt], compress: true });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthPt, heightPt, undefined, 'FAST');
      pdf.save(fileName);
    } else {
      downloadBlob(simplePdfBlob(canvas, widthPt, heightPt), fileName);
    }
    return { width: canvas.width, height: canvas.height, widthPt, heightPt, dpi };
  }

  window.ExportSystem = { renderDesignCanvas, renderFinalCanvas, alphaBounds, buildSvg, exportPng, exportSvg, exportPdf, isVectorSafe };
})();
