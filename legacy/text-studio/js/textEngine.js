/* ============================================================
   TEXTENGINE.JS — Motor de texto puro (sin canvas, sin DOM de UI)
   Convierte (contenido + fuente + tamaño + tracking + leading)
   en geometría: una lista de líneas, y por línea una lista de
   glifos con su posición X/Y y su Path2D ya escalado.
   Este módulo es la base que luego usan renderer.js (para dibujar)
   y, en fases futuras, el sistema de efectos (relleno/contorno/sombra
   se aplican sobre estos mismos paths).
   ============================================================ */

/**
 * @param {opentype.Font} otFont
 * @param {string} content         texto con saltos de línea \n
 * @param {object} opts
 *   fontSize: number (px)
 *   tracking: number (px extra entre letras, puede ser negativo)
 *   leading: number (multiplicador de interlineado, 1 = normal)
 *   wordSpacing: number (px extra en espacios, además del tracking)
 * @returns {{ lines: Array, totalWidth:number, totalHeight:number, baselineOffsets:number[] }}
 */
function layoutText(otFont, content, opts) {
  const fontSize = opts.fontSize ?? 72;
  const tracking = opts.tracking ?? 0;
  const leadingMult = opts.leading ?? 1;
  const wordSpacing = opts.wordSpacing ?? 0;

  const unitsPerEm = otFont.unitsPerEm || 1000;
  const scale = fontSize / unitsPerEm;
  const ascender = otFont.ascender * scale;
  const descender = otFont.descender * scale; // negativo
  const lineHeight = (ascender - descender) * leadingMult;

  const rawLines = (content ?? '').split('\n');
  const lines = [];
  let maxWidth = 0;

  rawLines.forEach((lineStr, lineIndex) => {
    const glyphs = [];
    let x = 0;
    for (const ch of lineStr) {
      const glyph = otFont.charToGlyph(ch);
      const advance = glyph.advanceWidth * scale;
      // Path del glifo en el origen (0,0), ya escalado a fontSize.
      const path = glyph.getPath(0, 0, fontSize);
      glyphs.push({ char: ch, x, path, advance });
      x += advance + tracking + (ch === ' ' ? wordSpacing : 0);
    }
    // el último glifo no debería sumar tracking sobrante al ancho total de línea
    const lineWidth = glyphs.length
      ? glyphs[glyphs.length - 1].x + glyphs[glyphs.length - 1].advance
      : 0;
    maxWidth = Math.max(maxWidth, lineWidth);
    lines.push({ glyphs, width: lineWidth, baselineY: lineIndex * lineHeight });
  });

  const totalHeight = rawLines.length ? (rawLines.length - 1) * lineHeight + (ascender - descender) : 0;

  return { lines, totalWidth: maxWidth, totalHeight, ascender, descender, lineHeight };
}

/**
 * Alinea horizontalmente cada línea dentro del ancho total del bloque.
 * align: 'left' | 'center' | 'right'
 */
function applyHorizontalAlign(layout, align) {
  for (const line of layout.lines) {
    let dx = 0;
    if (align === 'center') dx = (layout.totalWidth - line.width) / 2;
    else if (align === 'right') dx = layout.totalWidth - line.width;
    line.offsetX = dx;
  }
  return layout;
}

window.TextEngine = { layoutText, applyHorizontalAlign };
